// Seed minimal test data for modal verification
import { MongoClient, ObjectId } from "mongodb"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

const envPath = path.resolve(__dirname, "../frontend/.env")
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"

async function main() {
  const mongo = new MongoClient(MONGO_URL)
  await mongo.connect()
  const db = mongo.db(DB_NAME)
  const now = new Date().toISOString()

  // Ad
  await db.collection("ads").updateOne(
    { name: "test_ad" },
    {
      $set: {
        name: "test_ad",
        ad_url: "https://example.com/ad1",
        ad_type: "popup",
        is_active: true,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Streaming link (movie)
  await db.collection("streaming_links").updateOne(
    { ww_id: "ww-movie-test-1" },
    {
      $set: {
        ww_id: "ww-movie-test-1",
        tmdb_id: 27205,
        media_type: "movie",
        source_url: "https://vidsrc.xyz/embed/movie/27205",
        source_name: "VidSrc Test",
        language: "VF",
        quality: "1080p",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Download link (movie)
  await db.collection("download_links").updateOne(
    { ww_id: "ww-movie-test-1" },
    {
      $set: {
        ww_id: "ww-movie-test-1",
        tmdb_id: 27205,
        media_type: "movie",
        source_url: "https://example.com/test.mkv",
        source_name: "Test Source",
        release_name: "Inception.2010.1080p.BluRay.mkv",
        language: "VF",
        quality: "1080p",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Live TV channel
  await db.collection("live_tv_channels").updateOne(
    { ww_id: "ww-tv-test-1" },
    {
      $set: {
        ww_id: "ww-tv-test-1",
        channel_name: "Test Channel",
        channel_logo: "",
        is_active: true,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )
  const channel = await db.collection("live_tv_channels").findOne({ ww_id: "ww-tv-test-1" })
  if (channel) {
    await db.collection("live_tv_sources").updateOne(
      { channel_id: channel._id, source_url: "https://test-stream.com/stream.m3u8" },
      {
        $set: {
          channel_id: channel._id,
          source_url: "https://test-stream.com/stream.m3u8",
          source_name: "Test Source",
          quality: "HD",
          language: "VO",
          is_active: true,
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    )
  }

  // Digital content (software)
  await db.collection("digital_content").updateOne(
    { ww_id: "ww-software-test-1" },
    {
      $set: {
        ww_id: "ww-software-test-1",
        title: "Test Software",
        content_type: "software",
        cover_url: "",
        version: "1.0",
        file_size: "100MB",
        description: "Test software description",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )
  await db.collection("digital_download_links").updateOne(
    { ww_id: "ww-software-test-1", source_name: "Test DL" },
    {
      $set: {
        ww_id: "ww-software-test-1",
        source_name: "Test DL",
        source_url: "https://example.com/test.exe",
        file_format: "EXE",
        file_size: "100MB",
        link_type: "direct",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Digital download (ww-soft-XXX format used by /api/v1/download)
  await db.collection("digital_content").updateOne(
    { ww_id: "ww-soft-test-1" },
    {
      $set: {
        ww_id: "ww-soft-test-1",
        title: "Test Soft Download",
        content_type: "software",
        cover_url: "",
        version: "1.0",
        file_size: "100MB",
        description: "Test soft for download route",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )
  await db.collection("digital_download_links").updateOne(
    { ww_id: "ww-soft-test-1", source_name: "Test DL" },
    {
      $set: {
        ww_id: "ww-soft-test-1",
        source_name: "Test DL",
        source_url: "https://example.com/test.exe",
        file_format: "EXE",
        file_size: "100MB",
        link_type: "direct",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Ebook
  await db.collection("digital_content").updateOne(
    { ww_id: "ww-ebook-test-1" },
    {
      $set: {
        ww_id: "ww-ebook-test-1",
        title: "Test Ebook",
        content_type: "ebook",
        cover_url: "",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )
  await db.collection("digital_download_links").updateOne(
    { ww_id: "ww-ebook-test-1", source_name: "Test PDF" },
    {
      $set: {
        ww_id: "ww-ebook-test-1",
        source_name: "Test PDF",
        source_url: "https://example.com/test.pdf",
        reader_url: "https://example.com/test.pdf",
        file_format: "PDF",
        file_size: "5MB",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  // Music
  await db.collection("digital_content").updateOne(
    { ww_id: "ww-music-test-1" },
    {
      $set: {
        ww_id: "ww-music-test-1",
        title: "Test Music",
        content_type: "music",
        cover_url: "",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )
  await db.collection("digital_download_links").updateOne(
    { ww_id: "ww-music-test-1", source_name: "Test MP3" },
    {
      $set: {
        ww_id: "ww-music-test-1",
        source_name: "Test MP3",
        source_url: "https://example.com/test.mp3",
        file_format: "MP3",
        file_size: "10MB",
        is_active: true,
        status: "approved",
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  )

  console.log("✓ Test modal seed done")
  await mongo.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
