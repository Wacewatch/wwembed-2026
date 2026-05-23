/**
 * Supabase-compatible fluent query shim backed by PostgreSQL / TimescaleDB.
 *
 * Reproduit EXACTEMENT l'API chainable `.from(table).select(...).eq(...).single()`
 * du shim Mongo précédent, mais génère du SQL paramétré.
 *
 * Les 28 routes API continuent de marcher sans changement de logique métier.
 *
 * Méthodes supportées :
 *   select, insert, update, upsert, delete
 *   eq, neq, in, is, ilike, like, gt, gte, lt, lte, contains, not, or, match
 *   order, limit, range, single, maybeSingle
 *   then  (awaitable)
 *
 * Retour : { data, error, count } compatible @supabase/supabase-js.
 *
 * Particularités :
 *   - `id` est une colonne uuid native. eq("id", val) accepte un UUID OU un
 *     ObjectId 24-hex (converti en UUID dérivé, cohérent avec la migration).
 *   - Les champs hors-colonnes vivent dans `data jsonb`. Au SELECT, on fusionne
 *     les colonnes réelles + le contenu de `data` pour reconstituer le document
 *     que les routes attendent (row_to_json puis merge de data).
 *   - `.or()` gère la syntaxe PostgREST y compris les `and(...)` imbriqués.
 */
import { getPool, getTableColumns } from "./db"

type SupaResponse<T> = { data: T | null; error: { message: string; code?: string } | null; count?: number }
type Mode = "select" | "insert" | "update" | "upsert" | "delete"

interface Order {
  column: string
  ascending: boolean
}

// ---------------------------------------------------------------------------
//  Helpers id : UUID natif ou ObjectId 24-hex → UUID dérivé
// ---------------------------------------------------------------------------
function oidToUuid(oidHex: string): string {
  const h = oidHex.padEnd(32, "0")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

/** Normalise une valeur d'id : UUID tel quel, ObjectId 24-hex → UUID dérivé */
function normalizeIdValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  if (/^[0-9a-f-]{36}$/i.test(value)) return value.toLowerCase()
  if (/^[a-f0-9]{24}$/i.test(value)) return oidToUuid(value.toLowerCase())
  return value
}

// ---------------------------------------------------------------------------
//  Construction du SELECT : colonnes + fusion du jsonb `data`
//  On renvoie chaque ligne comme l'union de ses colonnes scalaires et des clés
//  de `data`, pour matcher la forme du document Mongo d'origine.
// ---------------------------------------------------------------------------
function buildRowExpr(cols: string[]): string {
  // to_jsonb(t) - 'data' || coalesce(data,'{}')  =>  colonnes (sauf data brut) + contenu de data
  // Ainsi les champs débordés réapparaissent au même niveau que les colonnes.
  if (cols.includes("data")) {
    return `(to_jsonb(t) - 'data' || COALESCE(t.data, '{}'::jsonb))`
  }
  return `to_jsonb(t)`
}

class PgShimQuery<T = any> implements PromiseLike<SupaResponse<T>> {
  private mode: Mode = "select"
  private wheres: string[] = []
  private params: any[] = []
  private payload: any = null
  private selectCols?: string
  private orders: Order[] = []
  private limitN?: number
  private offsetN?: number
  private isSingle = false
  private isMaybeSingle = false
  private upsertOnConflict?: string
  private headOnly = false
  private countMode?: "exact" | "planned" | "estimated"

  constructor(private table: string) {}

  private p(value: any): string {
    this.params.push(value)
    return `$${this.params.length}`
  }

