/**
 * Single fast endpoint that returns everything the Admin > Stats tab needs.
 * Uses MongoDB aggregation pipelines instead of paginated client fetches.
 * Typical response time: ~100-300ms vs 5-15s previously.
 *
 * NOTE: per user request, NO arbitrary limits are applied anywhere in this
 * endpoint. Group-by aggregations are naturally bounded by the cardinality
 * of the grouping key (ww_id, host, etc.). For raw-document fetches we use
 * a time window filter (no $limit).
 */
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"
import { requireAdmin } from "@/lib/pg/auth"
import { fetchTmdbCached } from "@/lib/tmdb-cache"
import { getRedis } from "@/lib/redis"

const redis = getRedis()

// In-memory TMDB cache REMOVED — use Mongo-backed `fetchTmdbCached` from
// lib/tmdb-cache.ts. On serverless / multi-instance hosting the per-process
// Map cache had a near-zero hit rate after every cold start.

// Index bootstrap supprimé : en PostgreSQL/TimescaleDB les index sont définis
// dans le schéma (db/schema.sql) et gérés par la base. Plus de createIndex
// applicatif au runtime.

async function fetchTmdb(type: string, id: number) {
  if (type !== "movie" && type !== "tv") return { title: `#${id}`, poster: null }
  return fetchTmdbCached(type as "movie" | "tv", id)
}

export async function GET(req: NextRequest) {
  // Bypass auth pour le warmup interne (header injecté par /api/internal/warm-stats)
  const internalWarmup = req.headers.get("x-internal-warmup")
  const isWarmup =
    internalWarmup !== null &&
    process.env.INTERNAL_WARMUP_TOKEN !== undefined &&
    internalWarmup === process.env.INTERNAL_WARMUP_TOKEN

  if (!isWarmup) {
    try {
      await requireAdmin(req)
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") || "7", 10)))
    const cacheKey = `stats:period:${period}`
    const lockKey = `stats:lock:${period}`
    // TTL adaptatif selon la période — longue durée pour minimiser cache miss
    // qui déclenchent un rebuild lourd (35 aggrégations) au chargement de /admin.
    const ttl = period <= 7 ? 300 : period <= 30 ? 900 : 3600  // 5min / 15min / 1h
    const staleTtl = ttl * 3 // données restent en cache 3x le TTL

    // 1) Hit cache : sert immédiat, et si stale on régénère en background
    try {
      const cachedJson = await redis.get(cacheKey)
      const cachedAt = await redis.get(`${cacheKey}:ts`)
      if (cachedJson) {
        const age = cachedAt ? Math.floor((Date.now() - parseInt(cachedAt)) / 1000) : 0
        // Stale-while-revalidate : on retourne la donnée stale et on régénère en bg
        if (age > ttl && age < staleTtl) {
          const lockAcquired = await redis.set(lockKey, "1", "EX", 120, "NX")
          if (lockAcquired === "OK") {
            buildStatsResponse(req)
              .then(async (res) => {
                const data = await res.json()
                await redis.setex(cacheKey, staleTtl, JSON.stringify(data))
                await redis.setex(`${cacheKey}:ts`, staleTtl, String(Date.now()))
                await redis.del(lockKey)
              })
              .catch((err) => {
                console.error("[stats bg refresh]", err?.message || err)
                redis.del(lockKey).catch(() => {})
              })
          }
        }
        return NextResponse.json(JSON.parse(cachedJson))
      }
    } catch (e) {
      // Redis indisponible — on continue sans cache
    }

    // 2) Pas de cache : lock anti-stampede, sinon attend le résultat d'un autre worker
    const initLockAcquired = await redis.set(lockKey, "1", "EX", 120, "NX").catch(() => null)
    if (initLockAcquired !== "OK") {
      // Un autre worker construit déjà la réponse — on attend max 30s
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 500))
        try {
          const result = await redis.get(cacheKey)
          if (result) return NextResponse.json(JSON.parse(result))
        } catch (e) {}
      }
    }

    // 3) On a le lock (ou Redis down) : on génère et on cache
    try {
      const res = await buildStatsResponse(req)
      const data = await res.json()
      try {
        await redis.setex(cacheKey, staleTtl, JSON.stringify(data))
        await redis.setex(`${cacheKey}:ts`, staleTtl, String(Date.now()))
      } catch (e) {}
      return NextResponse.json(data)
    } finally {
      redis.del(lockKey).catch(() => {})
    }
  } catch (err: any) {
    console.error("[admin/stats] failed:", err?.stack || err)
    return NextResponse.json(
      { error: "Internal error", message: err?.message || String(err) },
      { status: 500 }
    )
  }
}

