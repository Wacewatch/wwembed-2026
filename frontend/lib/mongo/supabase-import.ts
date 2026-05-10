/**
 * Server-side Supabase → MongoDB importer.
 * Stateless module: a single global in-memory job + a persisted "import_jobs"
 * doc in MongoDB so the admin UI can poll progress and survive page refresh.
 *
 * Triggered by POST /api/admin/import-supabase (admin only).
 */
import { createClient } from "@supabase/supabase-js"
import { ObjectId } from "mongodb"
import { getDb } from "./db"

const SB_URL = process.env.SUPABASE_URL || ""
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || ""

// Tables to migrate (order matters: profiles before users so we can enrich)
const TABLES = [
  "profiles",
  "profile_settings",
  "third_party_apis",
  "streaming_links",
  "download_links",
  "embed_views",
  "link_clicks",
  "api_usage",
  "daily_stats",
  "ads",
  "ad_clicks",
  "live_tv_channels",
  "live_tv_sources",
  "digital_content",
  "digital_download_links",
  "bug_reports",
  "site_settings",
] as const

export type ImportTableStatus = {
  name: string
  total: number
  state: "pending" | "running" | "done" | "error"
  error?: string
}

export type ImportJob = {
  _id: ObjectId
  status: "running" | "done" | "error"
  started_at: string
  finished_at?: string
  current_table?: string
  phase: "tables" | "auth_users" | "done"
  tables: ImportTableStatus[]
  auth_users: { total: number; state: "pending" | "running" | "done" | "error"; error?: string }
  total_rows: number
  error?: string
}

// Singleton — only one import at a time per Node process
declare global {
  // eslint-disable-next-line no-var
  var __ww_import_running: boolean | undefined
}

function uuidToObjectIdHex(uuid: string): string {
  const hex = uuid.replace(/-/g, "")
  return hex.slice(0, 24).padEnd(24, "0")
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)
}

async function persistJob(job: ImportJob) {
  const db = await getDb()
  await db.collection("import_jobs").replaceOne({ _id: job._id }, job, { upsert: true })
}

async function migrateTable(
  job: ImportJob,
  supabase: ReturnType<typeof createClient>,
  tableName: string
) {
  const db = await getDb()
  const coll = db.collection(tableName)
  const tableEntry = job.tables.find((t) => t.name === tableName)!
  tableEntry.state = "running"
  job.current_table = tableName
  await persistJob(job)

  let from = 0
  const PAGE = 500
  let total = 0

  while (true) {
    let data: any[] | null = null
    let lastError: string | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await supabase.from(tableName).select("*").range(from, from + PAGE - 1)
      if (r.error) {
        lastError = r.error.message
        if (/timeout|57014|fetch failed/i.test(lastError)) {
          await new Promise((res) => setTimeout(res, 800 * (attempt + 1)))
          continue
        }
        await new Promise((res) => setTimeout(res, 800 * (attempt + 1)))
        continue
      }
      data = r.data || []
      lastError = null
      break
    }

    if (lastError) {
      tableEntry.state = "error"
      tableEntry.error = lastError
      tableEntry.total = total
      await persistJob(job)
      return total
    }
    if (!data || data.length === 0) break

    const docs = data.map((row: any) => {
      const doc: any = { ...row }
      if (isUuid(row.id)) {
        try {
          doc._id = new ObjectId(uuidToObjectIdHex(row.id))
          doc.legacy_uuid = row.id
        } catch {
          doc._id = new ObjectId()
          doc.legacy_uuid = row.id
        }
      } else if (row.id != null) {
        doc.legacy_id = row.id
      }
      delete doc.id
      return doc
    })

    const ops = docs.map((d) => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    }))
    if (ops.length) {
      try {
        await coll.bulkWrite(ops as any, { ordered: false })
      } catch (e: any) {
        // Continue on duplicate-key etc
        if (!/duplicate key|E11000/i.test(e?.message || "")) {
          tableEntry.state = "error"
          tableEntry.error = e?.message || "bulkWrite failed"
          tableEntry.total = total
          await persistJob(job)
          return total
        }
      }
    }

    total += docs.length
    tableEntry.total = total
    job.total_rows += docs.length
    // Persist every page so UI can show live progress
    await persistJob(job)

    if (data.length < PAGE) break
    from += PAGE
  }

  tableEntry.state = "done"
  tableEntry.total = total
  await persistJob(job)
  return total
}

