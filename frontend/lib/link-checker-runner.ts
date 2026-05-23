/**
 * Background link-health runner — no external cron needed.
 *
 * Migration Mongo → PostgreSQL/TimescaleDB.
 *
 * Design:
 *  • A single process-wide promise (`runningPromise`) acts as a mutex so we
 *    never have two scans in parallel.
 *  • Un **advisory lock PostgreSQL** (pg_try_advisory_lock) sert de mutex
 *    multi-instance : deux réplicas ne scannent jamais en même temps.
 *    Avantage clé vs l'ancien lock Mongo (doc runtime_locks + TTL index) :
 *    l'advisory lock est lié à la *session* qui le détient et se libère
 *    AUTOMATIQUEMENT si la connexion se ferme (crash du process inclus) —
 *    donc aucune table, aucune colonne expires_at, aucun cleanup à gérer.
 *    On garde une connexion dédiée ouverte le temps du scan (les checks HTTP
 *    sont longs) et on la relâche dans le finally.
 *  • Trigger by simply calling `triggerLinkCheckBackground()` — it returns
 *    immediately. The actual work runs in a `Promise` we don't await.
 *  • Picks the LRU links (least recently checked) split across the
 *    download / digital / streaming collections. Skips any link checked in
 *    the last 12 h (configurable) to stay polite with hosters.
 *
 * Call sites:
 *  • At the top of admin endpoints that already serve admin traffic, so a
 *    real user visit "pays" for the scan rather than dedicating a cron.
 *  • Manually via `/api/admin/check-link/run` (admin auth required).
 */
import type { PoolClient } from "pg"
import { getPool } from "@/lib/pg/db"
import { checkAndRecord, LINK_COLLECTIONS, type LinkType } from "@/lib/link-checker"

const COOLDOWN_SEC = 12 * 60 * 60 // re-check every 12h max
const MIN_INTERVAL_SEC = 5 * 60 // don't start a scan more than once per 5 min globally
const BATCH_PER_COLL = 20

// Clé de l'advisory lock (entier 64 bits arbitraire mais stable). Doit être
// la même sur toutes les instances pour que le lock soit partagé.
const LOCK_KEY = 0x77770001 // "ww" + slot 1 (link_check)

let runningPromise: Promise<void> | null = null
let lastStartedAt = 0
// Connexion dédiée qui porte l'advisory lock pendant toute la durée du scan.
let lockClient: PoolClient | null = null

interface ScanReport {
  started_at: string
  ended_at: string
  scanned: number
  alive: number
  dead: number
  unknown: number
  per_collection: Record<string, number>
}

/**
 * Tente d'acquérir l'advisory lock. Retourne true si obtenu (et garde la
 * connexion ouverte dans `lockClient`), false sinon (connexion relâchée).
 */
async function tryAcquireDbLock(): Promise<boolean> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const r = await client.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [LOCK_KEY]
    )
    if (r.rows[0]?.locked) {
      lockClient = client
      return true
    }
    client.release()
    return false
  } catch (e: any) {
    console.error("[link-runner] lock acquire error:", e?.message)
    try { client.release() } catch {}
    return false
  }
}

/** Libère l'advisory lock et rend la connexion au pool. */
async function releaseDbLock() {
  if (!lockClient) return
  try {
    await lockClient.query(`SELECT pg_advisory_unlock($1)`, [LOCK_KEY])
  } catch (e: any) {
    console.error("[link-runner] lock release error:", e?.message)
  } finally {
    try { lockClient.release() } catch {}
    lockClient = null
  }
}

/**
 * Sélectionne les liens les moins récemment vérifiés d'une collection.
 * Mongo d'origine :
 *   $and: [
 *     { $or: [ {source_url: {$exists,$ne:""}}, {url: {$exists,$ne:""}} ] },
 *     { $or: [ {last_checked: {$exists:false}}, {last_checked: {$lt: cutoff}} ] }
 *   ]
 *   sort({ last_checked: 1 }).limit(limit)
 *
 * En Postgres : source_url/url/last_checked peuvent être colonnes typées OU
 * dans data jsonb selon le schéma → on lit via COALESCE(colonne, data->>'...').
 * Le tri last_checked ASC place les NULL en premier (jamais vérifiés d'abord).
 */
async function pickBatch(linkType: LinkType, limit: number) {
  const pool = getPool()
  const table = LINK_COLLECTIONS[linkType]
  const cutoff = new Date(Date.now() - COOLDOWN_SEC * 1000).toISOString()

  // url_expr : première source d'URL non vide. last_expr : timestamp de dernière vérif.
  // On utilise to_jsonb pour tester dynamiquement la présence des champs sans
  // connaître le schéma exact (colonne typée prioritaire, sinon data->>).
  const sql = `
    WITH src AS (
      SELECT
        id::text AS link_id,
        COALESCE(
          NULLIF(to_jsonb(t) ->> 'source_url', ''),
          NULLIF(to_jsonb(t) ->> 'url', ''),
          NULLIF(t.data ->> 'source_url', ''),
          NULLIF(t.data ->> 'url', '')
        ) AS url,
        COALESCE(
          to_jsonb(t) ->> 'last_checked',
          t.data ->> 'last_checked'
        ) AS last_checked
      FROM ${table} t
    )
    SELECT link_id, url, last_checked
    FROM src
    WHERE url IS NOT NULL
      AND (last_checked IS NULL OR last_checked < $1)
    ORDER BY last_checked ASC NULLS FIRST
    LIMIT $2
  `
  try {
    const r = await pool.query<{ link_id: string; url: string; last_checked: string | null }>(
      sql, [cutoff, limit]
    )
    return r.rows.map((row) => ({ linkId: row.link_id, url: row.url }))
  } catch (e: any) {
    console.error("[link-runner] pickBatch error:", table, e?.message)
    return []
  }
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
  // Persist the last report so admin can show it. runtime_status a un index
  // unique partiel sur `key` (WHERE key IS NOT NULL) → ON CONFLICT possible.
  try {
    const pool = getPool()
    await pool.query(
      `INSERT INTO runtime_status (key, updated_at, data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (key) WHERE key IS NOT NULL
       DO UPDATE SET updated_at = EXCLUDED.updated_at, data = EXCLUDED.data`,
      ["link_check_last_run", report.ended_at, JSON.stringify({ report })]
    )
  } catch (e: any) {
    console.error("[link-runner] persist report error:", e?.message)
  }
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
  const pool = getPool()
  try {
    const r = await pool.query<{ data: any; updated_at: string }>(
      `SELECT data, updated_at FROM runtime_status WHERE key = $1 LIMIT 1`,
      ["link_check_last_run"]
    )
    const row = r.rows[0]
    if (!row) return null
    const report = row.data?.report ?? row.data ?? {}
    return { ...report, updated_at: row.updated_at }
  } catch (e: any) {
    console.error("[link-runner] readLastScan error:", e?.message)
    return null
  }
}
