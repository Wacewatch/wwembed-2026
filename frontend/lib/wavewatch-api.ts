/**
 * Shared helpers for the public WaveWatch consumer API (/api/v1/download_links/*).
 *
 * Migration Mongo → PostgreSQL/TimescaleDB.
 *
 * Stratégie : on conserve l'interface "objet filtre style-Mongo" que les routes
 * utilisaient déjà ({ ...BASE_FILTER, quality, media_type, $or:[...] }), et on la
 * traduit en appels du shim pg fluent (lib/pg/shim) — lequel connaît le schéma
 * à l'exécution (colonne typée vs data jsonb) et gère la normalisation d'ID.
 * Aucun second moteur de traduction SQL à maintenir : tout passe par le shim
 * validé. Le SQL brut n'est utilisé que pour fetchUploaderMap ($or multi-branches
 * sur id/legacy_uuid) et distinctColumn (SELECT DISTINCT).
 *
 * Opérateurs d'objet-filtre supportés (sous-ensemble Mongo réellement utilisé) :
 *   - égalité directe          { quality: "1080p" }       → .eq
 *   - { $ne: v }               { is_active: { $ne: false }}→ .neq
 *   - { $in: [...] }           { submitted_by: {$in:[...]}}→ .in
 *   - { $gte / $lte / $gt / $lt }                         → .gte/.lte/.gt/.lt
 *   - { $exists: true/false }                             → .not("col","is",null) / .is(col,null)
 *   - $or: [ {a:rx}, {b:rx} ]  (regex insensible casse)   → .or("a.ilike.*q*,b.ilike.*q*")
 */
import { NextRequest, NextResponse } from "next/server"
import { createPgClient } from "@/lib/pg/shim"
import { getPool } from "@/lib/pg/db"

/**
 * Filtre de base WaveWatch (objet style-Mongo, traduit par applyFilter).
 * is_active != false (true/null OK — legacy peut omettre le champ)
 * status   = "approved"
 * is_valid != false (true/null OK — null = pas encore vérifié)
 */
export const BASE_FILTER: Record<string, any> = {
  is_active: { $ne: false },
  status: "approved",
  is_valid: { $ne: false },
}

export function unauthorized(reason = "Invalid or missing X-API-Key") {
  return NextResponse.json(
    { error: "Unauthorized", reason },
    { status: 401, headers: { "WWW-Authenticate": 'ApiKey realm="wwembed"' } }
  )
}

/**
 * Returns null on success; returns a NextResponse(401) when the key is bad.
 * Accepts the key in any of:
 *   - X-API-Key: <key>
 *   - Authorization: Bearer <key>
 *   - Authorization: ApiKey <key>
 *   - ?api_key=<key>  (last-resort, easier for ops smoke tests)
 */
export function requireApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.WAVEWATCH_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured", reason: "WAVEWATCH_API_KEY not set" },
      { status: 500 }
    )
  }
  const headerKey =
    req.headers.get("x-api-key") ||
    req.headers.get("X-API-Key") ||
    ""
  const authz = req.headers.get("authorization") || ""
  let bearerKey = ""
  if (authz) {
    const m = authz.match(/^\s*(Bearer|ApiKey)\s+(.+)\s*$/i)
    if (m) bearerKey = m[2].trim()
  }
  const queryKey = req.nextUrl.searchParams.get("api_key") || ""
  const provided = headerKey || bearerKey || queryKey
  if (!provided || provided !== expected) return unauthorized()
  return null
}

export const QUALITY_RANK: Record<string, number> = {
  "8k": 8, "4320p": 8, "4k": 7, "2160p": 7, "1440p": 6, "2k": 6,
  "1080p": 5, "fhd": 5, "720p": 4, "hd": 4, "576p": 3, "480p": 2,
  "sd": 2, "360p": 1, "240p": 0,
}

