// Seed default data — runnable once. Idempotent (uses upsert by name/slot).
import { MongoClient } from "mongodb"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

const envPath = path.resolve(__dirname, "../frontend/.env")
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"

const APIS = [
  {
    name: "VidSrc",
    base_url: "https://vidsrc.xyz",
    url_pattern: "https://vidsrc.xyz/embed/{media_type}/{tmdb_id}",
    url_pattern_movie: "https://vidsrc.xyz/embed/movie/{tmdb_id}",
    url_pattern_tv: "https://vidsrc.xyz/embed/tv/{tmdb_id}/{season}/{episode}",
    api_type: "streaming",
    is_active: true,
    priority: 1,
    language: "VO",
    is_anonymous: false,
  },
  {
    name: "2Embed",
    base_url: "https://2embed.cc",
    url_pattern: "https://www.2embed.cc/embed/{media_type}?tmdb={tmdb_id}",
    url_pattern_movie: "https://www.2embed.cc/embed/movie?tmdb={tmdb_id}",
    url_pattern_tv: "https://www.2embed.cc/embed/tv?tmdb={tmdb_id}&s={season}&e={episode}",
    api_type: "streaming",
    is_active: true,
    priority: 2,
    language: "VO",
    is_anonymous: false,
  },
  {
    name: "VidSrc.to",
    base_url: "https://vidsrc.to",
    url_pattern: "https://vidsrc.to/embed/{media_type}/{tmdb_id}/{season}/{episode}",
    url_pattern_movie: "https://vidsrc.to/embed/movie/{tmdb_id}",
    url_pattern_tv: "https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}",
    api_type: "streaming",
    is_active: true,
    priority: 3,
    language: "VO",
    is_anonymous: false,
  },
  {
    name: "MultiEmbed",
    base_url: "https://multiembed.mov",
    url_pattern: "https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1",
    url_pattern_movie: "https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1",
    url_pattern_tv: "https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1&s={season}&e={episode}",
    api_type: "streaming",
    is_active: true,
    priority: 4,
    language: "VO",
    is_anonymous: false,
  },
]

async function main() {
  const mongo = new MongoClient(MONGO_URL)
  await mongo.connect()
  const db = mongo.db(DB_NAME)
  console.log(`→ Seeding ${DB_NAME}...`)

  // third_party_apis
  for (const api of APIS) {
    await db.collection("third_party_apis").updateOne(
      { name: api.name },
      { $set: { ...api, updated_at: new Date().toISOString() }, $setOnInsert: { created_at: new Date().toISOString() } },
      { upsert: true }
    )
  }
  console.log(`  ✓ third_party_apis: ${APIS.length} entries`)

  // site_settings (single row)
  await db.collection("site_settings").updateOne(
    { _key: "main" },
    {
      $setOnInsert: {
        _key: "main",
        live_tv_ticker_enabled: false,
        live_tv_ticker_message: "Bienvenue sur WWEmbed - Votre plateforme de streaming",
        live_tv_ticker_speed: 50,
        live_tv_ticker_bg_color: "#ef4444",
        live_tv_ticker_text_color: "#ffffff",
        created_at: new Date().toISOString(),
      },
    },
    { upsert: true }
  )
  console.log(`  ✓ site_settings`)

  await mongo.close()
  console.log("✓ Seed done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
