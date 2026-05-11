/**
 * MongoDB connection helper.
 * Single, cached MongoClient + Db across the Next.js dev/prod runtimes.
 */
import { MongoClient, Db } from "mongodb"

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var __mongoDb: Db | undefined
  // eslint-disable-next-line no-var
  var __mongoIndexed: boolean | undefined
}

export async function getDb(): Promise<Db> {
  if (global.__mongoDb) return global.__mongoDb

  const client = global.__mongoClient ?? new MongoClient(MONGO_URL)
  if (!global.__mongoClient) {
    await client.connect()
    global.__mongoClient = client
  }

  const db = client.db(DB_NAME)
  global.__mongoDb = db

  if (!global.__mongoIndexed) {
    global.__mongoIndexed = true
    await ensureIndexes(db).catch((e) => console.error("Index creation failed:", e))
  }

  return db
}

async function ensureIndexes(db: Db) {
  // users (auth)
  await db.collection("users").createIndex({ email: 1 }, { unique: true })
  await db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true })
  // streaming/download links
  await db.collection("streaming_links").createIndex({ tmdb_id: 1, media_type: 1 })
  await db.collection("streaming_links").createIndex({ ww_id: 1 })
  await db.collection("download_links").createIndex({ tmdb_id: 1, media_type: 1 })
  await db.collection("download_links").createIndex({ ww_id: 1 })
  // digital
  await db.collection("digital_content").createIndex({ ww_id: 1 }, { unique: true })
  await db.collection("digital_content").createIndex({ content_type: 1 })
  await db.collection("digital_download_links").createIndex({ content_id: 1 })
  await db.collection("digital_download_links").createIndex({ ww_id: 1 })
  // live tv
  await db.collection("live_tv_channels").createIndex({ status: 1, is_active: 1 })
  await db.collection("live_tv_sources").createIndex({ channel_id: 1 })
  // stats
  await db.collection("embed_views").createIndex({ ww_id: 1 })
  await db.collection("embed_views").createIndex({ viewed_at: -1 })
  await db.collection("link_clicks").createIndex({ clicked_at: -1 })
  await db.collection("api_usage").createIndex({ created_at: -1 })
  // ads
  await db.collection("ads").createIndex({ slot_number: 1 }, { unique: true, sparse: true })
  // bug reports
  await db.collection("bug_reports").createIndex({ created_at: -1 })
  // login attempts
  await db.collection("login_attempts").createIndex({ identifier: 1 })
}

export async function getCollection(name: string) {
  const db = await getDb()
  return db.collection(name)
}