export function qualityRank(q: unknown): number {
  if (!q || typeof q !== "string") return -1
  return QUALITY_RANK[q.toLowerCase().trim()] ?? -1
}

export function compareQuality(a: any, b: any): number {
  return qualityRank(a?.quality) - qualityRank(b?.quality)
}

/** Public shape of a download_link item, per WaveWatch spec. */
export function normalizeLink(doc: any, uploaderMap: Map<string, any>): any {
  if (!doc) return doc
  const id = doc.id || doc._id?.toString?.() || null
  const submittedBy = doc.submitted_by ? String(doc.submitted_by) : null
  const uploader = submittedBy ? uploaderMap.get(submittedBy) : null
  return {
    id,
    tmdb_id: doc.tmdb_id ?? null,
    media_type: doc.media_type ?? null,
    ww_id: doc.ww_id ?? null,
    source_name: doc.source_name ?? null,
    source_url: doc.source_url ?? null,
    quality: doc.quality ?? null,
    resolution: doc.resolution ?? null,
    language: doc.language ?? null,
    release_name: doc.release_name ?? null,
    season_number: doc.season_number ?? null,
    episode_number: doc.episode_number ?? null,
    codec_video: doc.codec_video ?? null,
    codec_audio: doc.codec_audio ?? null,
    subtitle: doc.subtitle ?? null,
    file_size: doc.file_size ?? null,
    is_verified: doc.is_verified === true,
    created_at: doc.created_at ?? null,
    submitted_by: submittedBy,
    uploader_username: uploader?.username ?? null,
    uploader_role: uploader?.role ?? null,
  }
}

// ---------------------------------------------------------------------------
//  Helpers id : ObjectId 24-hex → UUID dérivé (même convention shim/migration)
// ---------------------------------------------------------------------------
function oidToUuid(oidHex: string): string {
  const h = oidHex.padEnd(32, "0")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// ---------------------------------------------------------------------------
//  Adaptateur : objet filtre style-Mongo → appels du shim fluent
// ---------------------------------------------------------------------------
/**
 * Escape un terme de recherche libre pour un motif ILIKE PostgREST.
 * On échappe les métacaractères LIKE (% et _) et on encadre de wildcards.
 */
function ilikeContains(term: string): string {
  const escaped = term.replace(/[%_]/g, (m) => "\\" + m)
  return `*${escaped}*`
}

/**
 * Applique un objet filtre style-Mongo sur une requête shim.
 * Retourne la requête (chaînable). Les opérateurs non reconnus sont ignorés
 * avec un warning (fail-safe : mieux vaut un filtre trop large qu'un crash).
 */
function applyFilter(query: any, filter: Record<string, any>): any {
  let q = query
  for (const [key, val] of Object.entries(filter || {})) {
    // $or : liste de { champ: regex } → ILIKE multi-colonnes (recherche texte).
    if (key === "$or" && Array.isArray(val)) {
      const branches: string[] = []
      for (const clause of val) {
        for (const [col, cond] of Object.entries(clause || {})) {
          // cond est une RegExp (recherche q) → on extrait sa source comme terme.
          let term: string | null = null
          if (cond instanceof RegExp) term = cond.source.replace(/\\(.)/g, "$1")
          else if (typeof cond === "string") term = cond
          if (term != null) branches.push(`${col}.ilike.${ilikeContains(term)}`)
        }
      }
      if (branches.length) q = q.or(branches.join(","))
      continue
    }
    // Opérateurs imbriqués { $ne, $in, $gte, ... }
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [op, opVal] of Object.entries(val)) {
        switch (op) {
          case "$ne": q = q.neq(key, opVal); break
          case "$in": q = q.in(key, opVal as any[]); break
          case "$gte": q = q.gte(key, opVal); break
          case "$lte": q = q.lte(key, opVal); break
          case "$gt": q = q.gt(key, opVal); break
          case "$lt": q = q.lt(key, opVal); break
          case "$exists":
            q = opVal ? q.not(key, "is", null) : q.is(key, null)
            break
          default:
            console.warn(`[wavewatch-api] applyFilter: opérateur non géré ${op} sur ${key}`)
        }
      }
      continue
    }
    // Égalité directe.
    q = q.eq(key, val)
  }
  return q
}

