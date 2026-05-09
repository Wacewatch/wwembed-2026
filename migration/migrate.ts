/**
 * Supabase → MongoDB one-shot migration.
 * Usage: from /app/frontend run `yarn migrate` (or `tsx /app/migration/migrate.ts`)
 *
 * Strategy:
 *  - All public tables read via REST with the service_role key
 *  - auth.users read via the Admin API (passwords cannot be exported in cleartext;
 *    we mark each migrated user `needs_password_reset=true`. They can claim their
 *    account via /auth/sign-up with the same email — `register` will detect the
 *    flag and finalize the account in place.)
 *
 * Idempotent: each table uses `_id` from Supabase `id` so re-running is safe
 * (uses upsert).
 */
import { createClient } from "@supabase/supabase-js"
import { MongoClient, ObjectId } from "mongodb"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"
import ws from "ws"

// Polyfill WebSocket for Node <22 (needed by @supabase/realtime-js)
;(globalThis as any).WebSocket = (globalThis as any).WebSocket || ws

const envPath = path.resolve(__dirname, "../frontend/.env")
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"

if (!SB_URL || !SB_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in env")
  process.exit(1)
}

const supabase = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

// Tables to migrate (Supabase table → Mongo collection)
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
]

function uuidToObjectIdHex(uuid: string): string {
  // Take first 24 hex chars from UUID (drop dashes). Stable per UUID.
  const hex = uuid.replace(/-/g, "")
  return hex.slice(0, 24).padEnd(24, "0")
}

async function migrateTable(mongo: MongoClient, table: string) {
  const coll = mongo.db(DB_NAME).collection(table)
  let from = 0
  const PAGE = 1000
  let total = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1)

    if (error) {
      console.warn(`  ! ${table}: ${error.message}`)
      return total
    }
    if (!data || data.length === 0) break

    const docs = data.map((row: any) => {
      const doc: any = { ...row }
      if (typeof row.id === "string" && /^[0-9a-f-]{36}$/i.test(row.id)) {
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
    if (ops.length) await coll.bulkWrite(ops, { ordered: false })

    total += docs.length
    if (data.length < PAGE) break
    from += PAGE
  }

  console.log(`  ✓ ${table}: ${total} rows`)
  return total
}

async function migrateAuthUsers(mongo: MongoClient) {
  const usersColl = mongo.db(DB_NAME).collection("users")
  const profilesColl = mongo.db(DB_NAME).collection("profiles")
  let page = 1
  const PER_PAGE = 1000
  let total = 0

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) {
      console.warn(`  ! auth.users: ${error.message}`)
      break
    }
    if (!data || !data.users || data.users.length === 0) break

    for (const u of data.users) {
      const _id = new ObjectId(uuidToObjectIdHex(u.id))
      // Try to find matching profile to enrich data
      const profile = await profilesColl.findOne({ legacy_uuid: u.id })

      await usersColl.updateOne(
        { _id },
        {
          $set: {
            email: (u.email || "").toLowerCase(),
            username: profile?.username || u.user_metadata?.username || (u.email || "").split("@")[0],
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
      // Backfill profile.id with Mongo id reference
      if (profile) {
        await profilesColl.updateOne({ _id: profile._id }, { $set: { user_id: _id } })
      }
      total++
    }

    if (data.users.length < PER_PAGE) break
    page++
  }
  console.log(`  ✓ auth.users → users: ${total} rows (all need password reset)`)
}

async function main() {
  console.log("→ Connecting to MongoDB...")
  const mongo = new MongoClient(MONGO_URL)
  await mongo.connect()
  console.log(`→ Connected. Target db: ${DB_NAME}`)
  console.log(`→ Source Supabase: ${SB_URL}\n`)

  for (const t of TABLES) {
    try {
      await migrateTable(mongo, t)
    } catch (e: any) {
      console.warn(`  ! ${t} skipped: ${e?.message}`)
    }
  }

  console.log("\n→ Migrating auth.users (passwords can't be exported)...")
  await migrateAuthUsers(mongo)

  await mongo.close()
  console.log("\n✓ Migration complete.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
