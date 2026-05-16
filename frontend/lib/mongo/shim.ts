/**
 * Supabase-compatible fluent query shim backed by MongoDB.
 *
 * Exposes the chainable `.from(table).select(...).eq(...).single()` API
 * Supabase developers know, but executes everything against MongoDB.
 *
 * This lets the existing 28 Next.js API routes keep working without
 * a single line of business logic changing.
 *
 * Supported chain methods:
 *   select, insert, update, upsert, delete
 *   eq, neq, in, ilike, like, gt, gte, lt, lte, contains
 *   order, limit, range, single, maybeSingle
 *   then  (so it's awaitable like the real thing)
 *
 * Returns: { data, error } shape compatible with @supabase/supabase-js.
 */
import { Filter, ObjectId } from "mongodb"
import { getDb } from "./db"

type SupaResponse<T> = { data: T | null; error: { message: string; code?: string } | null; count?: number }

type Mode = "select" | "insert" | "update" | "upsert" | "delete"

type Op = "set" | "filter" | "select" | "order" | "limit" | "range" | "single" | "maybeSingle"

interface Order {
  column: string
  ascending: boolean
}

const COLL_USES_OBJECT_ID: Record<string, boolean> = {}

function maybeOid(value: unknown): unknown {
  if (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) {
    try {
      return new ObjectId(value)
    } catch {
      return value
    }
  }
  return value
}

/**
 * Build a Mongo filter for `eq("id", value)` style queries.
 * After Supabase migration:
 *   - rows have _id = ObjectId(uuidHex.slice(0,24))  AND  legacy_uuid = original UUID string
 *   - new rows (post-migration) have _id = fresh ObjectId, no legacy_uuid
 * So when value is a UUID we have to match either (_id derived from UUID) or legacy_uuid.
 */
function idFilter(value: unknown): any {
  if (typeof value !== "string") return { _id: value }
  // 24-char hex → straight ObjectId
  if (/^[a-f0-9]{24}$/i.test(value)) {
    try {
      return { _id: new ObjectId(value) }
    } catch {
      return { _id: value }
    }
  }
  // 36-char UUID → match by legacy_uuid OR by computed ObjectId
  if (/^[0-9a-f-]{36}$/i.test(value)) {
    const hex = value.replace(/-/g, "").slice(0, 24).padEnd(24, "0")
    const ors: any[] = [{ legacy_uuid: value }]
    try {
      ors.push({ _id: new ObjectId(hex) })
    } catch {}
    return { $or: ors }
  }
  return { _id: value }
}

function idArrayFilter(values: any[]): any {
  // Build a $or with one branch per id
  const ors: any[] = []
  const oidIds: any[] = []
  const stringIds: string[] = []
  const legacyUuids: string[] = []
  for (const v of values) {
    if (typeof v !== "string") {
      stringIds.push(v as any)
      continue
    }
    if (/^[a-f0-9]{24}$/i.test(v)) {
      try {
        oidIds.push(new ObjectId(v))
      } catch {
        stringIds.push(v)
      }
    } else if (/^[0-9a-f-]{36}$/i.test(v)) {
      legacyUuids.push(v)
      try {
        oidIds.push(new ObjectId(v.replace(/-/g, "").slice(0, 24).padEnd(24, "0")))
      } catch {}
    } else {
      stringIds.push(v)
    }
  }
  const idIns: any[] = [...oidIds, ...stringIds]
  if (idIns.length) ors.push({ _id: { $in: idIns } })
  if (legacyUuids.length) ors.push({ legacy_uuid: { $in: legacyUuids } })
  return ors.length === 1 ? ors[0] : { $or: ors }
}

function normalizeDoc<T extends Record<string, any>>(doc: T | null): any {
  if (!doc) return doc
  const out: any = { ...doc }
  // Map _id → id, preferring legacy_uuid if present so foreign key joins with
  // post-migration data continue to work (FKs in migrated rows still reference
  // the original Supabase UUIDs, not the new ObjectIds).
  if (!out.id) {
    if (out.legacy_uuid) {
      out.id = out.legacy_uuid
    } else if (out._id) {
      out.id = typeof out._id === "object" && out._id?.toString ? out._id.toString() : out._id
    }
  }
  delete out._id
  return out
}