// ---------------------------------------------------------------------------
//  Résolution des profils (uploaders)
// ---------------------------------------------------------------------------
/**
 * Résout une liste d'ids `submitted_by` → profils { id, username, role }.
 * profiles.id est uuid et n'a pas de legacy_uuid (migration → id). submitted_by
 * est lui-même un uuid pointant vers profiles.id. On gère aussi un ObjectId
 * 24-hex hérité (→ uuid dérivé) par sécurité.
 */
async function resolveProfilesByIds(
  ids: string[]
): Promise<Array<{ id: string | null; username: string | null; role: string | null }>> {
  if (ids.length === 0) return []
  const uuids: string[] = []
  for (const id of ids) {
    if (/^[0-9a-f-]{36}$/i.test(id)) uuids.push(id.toLowerCase())
    else if (/^[a-f0-9]{24}$/i.test(id)) uuids.push(oidToUuid(id.toLowerCase()))
  }
  if (uuids.length === 0) return []
  const pool = getPool()
  const sql = `
    SELECT id,
           COALESCE(username, data->>'username') AS username,
           COALESCE(role,     data->>'role')     AS role
    FROM profiles
    WHERE id = ANY($1::uuid[])
  `
  try {
    const r = await pool.query(sql, [uuids])
    return r.rows
  } catch (e: any) {
    // Fallback si username/role n'existent pas comme colonnes typées.
    console.error("[wavewatch-api] resolveProfilesByIds typed-cols failed, jsonb-only:", e?.message)
    const sql2 = `
      SELECT id, data->>'username' AS username, data->>'role' AS role
      FROM profiles WHERE id = ANY($1::uuid[])
    `
    const r = await pool.query(sql2, [uuids])
    return r.rows
  }
}

/**
 * Resolve a batch of `submitted_by` ids → { username, role }.
 * Indexé à la fois par id (string) et legacy_uuid pour matcher quelle que soit
 * la forme de submitted_by stockée sur le download_link.
 */
export async function fetchUploaderMap(
  submittedBys: Array<string | null | undefined>
): Promise<Map<string, { username: string | null; role: string | null }>> {
  const ids = Array.from(new Set((submittedBys.filter(Boolean) as string[]).map(String)))
  const map = new Map<string, { username: string | null; role: string | null }>()
  if (ids.length === 0) return map
  const rows = await resolveProfilesByIds(ids)
  for (const d of rows) {
    const entry = { username: d.username ?? null, role: d.role ?? null }
    if (d.id) map.set(String(d.id), entry)
  }
  return map
}

/**
 * Resolve a username → list of profile ids it maps to.
 * profiles.id est uuid (pas de legacy_uuid). Utilisé par /download_links?uploader=.
 */
export async function resolveUploaderToIds(username: string): Promise<string[]> {
  if (!username) return []
  const pool = getPool()
  try {
    const r = await pool.query(
      `SELECT id FROM profiles
       WHERE username = $1 OR data->>'username' = $1`,
      [username]
    )
    const ids: string[] = []
    for (const d of r.rows) {
      if (d.id) ids.push(String(d.id))
    }
    return ids
  } catch (e: any) {
    console.error("[wavewatch-api] resolveUploaderToIds error:", e?.message)
    return []
  }
}

/**
 * Distinct des valeurs d'une colonne sur download_links, sous un objet filtre.
 * Remplace le `.distinct(col, BASE_FILTER)` Mongo. SQL brut (SELECT DISTINCT).
 */