async function buildStatsResponse(req: NextRequest) {

  const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") || "7", 10)))
  const now = new Date()
  const startDate = new Date(now.getTime() - period * 86400000).toISOString()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString()
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000).toISOString()

  const pool = getPool()

  // Lecture sur tables brutes PostgreSQL/TimescaleDB (exact + rapide grâce aux
  // index sur viewed_at/clicked_at/ww_id et au chunk exclusion). Les helpers
  // Mongo dayBucket (gestion ISO/Date) et uniqueKey disparaissent : viewed_at
  // est un timestamptz natif → date_trunc, et l'unicité = COUNT(DISTINCT (ip,ua)).
  //
  // Les résultats sont remappés vers la MÊME forme que les anciennes
  // aggregations Mongo ({_id: ..., count/views/...}) pour que tout le code
  // d'enrichissement en aval (TMDB, channels, digital, séries denses,
  // normalisation referer) reste strictement inchangé.
  //
  // On n'a plus besoin des "5 vagues séquentielles anti-OOM" : en SQL la DB
  // agrège côté serveur et ne renvoie que des résultats agrégés (pas de
  // rapatriement de millions de docs en RAM Node). On garde un découpage en
  // Promise.all par table pour la lisibilité.

  // ── Vague 1 — counts simples (un scan embed_views + un scan link_clicks) ──
  const [viewCountsRes, clickCountsRes, adClicksRes, totalViewsRes] = await Promise.all([
    pool.query(
      `SELECT
         count(*) FILTER (WHERE viewed_at >= $1)::int AS online5,
         count(*) FILTER (WHERE viewed_at >= $2)::int AS online15,
         count(*) FILTER (WHERE viewed_at >= $3)::int AS online1h,
         count(*) FILTER (WHERE viewed_at >= $4)::int AS online24h
       FROM embed_views WHERE viewed_at >= $4`,
      [fiveMinAgo, fifteenMinAgo, oneHourAgo, twentyFourHoursAgo]
    ),
    pool.query(
      `SELECT
         count(*) FILTER (WHERE clicked_at >= $1)::int AS total_clicks,
         count(*)::int AS total_all_time,
         count(*) FILTER (WHERE clicked_at >= $1 AND link_id IS NOT NULL)::int AS internal_period,
         count(*) FILTER (WHERE link_id IS NOT NULL)::int AS internal_all_time
       FROM link_clicks`,
      [startDate]
    ),
    pool.query(`SELECT count(*)::int AS n FROM ad_clicks WHERE clicked_at >= $1`, [startDate]),
    // total_views / total_streaming sur la période → CAGG (sommes additives).
    pool.query(
      `SELECT
         COALESCE(sum(views), 0)::int AS total_views,
         COALESCE(sum(views) FILTER (WHERE embed_type = 'streaming'), 0)::int AS total_streaming
       FROM embed_views_daily WHERE day >= $1`,
      [startDate]
    ),
  ])
  const vc = viewCountsRes.rows[0] || {}
  const cc = clickCountsRes.rows[0] || {}
  const tv = totalViewsRes.rows[0] || {}
  const totalViews = tv.total_views || 0
  const totalStreamingViews = tv.total_streaming || 0
  const totalLinkClicks = cc.total_clicks || 0
  const totalAdClicks = adClicksRes.rows[0]?.n || 0
  const online5 = vc.online5 || 0
  const online15 = vc.online15 || 0
  const online1h = vc.online1h || 0
  const online24h = vc.online24h || 0
  const externalClicksRaw = cc.total_clicks || 0
  const totalExternalClicks = cc.total_all_time || 0
  const internalClicksRaw = cc.internal_period || 0
  const totalInternalClicksAllTime = cc.internal_all_time || 0

  // ── Vague 2 — embed_views aggregations ──
  const [
    viewsByDayRes,
    uniqueRes,
    viewsByTypeRes,
    topMediaRes,
    topRefererRes,
    activePagesRes,
    recentVisitorsRes,
  ] = await Promise.all([
    // viewsByDay → CAGG embed_views_daily (somme additive par jour).
    pool.query(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day,
              sum(views)::int AS total,
              COALESCE(sum(views) FILTER (WHERE embed_type = 'streaming'), 0)::int AS streaming
       FROM embed_views_daily WHERE day >= $1 GROUP BY day`,
      [startDate]
    ),
    // count unique : non additif → reste sur table brute, version hash (3x plus
    // rapide que le DISTINCT sur tuple (ip_hash,user_agent) large).
    // count unique → HLL via cagg embed_views_daily (distinct_count(rollup(...))).
    // ~2% d'erreur (nature hyperloglog), quasi instantané vs ~18s en COUNT(DISTINCT)
    // sur la table brute. Le rollup fusionne les empreintes journalières/par type.
    pool.query(
      `SELECT distinct_count(rollup(visitors_hll))::int AS n
       FROM embed_views_daily WHERE day >= $1`,
      [startDate]
    ),
    // viewsByType → CAGG embed_views_daily (somme par media_type).
    pool.query(
      `SELECT media_type AS _id, sum(views)::int AS count
       FROM embed_views_daily WHERE day >= $1 GROUP BY media_type`,
      [startDate]
    ),
    // topMedia : movie/tv via cagg bywork (par ŒUVRE = tmdb_id, ~110k clés,
    // rapide) UNION live/digital via by_content (par ww_id, faible volume).
    // L'enrichissement movie/tv n'utilise que (media_type, tmdb_id) → ww_id null OK.
    pool.query(
      `(SELECT NULL::text AS ww_id, media_type, tmdb_id, sum(views)::int AS views
        FROM embed_views_bywork_daily WHERE day >= $1
        GROUP BY media_type, tmdb_id)
       UNION ALL
       (SELECT ww_id, NULL::text AS media_type, NULL::int AS tmdb_id, sum(views)::int AS views
        FROM embed_views_by_content_daily WHERE day >= $1
          AND (ww_id LIKE 'ww-live-%' OR ww_id LIKE 'ww-ebook-%' OR ww_id LIKE 'ww-music-%'
               OR ww_id LIKE 'ww-soft-%' OR ww_id LIKE 'ww-game-%')
        GROUP BY ww_id)
       ORDER BY views DESC LIMIT 100`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(referrer, 'Direct') AS _id, sum(views)::int AS count
       FROM embed_views_byreferer_daily WHERE day >= $1
       GROUP BY COALESCE(referrer, 'Direct') ORDER BY count DESC LIMIT 100`,
      [startDate]
    ),
    pool.query(
      `SELECT ww_id AS _id,
              count(*)::int AS count,
              (array_agg(media_type ORDER BY viewed_at DESC))[1] AS media_type,
              (array_agg(tmdb_id    ORDER BY viewed_at DESC))[1] AS tmdb_id
       FROM embed_views WHERE viewed_at >= $1 GROUP BY ww_id ORDER BY count DESC`,
      [fifteenMinAgo]
    ),
    pool.query(
      `SELECT ww_id, media_type, tmdb_id, ip_hash, viewed_at
       FROM embed_views WHERE viewed_at >= $1 ORDER BY viewed_at DESC`,
      [oneHourAgo]
    ),
  ])
  // Remap vers la forme Mongo attendue.
  const viewsByDay = viewsByDayRes.rows.map((r: any) => ({ _id: r.day, total: r.total, streaming: r.streaming }))
  const uniqueIpsAgg = [{ n: uniqueRes.rows[0]?.n || 0 }]
  const viewsByType = viewsByTypeRes.rows
  const topMediaRaw = topMediaRes.rows.map((r: any) => ({
    _id: { ww_id: r.ww_id, media_type: r.media_type, tmdb_id: r.tmdb_id },
    views: r.views,
  }))
  const topRefererRaw = topRefererRes.rows
  const activePagesRaw = activePagesRes.rows
  const recentVisitorsRaw = recentVisitorsRes.rows

  // ── Vague 3 — link_clicks (tops + breakdowns période) ──
  const [
    topDownloadRes,
    externalByDayRes,
    externalProvidersRes,
    externalHostsRes,
    externalQualityRes,
    externalMediaTypeRes,
    externalTopRes,
  ] = await Promise.all([
    pool.query(
      `SELECT ww_id, media_type, tmdb_id, count(*)::int AS downloads
       FROM link_clicks WHERE clicked_at >= $1
       GROUP BY ww_id, media_type, tmdb_id ORDER BY downloads DESC LIMIT 100`,
      [startDate]
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 GROUP BY _id`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(provider, 'Inconnu') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 GROUP BY COALESCE(provider,'Inconnu') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(host_name, '?') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 GROUP BY COALESCE(host_name,'?') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(quality, 'N/A') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 GROUP BY COALESCE(quality,'N/A') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(media_type, '?') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 GROUP BY COALESCE(media_type,'?') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT ww_id, media_type, tmdb_id, count(*)::int AS clicks
       FROM link_clicks WHERE clicked_at >= $1
       GROUP BY ww_id, media_type, tmdb_id ORDER BY clicks DESC`,
      [startDate]
    ),
  ])
  const topDownloadRaw = topDownloadRes.rows.map((r: any) => ({
    _id: { ww_id: r.ww_id, media_type: r.media_type, tmdb_id: r.tmdb_id },
    downloads: r.downloads,
  }))
  const externalByDayRaw = externalByDayRes.rows
  const externalProvidersRaw = externalProvidersRes.rows
  const externalHostsRaw = externalHostsRes.rows
  const externalQualityRaw = externalQualityRes.rows
  const externalMediaTypeRaw = externalMediaTypeRes.rows
  const externalTopRaw = externalTopRes.rows.map((r: any) => ({
    _id: { ww_id: r.ww_id, media_type: r.media_type, tmdb_id: r.tmdb_id },
    clicks: r.clicks,
  }))

  // ── Vague 4 — link_clicks externals by source (link_type='external') ──
  const [externalBySourceRes, externalByDayBySourceRes, externalTopBySourceRes] = await Promise.all([
    pool.query(
      `SELECT COALESCE(source, 'movix') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_type = 'external'
       GROUP BY COALESCE(source,'movix') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS date,
              COALESCE(source, 'movix') AS source, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_type = 'external'
       GROUP BY date, COALESCE(source,'movix')`,
      [startDate]
    ),
    // Top-5 contenus par source via ROW_NUMBER partitionné.
    pool.query(
      `WITH agg AS (
         SELECT COALESCE(source,'movix') AS source, ww_id, tmdb_id, media_type, count(*)::int AS clicks
         FROM link_clicks WHERE clicked_at >= $1 AND link_type = 'external'
         GROUP BY COALESCE(source,'movix'), ww_id, tmdb_id, media_type
       ),
       ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY source ORDER BY clicks DESC) AS rn FROM agg)
       SELECT source, ww_id, tmdb_id, media_type, clicks FROM ranked WHERE rn <= 5 ORDER BY source, clicks DESC`,
      [startDate]
    ),
  ])
  const externalBySourceRaw = externalBySourceRes.rows
  const externalByDayBySourceRaw = externalByDayBySourceRes.rows.map((r: any) => ({
    _id: { date: r.date, source: r.source },
    count: r.count,
  }))
  // Regrouper par source (forme: [{_id: source, items: [...]}]).
  const bySourceItems = new Map<string, any[]>()
  for (const r of externalTopBySourceRes.rows as any[]) {
    if (!bySourceItems.has(r.source)) bySourceItems.set(r.source, [])
    bySourceItems.get(r.source)!.push({ ww_id: r.ww_id, tmdb_id: r.tmdb_id, media_type: r.media_type, clicks: r.clicks })
  }
  const externalTopBySourceRaw = Array.from(bySourceItems.entries()).map(([source, items]) => ({ _id: source, items }))

  // ── Vague 5 — link_clicks internals (link_id IS NOT NULL) ──
  const [
    internalByDayRes,
    internalTopLinksRes,
    internalTopUploadersRes,
    internalByQualityRes,
    internalByMediaTypeRes,
    internalByLinkTypeRes,
  ] = await Promise.all([
    pool.query(
      `SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL GROUP BY _id`,
      [startDate]
    ),
    pool.query(
      `SELECT link_id::text AS _id, count(*)::int AS clicks
       FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL
       GROUP BY link_id ORDER BY clicks DESC LIMIT 100`,
      [startDate]
    ),
    // Le $lookup Mongo (link_id → submitted_by via download/digital) devient
    // un LEFT JOIN sur id : la migration a promu l'ancien legacy_uuid au rang
    // d'id Postgres, donc link_clicks.link_id = download_links.id (uuid = uuid).
    pool.query(
      `WITH clk AS (
         SELECT link_id, count(*)::int AS clicks
         FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL
         GROUP BY link_id
       ),
       resolved AS (
         SELECT clk.clicks,
                COALESCE(dl.submitted_by::text, ddl.submitted_by::text) AS uploader
         FROM clk
         LEFT JOIN download_links         dl  ON dl.id  = clk.link_id
         LEFT JOIN digital_download_links ddl ON ddl.id = clk.link_id
       )
       SELECT uploader AS _id, sum(clicks)::int AS clicks, count(*)::int AS "linkCount"
       FROM resolved WHERE uploader IS NOT NULL
       GROUP BY uploader ORDER BY clicks DESC LIMIT 50`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(quality, 'N/A') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL
       GROUP BY COALESCE(quality,'N/A') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(media_type, '?') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL
       GROUP BY COALESCE(media_type,'?') ORDER BY count DESC`,
      [startDate]
    ),
    pool.query(
      `SELECT COALESCE(link_type, 'direct') AS _id, count(*)::int AS count
       FROM link_clicks WHERE clicked_at >= $1 AND link_id IS NOT NULL
       GROUP BY COALESCE(link_type,'direct') ORDER BY count DESC`,
      [startDate]
    ),
  ])
  const internalByDayRaw = internalByDayRes.rows
  const internalTopLinksRaw = internalTopLinksRes.rows
  const internalTopUploadersRaw = internalTopUploadersRes.rows
  const internalByQualityRaw = internalByQualityRes.rows
  const internalByMediaTypeRaw = internalByMediaTypeRes.rows
  const internalByLinkTypeRaw = internalByLinkTypeRes.rows


  // Build day buckets
  const byDayMap = new Map<string, { total: number; streaming: number; download: number }>()
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0]
    byDayMap.set(d, { total: 0, streaming: 0, download: 0 })
  }
  for (const row of viewsByDay as any[]) {
    if (byDayMap.has(row._id)) {
      byDayMap.get(row._id)!.total = row.total
      byDayMap.get(row._id)!.streaming = row.streaming
    }
  }
  // Add downloads per day
  const linkClicksDayRes = await pool.query(
    `SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS _id, count(*)::int AS count
     FROM link_clicks WHERE clicked_at >= $1 GROUP BY _id`,
    [startDate]
  )
  const linkClicksDay = linkClicksDayRes.rows
  for (const row of linkClicksDay as any[]) {
    if (byDayMap.has(row._id)) byDayMap.get(row._id)!.download = row.count
  }

  const viewsByDayFinal = Array.from(byDayMap.entries()).map(([date, v]) => ({
    date,
    count: v.total,
    streamingCount: v.streaming,
    downloadCount: v.download,
    formattedDate: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }))

  // Enrich top media (parallel TMDB + Live TV lookups)
  const channelIds = new Set<string>()
  for (const m of topMediaRaw as any[]) {
    if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length))
  }
  for (const m of topDownloadRaw as any[]) {
    if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length))
  }
  for (const m of activePagesRaw as any[]) {
    if (m._id?.startsWith?.("ww-live-")) channelIds.add(m._id.slice("ww-live-".length))
  }
  for (const v of recentVisitorsRaw as any[]) {
    if (v.ww_id?.startsWith?.("ww-live-")) channelIds.add(v.ww_id.slice("ww-live-".length))
  }

  // oidToUuid : ObjectId 24-hex → UUID dérivé (convention migration).
  const oidToUuid = (oidHex: string): string => {
    const h = oidHex.padEnd(32, "0")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
  }

  const channelMap = new Map<string, any>()
  if (channelIds.size > 0) {
    // live_tv_channels n'a pas de legacy_uuid : la migration a promu l'ancien
    // legacy_uuid au rang d'id. Le cid extrait du ww_id (ww-live-<cid>) est donc
    // soit déjà un uuid (= id), soit un ObjectId 24-hex (→ uuid dérivé).
    const rawIds = Array.from(channelIds)
    const uuids: string[] = []
    for (const cid of rawIds) {
      if (/^[0-9a-f-]{36}$/i.test(cid)) uuids.push(cid.toLowerCase())
      else if (/^[a-f0-9]{24}$/i.test(cid)) uuids.push(oidToUuid(cid.toLowerCase()))
    }
    if (uuids.length) {
      const r = await pool.query(
        `SELECT id, channel_name, channel_logo
         FROM live_tv_channels WHERE id = ANY($1::uuid[])`,
        [uuids]
      )
      for (const c of r.rows as any[]) {
        const entry = { title: c.channel_name, poster: c.channel_logo }
        if (c.id) {
          // Indexer par l'id ET par l'éventuel ObjectId source pour que
          // channelMap.get(cid) (cid = id brut du ww_id) retrouve l'entrée.
          channelMap.set(String(c.id), entry)
        }
      }
      // Indexer aussi par les cid d'origine (au cas où cid = ObjectId 24-hex).
      for (const cid of rawIds) {
        const derived = /^[a-f0-9]{24}$/i.test(cid) ? oidToUuid(cid.toLowerCase()) : cid.toLowerCase()
        const e = channelMap.get(derived)
        if (e) channelMap.set(cid, e)
      }
    }
  }

  // Digital lookups
  const digitalIds = new Set<string>()
  const collectDigitalIds = (ww: string | undefined | null) => {
    if (ww && /^ww-(ebook|music|soft|game)-/.test(ww)) digitalIds.add(ww)
  }
  for (const m of topMediaRaw as any[]) collectDigitalIds(m._id?.ww_id)
  for (const m of topDownloadRaw as any[]) collectDigitalIds(m._id?.ww_id)
  for (const p of activePagesRaw as any[]) collectDigitalIds(p._id)
  for (const v of recentVisitorsRaw as any[]) collectDigitalIds(v.ww_id)
  const digitalMap = new Map<string, any>()
  if (digitalIds.size > 0) {
    const r = await pool.query(
      `SELECT ww_id, title, cover_url, content_type
       FROM digital_content WHERE ww_id = ANY($1::text[])`,
      [Array.from(digitalIds)]
    )
    for (const d of r.rows as any[])
      digitalMap.set(d.ww_id, {
        title: d.title,
        poster: d.cover_url,
        content_type: d.content_type,
      })
  }

  const enrich = async (item: any, kind: "view" | "download") => {
    const wwId: string = item._id?.ww_id
    const mediaType: string = item._id?.media_type
    const tmdbId: number | null = item._id?.tmdb_id
    let title = wwId || "?"
    let poster: string | null = null

    if (wwId?.startsWith?.("ww-live-")) {
      const cid = wwId.slice("ww-live-".length)
      const ch = channelMap.get(cid) || channelMap.get(cid)
      title = ch?.title || "Chaîne TV"
      poster = ch?.poster || null
    } else if (wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)) {
      const dg = digitalMap.get(wwId)
      title = dg?.title || "Contenu Digital"
      poster = dg?.poster || null
    } else if (tmdbId && (mediaType === "movie" || mediaType === "tv")) {
      const tm = await fetchTmdb(mediaType, tmdbId)
      title = tm.title
      poster = tm.poster
    }

    return {
      tmdb_id: tmdbId,
      media_type: wwId?.startsWith?.("ww-live-")
        ? "live"
        : wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)
          ? "digital"
          : mediaType,
      ww_id: wwId,
      title,
      poster,
      ...(kind === "view" ? { views: item.views } : { downloads: item.downloads }),
    }
  }

  const topMedia = await Promise.all((topMediaRaw as any[]).map((m) => enrich(m, "view")))
  const topMediaDownload = await Promise.all(
    (topDownloadRaw as any[]).map((m) => enrich(m, "download"))
  )

  // Active pages enrichment
  const activePages = await Promise.all(
    (activePagesRaw as any[]).map(async (p) => {
      const wwId = p._id
      let title = wwId
      let poster: string | null = null
      let mediaType: string = p.media_type
      if (wwId?.startsWith?.("ww-live-")) {
        const ch = channelMap.get(wwId.slice("ww-live-".length))
        title = ch?.title || wwId
        poster = ch?.poster || null
        mediaType = "live"
      } else if (wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)) {
        const dg = digitalMap.get(wwId)
        title = dg?.title || "Contenu Digital"
        poster = dg?.poster || null
        mediaType = dg?.content_type || "digital"
      } else if (p.tmdb_id && (p.media_type === "movie" || p.media_type === "tv")) {
        const tm = await fetchTmdb(p.media_type, p.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      return { ww_id: wwId, count: p.count, media_type: mediaType, title, poster }
    })
  )

  const recentVisitorsSeen = new Set<string>()
  const recentVisitors = await Promise.all(
    (recentVisitorsRaw as any[])
      .filter((v) => {
        const k = v.ww_id || v.viewed_at
        if (recentVisitorsSeen.has(k)) return false
        recentVisitorsSeen.add(k)
        return true
      })
      .map(async (v) => {
        let title = v.ww_id || "N/A"
        let poster: string | null = null
        let mediaType = v.media_type || "?"
        if (v.ww_id?.startsWith?.("ww-live-")) {
          const ch = channelMap.get(v.ww_id.slice("ww-live-".length))
          title = ch?.title || v.ww_id
          poster = ch?.poster || null
          mediaType = "live"
        } else if (v.ww_id && /^ww-(ebook|music|soft|game)-/.test(v.ww_id)) {
          const dg = digitalMap.get(v.ww_id)
          title = dg?.title || "Contenu Digital"
          poster = dg?.poster || null
          mediaType = dg?.content_type || "digital"
        } else if (v.tmdb_id && (v.media_type === "movie" || v.media_type === "tv")) {
          const tm = await fetchTmdb(v.media_type, v.tmdb_id)
          title = tm.title
          poster = tm.poster
        }
        return {
          ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "…" : "Anonyme",
          viewed_at: v.viewed_at,
          ww_id: v.ww_id || "N/A",
          media_type: mediaType,
          title,
          poster,
        }
      })
  )

  // Format top referers — dedup by normalised hostname.
  // The upstream $group keys by the raw referrer URL, so the same site can
  // appear several times (different paths, protocols, ports, www. prefix,
  // FQDN trailing dot, mixed case, etc.). We collapse to bare hostname
  // (no protocol/path/port/www/trailing-dot) so each origin appears once.
  const normaliseReferer = (raw: any): string => {
    if (raw === null || raw === undefined) return "Direct"
    const s = String(raw).trim()
    if (!s || s.toLowerCase() === "direct" || s === "null" || s === "undefined") return "Direct"
    let host: string | null = null
    try {
      host = new URL(s).hostname
    } catch {
      // Fallback parser for malformed URLs (e.g. missing scheme, accidental
      // spaces). Strip everything to the first path/query character.
      host = s.replace(/^[a-z][a-z0-9+.\-]*:\/\//i, "").split(/[\/\?#]/)[0]
    }
    if (!host) return "Direct"
    host = host.toLowerCase()
    // Strip default ports
    host = host.replace(/:(80|443)$/, "")
    // Strip trailing dot (FQDN form: "example.com.")
    host = host.replace(/\.+$/, "")
    // Strip leading "www." so www.example.com and example.com merge
    host = host.replace(/^www\./, "")
    return host || "Direct"
  }
  const refererMerge = new Map<string, number>()
  for (const r of topRefererRaw as any[]) {
    const host = normaliseReferer(r._id)
    refererMerge.set(host, (refererMerge.get(host) || 0) + (r.count || 0))
  }
  const topReferers = Array.from(refererMerge.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)

  // External top media enrichment
  const externalTop = await Promise.all(
    (externalTopRaw as any[]).map((m) => enrich({ _id: m._id, downloads: m.clicks }, "download"))
  )

  // Top-media per source (movix / alt / zt / dark) with TMDB enrichment.
  const topMediaBySource: Record<string, any[]> = { movix: [], alt: [], zt: [], dark: [] }
  for (const bucket of externalTopBySourceRaw as any[]) {
    const src = bucket._id as string
    if (!topMediaBySource[src]) topMediaBySource[src] = []
    topMediaBySource[src] = await Promise.all(
      (bucket.items as any[]).map((it: any) =>
        enrich(
          { _id: { ww_id: it.ww_id, media_type: it.media_type, tmdb_id: it.tmdb_id }, downloads: it.clicks },
          "download"
        )
      )
    )
  }

  // Dense daily series per source (4 lines: movix / alt / zt / dark) for the
  // chart on the admin → Liens Externes tab.
  const sourceDayMap = new Map<string, { movix: number; alt: number; zt: number; dark: number }>()
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0]
    sourceDayMap.set(d, { movix: 0, alt: 0, zt: 0, dark: 0 })
  }
  for (const row of externalByDayBySourceRaw as any[]) {
    const d = row._id?.date
    const src = row._id?.source as keyof { movix: number; alt: number; zt: number; dark: number }
    if (!d || !sourceDayMap.has(d)) continue
    if (src !== "movix" && src !== "alt" && src !== "zt" && src !== "dark") continue
    const entry = sourceDayMap.get(d)!
    entry[src] = row.count
  }
  const byDayBySource = Array.from(sourceDayMap.entries()).map(([date, v]) => ({
    date,
    formattedDate: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    movix: v.movix,
    alt: v.alt,
    zt: v.zt,
    dark: v.dark,
  }))

  // External by-day fill
  const externalByDayMap = new Map<string, number>()
  for (let i = period - 1; i >= 0; i--) {
    externalByDayMap.set(new Date(now.getTime() - i * 86400000).toISOString().split("T")[0], 0)
  }
  for (const row of externalByDayRaw as any[]) {
    if (externalByDayMap.has(row._id)) externalByDayMap.set(row._id, row.count)
  }

  // -------- Internal-download enrichment: resolve link_id → link details --------
  const internalLinkIds = (internalTopLinksRaw as any[]).map((r) => r._id).filter(Boolean)
  const internalLinks: any[] = []
  if (internalLinkIds.length > 0) {
    // Reconstruction du document complet (colonnes + data jsonb) par id.
    // internalLinkIds sont des link_id (uuid stringifiés) = download_links.id.
    const [dlRes, ddlRes] = await Promise.all([
      pool.query(
        `SELECT (to_jsonb(t) - 'data' || COALESCE(t.data, '{}'::jsonb)) AS doc
         FROM download_links t WHERE id = ANY($1::uuid[])`,
        [internalLinkIds]
      ),
      pool.query(
        `SELECT (to_jsonb(t) - 'data' || COALESCE(t.data, '{}'::jsonb)) AS doc
         FROM digital_download_links t WHERE id = ANY($1::uuid[])`,
        [internalLinkIds]
      ),
    ])
    const dlRows = dlRes.rows.map((r: any) => r.doc)
    const ddlRows = ddlRes.rows.map((r: any) => r.doc)
    const linkMap = new Map<string, any>()
    // On indexe par id (le link_id de référence).
    for (const r of dlRows) {
      if (r?.id) linkMap.set(String(r.id), { ...r, _kind: "download" })
    }
    for (const r of ddlRows) {
      if (r?.id && !linkMap.has(String(r.id))) {
        linkMap.set(String(r.id), { ...r, _kind: "digital" })
      }
    }
    for (const r of internalTopLinksRaw as any[]) {
      const meta = linkMap.get(r._id)
      if (meta) internalLinks.push({ ...meta, link_id: r._id, clicks: r.clicks })
    }
  }

  // Resolve media titles for internal top links (TMDB + digital_content)
  const internalDigitalIds = new Set<string>()
  for (const l of internalLinks) {
    if (l.ww_id && /^ww-(ebook|music|soft|game)-/.test(l.ww_id)) internalDigitalIds.add(l.ww_id)
  }
  const internalDigitalMap = new Map<string, any>()
  if (internalDigitalIds.size > 0) {
    const digs = await pool.query(
      `SELECT ww_id, title, cover_url FROM digital_content WHERE ww_id = ANY($1::text[])`,
      [Array.from(internalDigitalIds)]
    )
    for (const d of digs.rows as any[]) internalDigitalMap.set(d.ww_id, { title: d.title, poster: d.cover_url })
  }

  const internalTopLinks = await Promise.all(
    internalLinks.map(async (l) => {
      let title = l.source_name || l.ww_id || "?"
      let poster: string | null = null
      if (l._kind === "digital") {
        const dg = l.ww_id ? internalDigitalMap.get(l.ww_id) : null
        title = dg?.title || title
        poster = dg?.poster || null
      } else if (l.tmdb_id && (l.media_type === "movie" || l.media_type === "tv")) {
        const tm = await fetchTmdb(l.media_type, l.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      return {
        link_id: l.link_id,
        ww_id: l.ww_id,
        kind: l._kind,
        title,
        poster,
        source_name: l.source_name,
        quality: l.quality || l.file_format || null,
        language: l.language,
        file_size: l.file_size,
        link_type: l.link_type,
        media_type: l.media_type || (l._kind === "digital" ? "digital" : null),
        season_number: l.season_number,
        episode_number: l.episode_number,
        submitted_by: l.submitted_by,
        status: l.status,
        clicks: l.clicks,
      }
    })
  )

  // Resolve uploader usernames for top uploaders
  const uploaderIds = (internalTopUploadersRaw as any[]).map((r) => r._id).filter(Boolean)
  const uploaderMap = new Map<string, { username: string; role: string }>()
  if (uploaderIds.length > 0) {
    // submitted_by est un uuid pointant vers users.id / profiles.id (pas de
    // legacy_uuid : migration → id). On résout via les deux tables par id.
    const uuids = uploaderIds.map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v)).map((v) => v.toLowerCase())
    if (uuids.length) {
      const [usersRes, profilesRes] = await Promise.all([
        pool.query(
          `SELECT id, COALESCE(username, data->>'username') AS username,
                  COALESCE(role, data->>'role') AS role
           FROM users WHERE id = ANY($1::uuid[])`,
          [uuids]
        ),
        pool.query(
          `SELECT id, COALESCE(username, data->>'username') AS username,
                  COALESCE(role, data->>'role') AS role
           FROM profiles WHERE id = ANY($1::uuid[])`,
          [uuids]
        ),
      ])
      for (const u of usersRes.rows as any[]) {
        if (u.id) uploaderMap.set(String(u.id), { username: u.username || "?", role: u.role || "member" })
      }
      for (const p of profilesRes.rows as any[]) {
        const k = p.id ? String(p.id) : null
        if (k && !uploaderMap.has(k)) uploaderMap.set(k, { username: p.username || "?", role: p.role || "member" })
      }
    }
  }

  const internalTopUploaders = (internalTopUploadersRaw as any[]).map((r) => {
    const meta = uploaderMap.get(r._id)
    return {
      user_id: r._id,
      username: meta?.username || "Inconnu",
      role: meta?.role || "?",
      clicks: r.clicks,
      linkCount: r.linkCount,
    }
  })

  // Internal by-day fill
  const internalByDayMap = new Map<string, number>()
  for (let i = period - 1; i >= 0; i--) {
    internalByDayMap.set(new Date(now.getTime() - i * 86400000).toISOString().split("T")[0], 0)
  }
  for (const row of internalByDayRaw as any[]) {
    if (internalByDayMap.has(row._id)) internalByDayMap.set(row._id, row.count)
  }

  return NextResponse.json({
    period,
    generated_at: new Date().toISOString(),
    detailed: {
      totalViews,
      totalStreamingViews,
      totalClicks: totalLinkClicks,
      totalAdClicks,
      uniqueVisitors: (uniqueIpsAgg as any[])[0]?.n || 0,
      avgViewsPerDay: period > 0 ? totalViews / period : 0,
      viewsByType: [
        { type: "Films", count: (viewsByType as any[]).find((x) => x._id === "movie")?.count || 0 },
        { type: "Séries", count: (viewsByType as any[]).find((x) => x._id === "tv")?.count || 0 },
        {
          type: "TV Live",
          count:
            (viewsByType as any[]).find((x) => x._id === "live")?.count ||
            0 + ((viewsByType as any[]).find((x) => x._id === "live_tv")?.count || 0),
        },
        { type: "Streaming", count: totalStreamingViews },
      ],
    },
    viewsByDay: viewsByDayFinal,
    topMedia,
    topMediaDownload,
    topReferers,
    online: {
      online5min: (online5 as number) || 0,
      online15min: (online15 as number) || 0,
      online1hour: (online1h as number) || 0,
      online24h: (online24h as number) || 0,
      activePages,
      recentVisitors,
    },
    external: {
      totalClicks: externalClicksRaw,
      totalClicksAllTime: totalExternalClicks,
      byDay: Array.from(externalByDayMap.entries()).map(([date, count]) => ({ date, count })),
      byProvider: (externalProvidersRaw as any[]).map((r) => ({ provider: r._id, count: r.count })),
      byHost: (externalHostsRaw as any[]).map((r) => ({ host: r._id, count: r.count })),
      byQuality: (externalQualityRaw as any[]).map((r) => ({ quality: r._id, count: r.count })),
      byMediaType: (externalMediaTypeRaw as any[]).map((r) => ({ type: r._id, count: r.count })),
      bySource: (externalBySourceRaw as any[]).map((r) => ({ source: r._id, count: r.count })),
      byDayBySource,
      topMediaBySource,
      topMedia: externalTop,
    },
    internal: {
      totalClicks: internalClicksRaw,
      totalClicksAllTime: totalInternalClicksAllTime,
      byDay: Array.from(internalByDayMap.entries()).map(([date, count]) => ({ date, count })),
      topLinks: internalTopLinks,
      topUploaders: internalTopUploaders,
      byQuality: (internalByQualityRaw as any[]).map((r) => ({ quality: r._id, count: r.count })),
      byMediaType: (internalByMediaTypeRaw as any[]).map((r) => ({ type: r._id, count: r.count })),
      byLinkType: (internalByLinkTypeRaw as any[]).map((r) => ({ link_type: r._id, count: r.count })),
    },
  })
}