function projectionFromSelect(sel: string | undefined) {
  if (!sel || sel === "*" || sel.trim() === "") return undefined
  // We don't bother applying projection in Mongo — we just keep all fields and
  // strip _id during normalization. Supabase's "select(...)" string is sometimes
  // complex (joins like "*, profiles:submitted_by(username)") that we can't fully
  // replicate. Returning all columns keeps callers happy.
  return undefined
}

class SupabaseShimQuery<T = any> implements PromiseLike<SupaResponse<T>> {
  private mode: Mode = "select"
  private filters: Filter<any> = {}
  private orQueries: any[] = []
  private payload: any = null
  private selectStr?: string
  private orders: Order[] = []
  private limitN?: number
  private skipN?: number
  private isSingle = false
  private isMaybeSingle = false
  private upsertOnConflict?: string
  private headOnly = false
  private countMode?: "exact" | "planned" | "estimated"

  constructor(private collectionName: string) {}

  // ---- terminal-ish setters ----
  select(cols?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    // .select() after insert/update/upsert/delete is a RETURNING hint — keep
    // the original write mode, just remember the projection.
    if (this.mode === "select" || (!this.payload && this.mode !== "delete")) {
      this.mode = "select"
    }
    this.selectStr = cols
    if (opts?.count) this.countMode = opts.count
    if (opts?.head) this.headOnly = true
    return this
  }

  insert(values: any | any[], opts?: { returning?: string }) {
    this.mode = "insert"
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: any) {
    this.mode = "update"
    this.payload = values
    return this
  }

  upsert(values: any | any[], opts?: { onConflict?: string }) {
    this.mode = "upsert"
    this.payload = Array.isArray(values) ? values : [values]
    this.upsertOnConflict = opts?.onConflict
    return this
  }

  delete() {
    this.mode = "delete"
    return this
  }

  // ---- filters ----
  eq(col: string, val: any) {
    if (col === "id") {
      Object.assign(this.filters, idFilter(val))
    } else {
      this.filters[col] = val
    }
    return this
  }
  neq(col: string, val: any) {
    if (col === "id") {
      // negate id filter — rare. Best effort: $nor on the same filter.
      this.filters.$nor = [...((this.filters as any).$nor || []), idFilter(val)]
    } else {
      this.filters[col] = { $ne: val }
    }
    return this
  }
  gt(col: string, val: any) {
    this.filters[col] = { ...(this.filters[col] || {}), $gt: val }
    return this
  }
  gte(col: string, val: any) {
    this.filters[col] = { ...(this.filters[col] || {}), $gte: val }
    return this
  }
  lt(col: string, val: any) {
    this.filters[col] = { ...(this.filters[col] || {}), $lt: val }
    return this
  }
  lte(col: string, val: any) {
    this.filters[col] = { ...(this.filters[col] || {}), $lte: val }
    return this
  }
  in(col: string, arr: any[]) {
    if (col === "id") {
      Object.assign(this.filters, idArrayFilter(arr))
    } else {
      this.filters[col] = { $in: arr }
    }
    return this
  }
  is(col: string, val: any) {
    this.filters[col] = val
    return this
  }
  ilike(col: string, pattern: string) {
    const re = new RegExp(pattern.replace(/%/g, ".*"), "i")
    this.filters[col] = re
    return this
  }
  like(col: string, pattern: string) {
    const re = new RegExp(pattern.replace(/%/g, ".*"))
    this.filters[col] = re
    return this
  }
  contains(col: string, val: any) {
    this.filters[col] = { $all: Array.isArray(val) ? val : [val] }
    return this
  }
  not(col: string, op: string, val: any) {
    if (op === "is" && val === null) this.filters[col] = { $ne: null }
    else if (op === "eq") this.filters[col] = { $ne: val }
    else this.filters[col] = { $not: { [`$${op}`]: val } }
    return this
  }
  or(filterStr: string) {
    // very minimal OR support: "field.op.value,field.op.value"
    const parts = filterStr.split(",")
    const ors: any[] = []
    for (const p of parts) {
      const [field, op, ...rest] = p.split(".")
      const value = rest.join(".")
      const f: any = {}
      if (op === "eq") f[field] = value
      else if (op === "ilike") f[field] = new RegExp(value.replace(/%/g, ".*"), "i")
      else f[field] = value
      ors.push(f)
    }
    this.orQueries.push({ $or: ors })
    return this
  }
  match(obj: Record<string, any>) {
    Object.assign(this.filters, obj)
    return this
  }