export async function distinctColumn(
  table: string,
  column: string,
  filter: Record<string, any>
): Promise<any[]> {
  // On réutilise le shim pour matérialiser l'ensemble filtré, puis on déduplique
  // en JS — robuste vis-à-vis du schéma (colonne typée OU data->>) sans avoir à
  // savoir où vit `column`. Le volume distinct attendu est petit (media_type,
  // submitted_by) donc c'est sans impact.
  const supa = createPgClient()
  let q = supa.from(table).select("*")
  q = applyFilter(q, filter)
  const { data, error } = await q
  if (error) {
    console.error("[wavewatch-api] distinctColumn error:", error.message)
    return []
  }
  const seen = new Set<string>()
  const out: any[] = []
  for (const row of (Array.isArray(data) ? data : [])) {
    const v = (row as any)[column]
    const k = v == null ? "\u0000null" : typeof v === "object" ? JSON.stringify(v) : String(v)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

/**
 * Liste les uploaders (profils ayant au moins un download_link approuvé/actif).
 * Remplace le pipeline Mongo distinct(submitted_by, BASE_FILTER) → profiles.find($or).
 * Retourne [{ username, role }] trié par username (insensible casse).
 */
export async function listUploaders(): Promise<Array<{ username: string; role: string | null }>> {
  // 1) ids submitted_by distincts sur les liens actifs/approuvés.
  const rawIds = await distinctColumn("download_links", "submitted_by", BASE_FILTER)
  const ids = Array.from(
    new Set(rawIds.filter((v): v is string => Boolean(v)).map(String))
  )
  if (ids.length === 0) return []

  // 2) résolution des profils.
  const rows = await resolveProfilesByIds(ids)

  // 3) shape + tri stable insensible à la casse.
  const seen = new Set<string>()
  const uploaders: Array<{ username: string; role: string | null }> = []
  for (const d of rows) {
    const username = d.username ?? null
    if (!username) continue
    if (seen.has(username)) continue
    seen.add(username)
    uploaders.push({ username, role: d.role ?? null })
  }
  uploaders.sort((a, b) =>
    a.username.toLowerCase().localeCompare(b.username.toLowerCase())
  )
  return uploaders
}

/**
 * Convenience: query + enrich + normalize in one shot.
 * Signature d'origine restaurée (objet filtre style-Mongo). La traduction vers
 * le shim est faite par applyFilter.
 */
export async function queryDownloadLinks(opts: {
  filter: Record<string, any>
  sort?: Record<string, 1 | -1> | null
  limit?: number
  skip?: number
  sortByQuality?: "asc" | "desc" | null
}): Promise<{ items: any[]; total: number }> {
  const supa = createPgClient()

  // total : count exact avec les mêmes filtres.
  let countQ = supa.from("download_links").select("*", { count: "exact", head: true })
  countQ = applyFilter(countQ, opts.filter)
  const countRes = await countQ
  const total = countRes.count ?? 0

  // page : mêmes filtres + tri/pagination.
  let q = supa.from("download_links").select("*")
  q = applyFilter(q, opts.filter)
  if (opts.sort && Object.keys(opts.sort).length) {
    for (const [col, dir] of Object.entries(opts.sort)) {
      q = q.order(col, { ascending: dir === 1 })
    }
  }
  if (opts.skip != null && opts.limit != null) q = q.range(opts.skip, opts.skip + opts.limit - 1)
  else if (opts.limit != null) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) {
    console.error("[wavewatch-api] queryDownloadLinks error:", error.message)
    return { items: [], total }
  }
  let docs: any[] = Array.isArray(data) ? data : []

  if (opts.sortByQuality) {
    const dir = opts.sortByQuality === "asc" ? 1 : -1
    docs = docs.slice().sort((a, b) => dir * compareQuality(a, b))
  }

  const submittedBys = docs.map((d) => d.submitted_by)
  const uploaderMap = await fetchUploaderMap(submittedBys)
  const items = docs.map((d) => normalizeLink(d, uploaderMap))
  return { items, total }
}
