/**
 * Targeted re-run of migration for the remaining tables.
 * Idempotent: bulk upsert by _id (UUID-derived).
 */
import { createClient } from "@supabase/supabase-js"
import { MongoClient, ObjectId } from "mongodb"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"
import ws from "ws"

;(globalThis as any).WebSocket = (globalThis as any).WebSocket || ws

const envPath = path.resolve(__dirname, "../frontend/.env")
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"

const supabase = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

// Only the tables that didn't finish in the previous run.
const TABLES = [
  "live_tv_channels",
  "live_tv_sources",
  "digital_content",
  "digital_download_links",
  "bug_reports",
  "site_settings",
  "daily_stats",
]

function uuidToObjectIdHex(uuid: string): string {
  const hex = uuid.replace(/-/g, "")
  return hex.slice(0, 24).padEnd(24, "0")
}

async function migrateTable(mongo: MongoClient, table: string) {
  const coll = mongo.db(DB_NAME).collection(table)
  let from = 0
  const PAGE = 500
  let total = 0

  while (true) {
    let data: any[] | null = null
    let lastError: string | null = null
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await supabase.from(table).select("*").range(from, from + PAGE - 1)
      if (r.error) {
        lastError = r.error.message
        // Statement timeout / 57014 → halve page size and retry
        if (/timeout|57014/i.test(lastError) && PAGE > 50) {
          // smaller batch
          await new Promise((res) => setTimeout(res, 600))
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
      console.warn(`  ! ${table}: ${lastError} (giving up at offset ${from})`)
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
    process.stdout.write(`\r  · ${table}: ${total} rows...   `)
  }
  console.log(`\r  ✓ ${table}: ${total} rows           `)
  return total
}

async function migrateAuthUsers(mongo: MongoClient) {
  const usersColl = mongo.db(DB_NAME).collection("users")
  const profilesColl = mongo.db(DB_NAME).collection("profiles")
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
      console.warn(`  ! auth.users: ${lastError}`)
      break
    }
    if (!data.users || data.users.length === 0) break

    for (const u of data.users) {
      const _id = new ObjectId(uuidToObjectIdHex(u.id))
      const profile = await profilesColl.findOne({ legacy_uuid: u.id })

      // Don't overwrite a user that has a real password_hash (e.g. our manually-seeded admin)
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
      if (profile) {
        await profilesColl.updateOne({ _id: profile._id }, { $set: { user_id: _id } })
      }
      total++
    }

    if (data.users.length < PER_PAGE) break
    page++
  }
  console.log(`  ✓ auth.users → users: ${total} rows`)
}

async function main() {
  console.log("→ Migration phase 2 (remaining tables)")
  const mongo = new MongoClient(MONGO_URL)
  await mongo.connect()
  console.log(`→ Connected to ${DB_NAME}\n`)

  for (const t of TABLES) {
    try {
      await migrateTable(mongo, t)
    } catch (e: any) {
      console.warn(`  ! ${t} failed: ${e?.message}`)
    }
  }

  console.log("\n→ auth.users → users (passwords need reset)...")
  try {
    await migrateAuthUsers(mongo)
  } catch (e: any) {
    console.warn(`  ! auth.users failed: ${e?.message}`)
  }

  await mongo.close()
  console.log("\n✓ Phase 2 complete.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