  // ---- modifiers ----
  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false })
    return this
  }
  limit(n: number) {
    this.limitN = n
    return this
  }
  range(from: number, to: number) {
    this.skipN = from
    this.limitN = to - from + 1
    return this
  }
  single() {
    this.isSingle = true
    return this
  }
  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  // ---- execution ----
  private buildFilter(): any {
    if (this.orQueries.length === 0) return this.filters
    return { ...this.filters, $and: this.orQueries }
  }

  async _exec(): Promise<SupaResponse<any>> {
    const db = await getDb()
    const coll = db.collection(this.collectionName)

    try {
      if (this.mode === "select") {
        if (this.countMode || this.headOnly) {
          const count = await coll.countDocuments(this.buildFilter())
          return { data: this.headOnly ? null : ([] as any), error: null, count } as any
        }

        // When sorting is requested we route through aggregate({ allowDiskUse: true })
        // because find().sort() has a hard 32 MB in-memory limit and crashes on
        // large collections without a covering index. allowDiskUse lets MongoDB
        // spill the sort to disk if needed — slower but never fails.
        // maxTimeMS caps the query so it fails fast (clean 500 with a clear
        // error) instead of hanging until the upstream reverse-proxy returns 502.
        let docs: any[]
        if (this.orders.length) {
          const sort: any = {}
          for (const o of this.orders) sort[o.column] = o.ascending ? 1 : -1
          const pipeline: any[] = [{ $match: this.buildFilter() }, { $sort: sort }]
          if (this.skipN) pipeline.push({ $skip: this.skipN })
          if (this.limitN) pipeline.push({ $limit: this.limitN })
          docs = await coll
            .aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 25000 })
            .toArray()
        } else {
          let cursor = coll.find(this.buildFilter()).maxTimeMS(25000)
          if (this.skipN) cursor = cursor.skip(this.skipN)
          if (this.limitN) cursor = cursor.limit(this.limitN)
          docs = await cursor.toArray()
        }
        const normalized = docs.map((d) => normalizeDoc(d))

        if (this.isSingle) {
          if (normalized.length === 0)
            return { data: null, error: { message: "No rows", code: "PGRST116" } }
          if (normalized.length > 1)
            return { data: null, error: { message: "Multiple rows" } }
          return { data: normalized[0], error: null }
        }
        if (this.isMaybeSingle) {
          return { data: normalized[0] || null, error: null }
        }
        return { data: normalized, error: null }
      }

      if (this.mode === "insert") {
        const tableTimeField: Record<string, string> = {
          embed_views: "viewed_at",
          link_clicks: "clicked_at",
          ad_clicks: "clicked_at",
        }
        const timeField = tableTimeField[this.collectionName]
        const needsTtl = !!timeField // every stats collection gets a Date _ttl for purging
        const nowIso = new Date().toISOString()
        const nowDate = new Date()
        const docs: any[] = (this.payload as any[]).map((d) => {
          const out: any = {
            ...d,
            created_at: d.created_at || nowIso,
          }
          if (timeField && !out[timeField]) out[timeField] = out.created_at
          // _ttl is a real Date BSON value so a Mongo TTL index can purge it.
          // We can't TTL on the ISO string `viewed_at` directly.
          if (needsTtl && !out._ttl) out._ttl = nowDate
          return out
        })
        const res = await coll.insertMany(docs)
        const inserted = docs.map((d, i) => normalizeDoc({ ...d, _id: res.insertedIds[i] }))

        // Side-effect: bump parent counters. These are NOT awaited — they happen
        // in the background so the user-facing insert returns immediately.
        // This used to add 50-150 ms to every embed_views insert on the hot path.
        if (this.collectionName === "embed_views" || this.collectionName === "link_clicks") {
          const tableName = this.collectionName
          // Fire-and-forget. We still log failures so they're visible.
          ;(async () => {
            try {
              if (tableName === "embed_views") {
                for (const doc of docs) {
                  if (!doc.ww_id) continue
                  await Promise.all([
                    db.collection("streaming_links").updateMany({ ww_id: doc.ww_id }, { $inc: { view_count: 1 } }),
                    db.collection("digital_content").updateMany({ ww_id: doc.ww_id }, { $inc: { view_count: 1 } }),
                  ])
                  if (typeof doc.ww_id === "string" && doc.ww_id.startsWith("ww-live-")) {
                    const cid = doc.ww_id.slice("ww-live-".length)
                    await db
                      .collection("live_tv_channels")
                      .updateMany(idFilter(cid), { $inc: { view_count: 1 } })
                  }
                }
              } else {
                for (const doc of docs) {
                  if (!doc.ww_id) continue
                  await Promise.all([
                    db.collection("download_links").updateMany({ ww_id: doc.ww_id }, { $inc: { click_count: 1 } }),
                    db.collection("digital_download_links").updateMany({ ww_id: doc.ww_id }, { $inc: { click_count: 1 } }),
                  ])
                }
              }
            } catch (err) {
              console.error(`[mongo-shim] async counter bump failed for ${tableName}:`, err)
            }
          })()
        }

        return { data: this.isSingle ? inserted[0] : inserted, error: null }
      }

      if (this.mode === "update") {
        const upd = { ...this.payload, updated_at: new Date().toISOString() }
        const res = await coll.findOneAndUpdate(
          this.buildFilter(),
          { $set: upd },
          { returnDocument: "after" }
        )
        if (this.isSingle) {
          return { data: res ? normalizeDoc(res) : null, error: null }
        }
        const updated = await coll.find(this.buildFilter()).toArray()
        return { data: updated.map((d) => normalizeDoc(d)), error: null }
      }

      if (this.mode === "upsert") {
        const conflict = this.upsertOnConflict || "id"
        const conflictField = conflict === "id" ? "_id" : conflict
        const results: any[] = []
        for (const doc of this.payload as any[]) {
          let filter: any = {}
          if (conflictField === "_id") {
            const idVal = doc.id || doc._id
            filter = idVal ? idFilter(idVal) : {}
          } else {
            filter[conflictField] = doc[conflictField]
          }
          const res = await coll.findOneAndUpdate(
            filter,
            { $set: { ...doc, updated_at: new Date().toISOString() } },
            { upsert: true, returnDocument: "after" }
          )
          results.push(res ? normalizeDoc(res) : null)
        }
        return { data: this.isSingle ? results[0] : results, error: null }
      }

      if (this.mode === "delete") {
        const res = await coll.deleteMany(this.buildFilter())
        return { data: { count: res.deletedCount } as any, error: null }
      }

      return { data: null, error: { message: "Unknown mode" } }
    } catch (e: any) {
      console.error("[mongo-shim] error", this.collectionName, e?.message)
      return { data: null, error: { message: e?.message || "MongoDB error" } }
    }
  }

  // Awaitable
  then<TResult1 = SupaResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupaResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._exec().then(onfulfilled as any, onrejected)
  }
}

