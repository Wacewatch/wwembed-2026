/**
 * Background link-health runner — no external cron needed.
 *
 * Design:
 *  • A single process-wide promise (`runningPromise`) acts as a mutex so we
 *    never have two scans in parallel.
 *  • A MongoDB lock doc (`runtime_locks.link_check`) acts as a multi-instance
 *    mutex so two server replicas don't both scan at once.
 *  • Trigger by simply calling `triggerLinkCheckBackground()` — it returns
 *    immediately. The actual work runs in a `Promise` we don't await.
 *  • Picks the LRU 60 links (least recently checked) split across the
 *    download / digital / streaming collections. Skips any link checked in
 *    the last 12 h (configurable) to stay polite with hosters.
 *
 * Call sites:
 *  • At the top of admin endpoints that already serve admin traffic, so a
 *    real user visit "pays" for the scan rather than dedicating a cron.
 *  • Manually via `/api/admin/check-link/run` (admin auth required).
 */
import { getDb } from "@/lib/mongo/db"
import { checkAndRecord, LINK_COLLECTIONS, type LinkType } from "@/lib/link-checker"

const COOLDOWN_SEC = 12 * 60 * 60 // re-check every 12h max
const LOCK_TTL_SEC = 5 * 60 // lock expires after 5 min so a crash doesn't deadlock
const MIN_INTERVAL_SEC = 5 * 60 // don't start a scan more than once per 5 min globally
const BATCH_PER_COLL = 20

let runningPromise: Promise<void> | null = null
let lastStartedAt = 0

interface ScanReport {
  started_at: string
  ended_at: string
  scanned: number
  alive: number
  dead: number
  unknown: number
  per_collection: Record<string, number>
}

async function tryAcquireDbLock(): Promise<boolean> {
  const db = await getDb()
  const coll = db.collection("runtime_locks")
  try {
    await coll.createIndex({ key: 1 }, { unique: true })
    await coll.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  } catch {}
  const now = new Date()
  const expires = new Date(now.getTime() + LOCK_TTL_SEC * 1000)
  // First clear any expired previous lock.
  await coll.deleteOne({ key: "link_check", expires_at: { $lt: now } })
  try {
    await coll.insertOne({ key: "link_check", acquired_at: now, expires_at: expires })
    return true
  } catch {
    return false
  }
}

async function releaseDbLock() {
  try {
    const db = await getDb()
    await db.collection("runtime_locks").deleteOne({ key: "link_check" })
  } catch {}
}

async function pickBatch(linkType: LinkType, limit: number) {
  const db = await getDb()
  const coll = db.collection(LINK_COLLECTIONS[linkType])
  const cutoff = new Date(Date.now() - COOLDOWN_SEC * 1000).toISOString()

  // We sort by last_checked ascending (nulls first), then take `limit`.
  const rows = await coll
    .find(
      {
        $and: [
          {
            $or: [
              { source_url: { $exists: true, $ne: "" } },
              { url: { $exists: true, $ne: "" } },
            ],
          },
          {
            $or: [{ last_checked: { $exists: false } }, { last_checked: { $lt: cutoff } }],
          },
        ],
      },
      { projection: { legacy_uuid: 1, source_url: 1, url: 1, last_checked: 1 } }
    )
    .sort({ last_checked: 1 })
    .limit(limit)
    .toArray()

  return rows.map((r: any) => ({
    linkId: r.legacy_uuid || (r._id?.toString ? r._id.toString() : String(r._id)),
    url: r.source_url || r.url,
  }))
}

async function scanOnce(): Promise<ScanReport> {
  const startedAt = new Date().toISOString()
  const report: ScanReport = {
    started_at: startedAt,
    ended_at: "",
    scanned: 0,
    alive: 0,
    dead: 0,
    unknown: 0,
    per_collection: { download: 0, digital: 0, streaming: 0 },
  }

  for (const type of ["download", "digital", "streaming"] as LinkType[]) {
    const batch = await pickBatch(type, BATCH_PER_COLL)
    report.per_collection[type] = batch.length
    // Run checks in parallel; link-checker.ts enforces per-host throttling.
    await Promise.all(
      batch.map(async (item) => {
        if (!item.url) return
        try {
          const { effective } = await checkAndRecord({
            linkId: item.linkId,
            linkType: type,
            url: item.url,
          })
          report.scanned += 1
          if (effective === "alive") report.alive += 1
          else if (effective === "dead") report.dead += 1
          else report.unknown += 1
        } catch (err) {
          console.error("[link-runner] check failed:", item.url, err)
          report.scanned += 1
          report.unknown += 1
        }
      })
    )
  }

  report.ended_at = new Date().toISOString()
  // Persist the last report so admin can show it.
  try {
    const db = await getDb()
    await db
      .collection("runtime_status")
      .updateOne(
        { key: "link_check_last_run" },
        { $set: { key: "link_check_last_run", report, updated_at: report.ended_at } },
        { upsert: true }
      )
  } catch {}
  return report
}

/**
 * Trigger a background scan. Returns immediately.
 * `force=true` bypasses the in-process 5-min throttle (still respects DB lock).
 */
export function triggerLinkCheckBackground(opts: { force?: boolean } = {}): void {
  const now = Date.now()
  if (!opts.force && now - lastStartedAt < MIN_INTERVAL_SEC * 1000) return
  if (runningPromise) return
  lastStartedAt = now
  runningPromise = (async () => {
    const got = await tryAcquireDbLock()
    if (!got) return
    try {
      await scanOnce()
    } catch (err) {
      console.error("[link-runner] scan failed:", err)
    } finally {
      await releaseDbLock()
      runningPromise = null
    }
  })()
}

/**
 * Run synchronously (for the manual admin "run now" endpoint).
 * Still respects the DB lock to avoid double-runs across instances.
 */
export async function runLinkCheckNow(): Promise<ScanReport | { skipped: true }> {
  if (runningPromise) {
    await runningPromise
    return { skipped: true }
  }
  const got = await tryAcquireDbLock()
  if (!got) return { skipped: true }
  lastStartedAt = Date.now()
  try {
    return await scanOnce()
  } finally {
    await releaseDbLock()
  }
}

/** Read the most recent scan report (for admin UI). */
export async function readLastScan() {
  const db = await getDb()
  const doc = await db.collection("runtime_status").findOne({ key: "link_check_last_run" })
  if (!doc) return null
  return { ...doc.report, updated_at: doc.updated_at }
}