async function migrateAuthUsers(job: ImportJob, supabase: ReturnType<typeof createClient>) {
  const db = await getDb()
  const usersColl = db.collection("users")
  const profilesColl = db.collection("profiles")
  job.phase = "auth_users"
  job.auth_users.state = "running"
  job.current_table = "auth.users"
  await persistJob(job)

  let page = 1
  const PER_PAGE = 500
  let total = 0

  while (true) {
    let data: any = null
    let lastError: string | null = null
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE })
      if (r.error) {
        lastError = r.error.message
        await new Promise((res) => setTimeout(res, 800 * (attempt + 1)))
        continue
      }
      data = r.data
      lastError = null
      break
    }
    if (lastError || !data) {
      job.auth_users.state = "error"
      job.auth_users.error = lastError || "listUsers failed"
      await persistJob(job)
      return
    }
    if (!data.users || data.users.length === 0) break

    for (const u of data.users) {
      const _id = new ObjectId(uuidToObjectIdHex(u.id))
      const profile = await profilesColl.findOne({ legacy_uuid: u.id })

      // Don't overwrite a user that already has a real password_hash
      // (e.g. our manually-seeded admin or users who have set their password
      // via the post-migration sign-up flow).
      const existing = await usersColl.findOne({ _id })
      if (existing && existing.password_hash) {
        if (profile) {
          await profilesColl.updateOne({ _id: profile._id }, { $set: { user_id: _id } })
        }
        total++
        continue
      }

      await usersColl.updateOne(
        { _id },
        {
          $set: {
            email: (u.email || "").toLowerCase(),
            username:
              profile?.username || u.user_metadata?.username || (u.email || "").split("@")[0],
            role: profile?.role || u.user_metadata?.role || "member",
            password_hash: null,
            needs_password_reset: true,
            legacy_uuid: u.id,
            email_confirmed_at: u.email_confirmed_at,
            created_at: u.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      )
      if (profile) {
        await profilesColl.updateOne({ _id: profile._id }, { $set: { user_id: _id } })
      }
      total++
    }

    job.auth_users.total = total
    await persistJob(job)

    if (data.users.length < PER_PAGE) break
    page++
  }

  job.auth_users.state = "done"
  job.auth_users.total = total
  await persistJob(job)
}

/**
 * Start a new import job. Returns immediately with the job id.
 * Throws if env is missing or another import is already running.
 */
export async function startImportJob(): Promise<ImportJob> {
  if (!SB_URL || !SB_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in environment")
  }
  if (globalThis.__ww_import_running) {
    throw new Error("An import is already running")
  }
  globalThis.__ww_import_running = true

  const supabase = createClient(SB_URL, SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const job: ImportJob = {
    _id: new ObjectId(),
    status: "running",
    started_at: new Date().toISOString(),
    phase: "tables",
    current_table: undefined,
    tables: TABLES.map((t) => ({ name: t, total: 0, state: "pending" })),
    auth_users: { total: 0, state: "pending" },
    total_rows: 0,
  }
  await persistJob(job)

  // Run async — don't block the request
  ;(async () => {
    try {
      for (const t of TABLES) {
        try {
          await migrateTable(job, supabase, t)
        } catch (e: any) {
          const entry = job.tables.find((x) => x.name === t)
          if (entry) {
            entry.state = "error"
            entry.error = e?.message || "unknown"
          }
          await persistJob(job)
        }
      }

      try {
        await migrateAuthUsers(job, supabase)
      } catch (e: any) {
        job.auth_users.state = "error"
        job.auth_users.error = e?.message || "unknown"
      }

      job.phase = "done"
      job.status = job.tables.some((t) => t.state === "error") ? "error" : "done"
      job.finished_at = new Date().toISOString()
      job.current_table = undefined
      await persistJob(job)
    } catch (e: any) {
      job.status = "error"
      job.error = e?.message || "unknown"
      job.finished_at = new Date().toISOString()
      await persistJob(job)
    } finally {
      globalThis.__ww_import_running = false
    }
  })()

  return job
}

export async function getLatestJob(): Promise<ImportJob | null> {
  const db = await getDb()
  const doc = await db
    .collection("import_jobs")
    .find({})
    .sort({ started_at: -1 })
    .limit(1)
    .toArray()
  return (doc[0] as unknown as ImportJob) || null
}

export async function getJobById(id: string): Promise<ImportJob | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null
  const db = await getDb()
  const doc = await db.collection("import_jobs").findOne({ _id: new ObjectId(id) })
  return (doc as unknown as ImportJob) || null
}