export class MongoSupabaseClient {
  from(table: string) {
    return new SupabaseShimQuery(table)
  }

  async rpc(fnName: string, args: any = {}) {
    // Minimal RPC support — implement the known stored procs.
    const db = await getDb()
    if (fnName === "increment_ad_clicks") {
      // Use aggregation pipeline so $inc works even when click_count is null/missing (legacy migrated rows).
      await db
        .collection("ads")
        .updateOne(idFilter(args.ad_id), [
          { $set: { click_count: { $add: [{ $ifNull: ["$click_count", 0] }, 1] } } },
        ])
      return { data: null, error: null }
    }
    if (fnName === "increment_live_tv_views") {
      await db
        .collection("live_tv_channels")
        .updateOne(idFilter(args.channel_id), [
          { $set: { view_count: { $add: [{ $ifNull: ["$view_count", 0] }, 1] } } },
        ])
      return { data: null, error: null }
    }
    return { data: null, error: { message: `Unknown RPC: ${fnName}` } }
  }

  // Auth namespace — implemented in lib/mongo/auth-shim.ts to keep this file lean
  auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { message: "Use /api/auth/login" },
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: { message: "Use /api/auth/register" },
    }),
    admin: {
      listUsers: async () => ({ data: { users: [] }, error: null }),
      deleteUser: async (id: string) => {
        const db = await getDb()
        await db.collection("users").deleteOne(idFilter(id) as any)
        return { data: null, error: null }
      },
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }
}

export function createMongoClient() {
  return new MongoSupabaseClient()
}
