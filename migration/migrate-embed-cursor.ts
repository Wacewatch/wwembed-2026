/**
 * Cursor-based (seek pagination) embed_views resume.
 * Avoids deep OFFSET timeouts by using `WHERE id > last_id ORDER BY id`.
 */
import { createClient } from "@supabase/supabase-js"
import { MongoClient, ObjectId } from "mongodb"
import * as dotenv from "dotenv"
import ws from "ws"

;(globalThis as any).WebSocket = (globalThis as any).WebSocket || ws
dotenv.config({ path: "/app/frontend/.env" })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)
const mongo = new MongoClient(process.env.MONGO_URL || "mongodb://localhost:27017")

function uuidToObjectIdHex(u: string) {
  return u.replace(/-/g, "").slice(0, 24).padEnd(24, "0")
}

async function main() {
  await mongo.connect()
  const db = mongo.db(process.env.DB_NAME || "wwembed")
  const coll = db.collection("embed_views")

  // Find the highest legacy_uuid we already have, sorted lexicographically.
  // BUT — the previous offset-based migration didn't import in id order, so
  // missing rows are scattered. Start from null and rely on upsert idempotency.
  const RESTART_FROM_BEGINNING = true
  const last = RESTART_FROM_BEGINNING
    ? []
    : await coll
        .find({ legacy_uuid: { $exists: true } })
        .sort({ legacy_uuid: -1 })
        .limit(1)
        .toArray()
  let cursor: string | null = last[0]?.legacy_uuid || null

  console.log(`→ Cursor-based resume. Starting after id > ${cursor}`)
  let total = await coll.countDocuments()
  console.log(`→ Currently ${total} rows in Mongo`)

  const PAGE = 1000

  while (true) {
    let q = supabase
      .from("embed_views")
      .select("*")
      .order("id", { ascending: true })
      .limit(PAGE)
    if (cursor) q = q.gt("id", cursor)

    let data: any[] | null = null
    let lastErr: string | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await q
      if (r.error) {
        lastErr = r.error.message
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
        continue
      }
      data = r.data || []
      lastErr = null
      break
    }
    if (lastErr) {
      console.warn(`  ! cursor ${cursor} failed: ${lastErr}`)
      break
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
      }
      delete doc.id
      return doc
    })

    const ops = docs.map((d) => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    }))
    await coll.bulkWrite(ops, { ordered: false })

    total += docs.length
    cursor = data[data.length - 1].id
    if (total % 10000 < PAGE) {
      console.log(`  · ${total} rows (last id ${cursor?.slice(0, 8)}...)`)
    }
    if (data.length < PAGE) break
  }

  console.log(`✓ embed_views complete: ${total} rows`)
  await mongo.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
