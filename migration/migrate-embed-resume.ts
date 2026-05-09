/**
 * Resume embed_views migration from where it left off.
 * Uses smaller batches + retry on timeout, paginates via offset.
 * Idempotent (upsert by hashed _id derived from row.id UUID).
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

  const PAGE = 200 // small batches to avoid timeouts
  // Start from current count (we assume earlier rows are in)
  let from = await coll.countDocuments()
  console.log(`→ Resuming embed_views from offset ${from}`)
  let total = from

  while (true) {
    let data: any[] | null = null
    let lastErr: string | null = null
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await supabase
        .from("embed_views")
        .select("*")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1)
      if (r.error) {
        lastErr = r.error.message
        if (/timeout|57014|aborted/i.test(lastErr)) {
          await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)))
          continue
        }
        break
      }
      data = r.data || []
      lastErr = null
      break
    }
    if (lastErr) {
      console.warn(`  ! offset ${from} failed: ${lastErr} — sleeping 5s`)
      await new Promise((res) => setTimeout(res, 5000))
      continue
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
    from += PAGE
    if (total % 5000 < PAGE) {
      console.log(`  · embed_views: ${total} rows so far`)
    }
    if (data.length < PAGE) break
  }

  console.log(`✓ embed_views resume done: ${total} total`)
  await mongo.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