  // ---- mode setters ----
  select(cols?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.mode === "select" || (!this.payload && this.mode !== "delete")) this.mode = "select"
    this.selectCols = cols
    if (opts?.count) this.countMode = opts.count
    if (opts?.head) this.headOnly = true
    return this
  }
  insert(values: any | any[]) {
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

  // ---- column reference (id spécial, sinon colonne ou data->>) ----
  private colRef(col: string, knownCols: Set<string>): string {
    if (knownCols.has(col)) return `t.${col}`
    // champ non-colonné → on lit dans data
    return `(t.data->>'${col.replace(/'/g, "''")}')`
  }

  // ---- filtres (stockés en closures, résolus à l'exec quand on connaît les colonnes) ----
  private filterFns: Array<(kc: Set<string>) => string> = []

  eq(col: string, val: any) {
    this.filterFns.push((kc) => {
      if (col === "id" || col.endsWith("_id") || col === "user_id") {
        const nv = col === "id" ? normalizeIdValue(val) : val
        if (val === null) return `${this.colRef(col, kc)} IS NULL`
        return `${this.colRef(col, kc)} = ${this.p(nv)}`
      }
      if (val === null) return `${this.colRef(col, kc)} IS NULL`
      return `${this.colRef(col, kc)} = ${this.p(val)}`
    })
    return this
  }
  neq(col: string, val: any) {
    this.filterFns.push((kc) => (val === null ? `${this.colRef(col, kc)} IS NOT NULL` : `${this.colRef(col, kc)} IS DISTINCT FROM ${this.p(val)}`))
    return this
  }
  gt(col: string, val: any) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} > ${this.p(val)}`)
    return this
  }
  gte(col: string, val: any) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} >= ${this.p(val)}`)
    return this
  }
  lt(col: string, val: any) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} < ${this.p(val)}`)
    return this
  }
  lte(col: string, val: any) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} <= ${this.p(val)}`)
    return this
  }
  in(col: string, arr: any[]) {
    this.filterFns.push((kc) => {
      const vals = col === "id" ? arr.map(normalizeIdValue) : arr
      if (!vals.length) return "FALSE"
      return `${this.colRef(col, kc)} = ANY(${this.p(vals)})`
    })
    return this
  }
  is(col: string, val: any) {
    this.filterFns.push((kc) => {
      if (val === null) return `${this.colRef(col, kc)} IS NULL`
      if (val === true) return `${this.colRef(col, kc)} IS TRUE`
      if (val === false) return `${this.colRef(col, kc)} IS FALSE`
      return `${this.colRef(col, kc)} = ${this.p(val)}`
    })
    return this
  }
  ilike(col: string, pattern: string) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} ILIKE ${this.p(pattern)}`)
    return this
  }
  like(col: string, pattern: string) {
    this.filterFns.push((kc) => `${this.colRef(col, kc)} LIKE ${this.p(pattern)}`)
    return this
  }
  contains(col: string, val: any) {
    // jsonb/array contains
    this.filterFns.push((kc) => `${this.colRef(col, kc)} @> ${this.p(JSON.stringify(val))}`)
    return this
  }
  not(col: string, op: string, val: any) {
    this.filterFns.push((kc) => {
      const ref = this.colRef(col, kc)
      if (op === "is" && val === null) return `${ref} IS NOT NULL`
      if (op === "eq") return `${ref} IS DISTINCT FROM ${this.p(val)}`
      const sqlOp = ({ gt: ">", gte: ">=", lt: "<", lte: "<=" } as any)[op]
      if (sqlOp) return `NOT (${ref} ${sqlOp} ${this.p(val)})`
      return `NOT (${ref} = ${this.p(val)})`
    })
    return this
  }

  /**
   * .or() — syntaxe PostgREST. Supporte les and(...) imbriqués.
   * Ex: "and(season_number.eq.5,episode_number.eq.1),and(season_number.is.null,episode_number.is.null)"
   *     "last_checked.is.null,last_checked.lt.2026-...."
   */
  or(filterStr: string) {
    this.filterFns.push((kc) => {
      const parts = splitTopLevel(filterStr)
      const branches = parts.map((part) => this.parsePostgrestExpr(part.trim(), kc))
      return `(${branches.join(" OR ")})`
    })
    return this
  }

  private parsePostgrestExpr(expr: string, kc: Set<string>): string {
    // and(...) / or(...) imbriqués
    const m = expr.match(/^(and|or)\((.*)\)$/s)
    if (m) {
      const op = m[1] === "and" ? " AND " : " OR "
      const inner = splitTopLevel(m[2])
      return `(${inner.map((e) => this.parsePostgrestExpr(e.trim(), kc)).join(op)})`
    }
    // feuille : field.op.value
    const dot1 = expr.indexOf(".")
    const dot2 = expr.indexOf(".", dot1 + 1)
    const field = expr.slice(0, dot1)
    const op = expr.slice(dot1 + 1, dot2)
    const value = expr.slice(dot2 + 1)
    const ref = this.colRef(field, kc)
    switch (op) {
      case "eq": return `${ref} = ${this.p(coerce(value))}`
      case "neq": return `${ref} IS DISTINCT FROM ${this.p(coerce(value))}`
      case "gt": return `${ref} > ${this.p(coerce(value))}`
      case "gte": return `${ref} >= ${this.p(coerce(value))}`
      case "lt": return `${ref} < ${this.p(coerce(value))}`
      case "lte": return `${ref} <= ${this.p(coerce(value))}`
      case "is":
        if (value === "null") return `${ref} IS NULL`
        if (value === "true") return `${ref} IS TRUE`
        if (value === "false") return `${ref} IS FALSE`
        return `${ref} = ${this.p(value)}`
      case "ilike": return `${ref} ILIKE ${this.p(value.replace(/\*/g, "%"))}`
      case "like": return `${ref} LIKE ${this.p(value.replace(/\*/g, "%"))}`
      default: return `${ref} = ${this.p(value)}`
    }
  }

  match(obj: Record<string, any>) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v)
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
    this.offsetN = from
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

  // ---- exécution ----
  private buildWhere(kc: Set<string>): string {
    const conds = this.filterFns.map((fn) => fn(kc))
    return conds.length ? " WHERE " + conds.join(" AND ") : ""
  }

  /** Prépare un objet métier pour insert/update : sépare colonnes vs data jsonb */
  private splitColumns(obj: any, kc: Set<string>): { cols: string[]; vals: any[]; extra: Record<string, any> } {
    const cols: string[] = []
    const vals: any[] = []
    const extra: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === "data") continue // géré à part
      if (kc.has(k)) {
        cols.push(k)
        vals.push(k === "id" || k.endsWith("_id") ? (k === "id" ? normalizeIdValue(v) : v) : v)
      } else {
        extra[k] = v
      }
    }
    return { cols, vals, extra }
  }

  async _exec(): Promise<SupaResponse<any>> {
    const pool = getPool()
    let kc: Set<string>
    try {
      kc = await getTableColumns(this.table)
    } catch (e: any) {
      return { data: null, error: { message: `unknown table ${this.table}: ${e?.message}` } }
    }
    const hasData = kc.has("data")

    try {
      // -------- SELECT --------
      if (this.mode === "select") {
        const where = this.buildWhere(kc)

        if (this.headOnly || this.countMode) {
          const r = await pool.query(`SELECT count(*)::int AS c FROM ${this.table} t${where}`, this.params)
          const count = r.rows[0]?.c ?? 0
          return { data: this.headOnly ? null : [], error: null, count }
        }

        const rowExpr = buildRowExpr([...kc])
        let sql = `SELECT ${rowExpr} AS row FROM ${this.table} t${where}`
        if (this.orders.length) {
          const ob = this.orders.map((o) => `${kc.has(o.column) ? `t.${o.column}` : `(t.data->>'${o.column}')`} ${o.ascending ? "ASC" : "DESC"} NULLS LAST`)
          sql += " ORDER BY " + ob.join(", ")
        }
        if (this.limitN != null) sql += ` LIMIT ${this.limitN}`
        if (this.offsetN != null) sql += ` OFFSET ${this.offsetN}`

        const r = await pool.query(sql, this.params)
        const rows = r.rows.map((x) => x.row)

        if (this.isSingle) {
          if (rows.length === 0) return { data: null, error: { message: "No rows", code: "PGRST116" } }
          if (rows.length > 1) return { data: null, error: { message: "Multiple rows" } }
          return { data: rows[0], error: null }
        }
        if (this.isMaybeSingle) return { data: rows[0] || null, error: null }
        return { data: rows, error: null }
      }

      // -------- INSERT --------
      if (this.mode === "insert") {
        const nowIso = new Date().toISOString()
        const results: any[] = []
        for (const raw of this.payload as any[]) {
          const doc = { ...raw }
          if (kc.has("created_at") && !doc.created_at) doc.created_at = nowIso
          const { cols, vals, extra } = this.splitColumns(doc, kc)
          const allCols = [...cols]
          const params: any[] = [...vals]
          const placeholders = vals.map((_, i) => `$${i + 1}`)
          if (hasData) {
            allCols.push("data")
            params.push(JSON.stringify(extra))
            placeholders.push(`$${params.length}`)
          }
          const rowExpr = buildRowExpr([...kc])
          const sql = `INSERT INTO ${this.table} (${allCols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${rowExpr.replace(/\bt\b/g, this.table)} AS row`
          const r = await pool.query(sql, params)
          results.push(r.rows[0]?.row)
        }
        return { data: this.isSingle ? results[0] : results, error: null }
      }

      // -------- UPDATE --------
      if (this.mode === "update") {
        const doc = { ...this.payload }
        if (kc.has("updated_at")) doc.updated_at = new Date().toISOString()
        const { cols, vals, extra } = this.splitColumns(doc, kc)
        const sets: string[] = []
        for (let i = 0; i < cols.length; i++) sets.push(`${cols[i]} = ${this.p(vals[i])}`)
        if (hasData && Object.keys(extra).length) {
          sets.push(`data = COALESCE(data, '{}'::jsonb) || ${this.p(JSON.stringify(extra))}::jsonb`)
        }
        const where = this.buildWhere(kc)
        if (!sets.length) return { data: this.isSingle ? null : [], error: null }
        const rowExpr = buildRowExpr([...kc])
        const sql = `UPDATE ${this.table} t SET ${sets.join(", ")}${where} RETURNING ${rowExpr} AS row`
        const r = await pool.query(sql, this.params)
        const rows = r.rows.map((x) => x.row)
        return { data: this.isSingle ? rows[0] || null : rows, error: null }
      }

      // -------- UPSERT --------
      if (this.mode === "upsert") {
        const conflict = this.upsertOnConflict || "id"
        const results: any[] = []
        for (const raw of this.payload as any[]) {
          const doc = { ...raw }
          if (kc.has("updated_at")) doc.updated_at = new Date().toISOString()
          if (kc.has("created_at") && !doc.created_at) doc.created_at = new Date().toISOString()
          // reset params pour chaque ligne
          this.params = []
          const { cols, vals, extra } = this.splitColumns(doc, kc)
          const allCols = [...cols]
          const params: any[] = [...vals]
          const placeholders = vals.map((_, i) => `$${i + 1}`)
          if (hasData) {
            allCols.push("data")
            params.push(JSON.stringify(extra))
            placeholders.push(`$${params.length}`)
          }
          const updates = allCols.filter((c) => c !== conflict).map((c) => `${c} = EXCLUDED.${c}`)
          const rowExpr = buildRowExpr([...kc])
          const sql =
            `INSERT INTO ${this.table} (${allCols.join(", ")}) VALUES (${placeholders.join(", ")}) ` +
            `ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(", ")} ` +
            `RETURNING ${rowExpr.replace(/\bt\b/g, this.table)} AS row`
          const r = await pool.query(sql, params)
          results.push(r.rows[0]?.row)
        }
        return { data: this.isSingle ? results[0] : results, error: null }
      }

      // -------- DELETE --------
      if (this.mode === "delete") {
        const where = this.buildWhere(kc)
        const r = await pool.query(`DELETE FROM ${this.table} t${where}`, this.params)
        return { data: { count: r.rowCount } as any, error: null }
      }

      return { data: null, error: { message: "Unknown mode" } }
    } catch (e: any) {
      console.error("[pg-shim] error", this.table, e?.message)
      return { data: null, error: { message: e?.message || "PostgreSQL error" } }
    }
  }

  then<TResult1 = SupaResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupaResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._exec().then(onfulfilled as any, onrejected)
  }
}

// ---------------------------------------------------------------------------
//  Helpers de parsing PostgREST
// ---------------------------------------------------------------------------
/** Split sur les virgules de premier niveau (ignore celles dans les parenthèses) */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ""
  for (const ch of s) {
    if (ch === "(") depth++
    else if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      out.push(buf)
      buf = ""
    } else buf += ch
  }
  if (buf) out.push(buf)
  return out
}

/** Coerce une valeur string PostgREST en type JS plausible */
function coerce(v: string): any {
  if (v === "null") return null
  if (v === "true") return true
  if (v === "false") return false
  if (/^-?\d+$/.test(v)) return parseInt(v, 10)
  return v
}

// ---------------------------------------------------------------------------
//  Client
// ---------------------------------------------------------------------------
export class PgSupabaseClient {
  from(table: string) {
    return new PgShimQuery(table)
  }

  async rpc(fnName: string, args: any = {}) {
    const pool = getPool()
    try {
      if (fnName === "increment_ad_clicks") {
        await pool.query(
          `UPDATE ads SET click_count = COALESCE(click_count,0) + 1 WHERE id = $1`,
          [normalizeIdValue(args.ad_id)]
        )
        return { data: null, error: null }
      }
      if (fnName === "increment_live_tv_views") {
        await pool.query(
          `UPDATE live_tv_channels SET view_count = COALESCE(view_count,0) + 1 WHERE id = $1`,
          [normalizeIdValue(args.channel_id)]
        )
        return { data: null, error: null }
      }
      return { data: null, error: { message: `Unknown RPC: ${fnName}` } }
    } catch (e: any) {
      return { data: null, error: { message: e?.message } }
    }
  }

  auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Use /api/auth/login" } }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: "Use /api/auth/register" } }),
    admin: {
      listUsers: async () => ({ data: { users: [] }, error: null }),
      deleteUser: async (id: string) => {
        const pool = getPool()
        await pool.query(`DELETE FROM users WHERE id = $1`, [normalizeIdValue(id)])
        return { data: null, error: null }
      },
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }
}

export function createPgClient() {
  return new PgSupabaseClient()
}
