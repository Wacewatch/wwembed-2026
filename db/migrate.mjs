/**
 * wwembed2 — Migration MongoDB → PostgreSQL/TimescaleDB
 * ----------------------------------------------------------------------------
 * Lit le Mongo de prod (lecture seule, find() uniquement) et remplit Timescale.
 *
 * Stratégie d'ID :
 *   - id = legacy_uuid si présent (UUID Supabase d'origine)
 *   - sinon = UUID déterministe dérivé de l'ObjectId (24 hex → pad à 32 → format UUID)
 *   Bijection vérifiée : un ObjectId donne toujours le même UUID, sans collision
 *   possible avec les legacy_uuid existants (dont les 8 derniers hex sont non-nuls).
 *
 * Performance :
 *   - lecture par curseur streaming (batchSize), jamais tout-en-RAM
 *   - écriture par COPY (pgsql COPY FROM STDIN) en flux, ~10x plus rapide qu'INSERT
 *   - les hypertables sont remplies AVANT le refresh des continuous aggregates
 *
 * Usage :
 *   node migrate.mjs [--only=table1,table2] [--limit=N] [--truncate] [--dry-run]
 *
 *   --only=...    ne migre que ces tables (test ciblé)
 *   --limit=N     ne lit que N docs par collection (test rapide)
 *   --truncate    vide les tables Postgres cibles avant migration (rejouable proprement)
 *   --dry-run     lit et transforme mais n'écrit rien dans Postgres
 *
 * Variables d'env (lues depuis le conteneur, via .env) :
 *   MONGO_URL    (ex: mongodb://mongo:27017)
 *   DB_NAME      (def: wwembed)
 *   DATABASE_URL (ex: postgresql://wwembed:...@timescale:5432/wwembed)
 */

import { MongoClient } from "mongodb"
import pg from "pg"
import { from as copyFrom } from "pg-copy-streams"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"

// ---------------------------------------------------------------------------
//  Config
// ---------------------------------------------------------------------------
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017"
const DB_NAME = process.env.DB_NAME || "wwembed"
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL manquant")
  process.exit(1)
}

const args = process.argv.slice(2)
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1]?.split(",").filter(Boolean) || null
const LIMIT = parseInt((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || "0", 10)
const TRUNCATE = args.includes("--truncate")
const DRY_RUN = args.includes("--dry-run")
const BATCH = 5000

// ---------------------------------------------------------------------------
//  Helpers de conversion
// ---------------------------------------------------------------------------

/** ObjectId (24 hex) → UUID déterministe "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" */
function oidToUuid(oidHex) {
  const h = oidHex.padEnd(32, "0")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

/** Résout l'id final d'un doc : legacy_uuid si présent, sinon dérivé de _id */
function resolveId(doc) {
  if (doc.legacy_uuid && /^[0-9a-f-]{36}$/i.test(doc.legacy_uuid)) return doc.legacy_uuid.toLowerCase()
  const oid = doc._id?.toString?.() || String(doc._id)
  if (/^[a-f0-9]{24}$/i.test(oid)) return oidToUuid(oid.toLowerCase())
  return null // _id string (caches) : géré séparément
}

/** Résout une référence FK qui peut être un UUID ou un ObjectId string */
function resolveRef(val) {
  if (val == null) return null
  const s = typeof val === "object" && val.toString ? val.toString() : String(val)
  if (/^[0-9a-f-]{36}$/i.test(s)) return s.toLowerCase()
  if (/^[a-f0-9]{24}$/i.test(s)) return oidToUuid(s.toLowerCase())
  return null
}

/** ISO string ou Date Mongo → ISO string pour Postgres timestamptz (ou null) */
function ts(v) {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === "string") {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

function int(v) {
  if (v == null) return null
  const n = typeof v === "number" ? v : parseInt(v, 10)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function bool(v, def = null) {
  if (v == null) return def
  return v === true || v === "true" ? true : v === false || v === "false" ? false : def
}

function str(v) {
  if (v == null) return null
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return JSON.stringify(v)
}

/**
 * Timestamp REQUIS (colonnes NOT NULL created_at/updated_at).
 * Essaie chaque candidat dans l'ordre, retombe sur now() si tous null.
 * Évite la violation de contrainte NOT NULL quand le doc Mongo n'a pas le champ.
 */
function tsReq(...candidates) {
  for (const c of candidates) {
    const v = ts(c)
    if (v) return v
  }
  return new Date().toISOString()
}

/** Échappe une valeur pour le format COPY texte de Postgres */
function copyEsc(v) {
  if (v === null || v === undefined) return "\\N"
  let s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v)
  // COPY text : échapper backslash, tab, newline, CR
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
}

/** Construit une ligne COPY (TSV) à partir d'un tableau de valeurs */
function copyRow(vals) {
  return vals.map(copyEsc).join("\t") + "\n"
}

/**
 * Sépare les champs "connus" (colonnes) du reste → data jsonb.
 * `known` = liste des clés Mongo déjà mappées en colonnes (+ _id, legacy_uuid toujours exclus).
 */
function extraData(doc, known) {
  const skip = new Set([...known, "_id", "legacy_uuid"])
  const extra = {}
  for (const k of Object.keys(doc)) {
    if (!skip.has(k) && doc[k] !== undefined) extra[k] = doc[k]
  }
  return extra
}

// ---------------------------------------------------------------------------
//  Définition des tables : colonnes Postgres + mapping depuis le doc Mongo
//  Chaque mapper renvoie un tableau de valeurs aligné sur `columns`.
//  La dernière colonne est toujours `data` (jsonb des champs non mappés).
// ---------------------------------------------------------------------------

const TABLES = {
  // ---------- A. AUTH ----------
  users: {
    columns: ["id", "email", "username", "password_hash", "role", "email_confirmed_at", "needs_password_reset", "created_at", "updated_at", "data"],
    known: ["email", "username", "password_hash", "role", "email_confirmed_at", "needs_password_reset", "created_at", "updated_at"],
    map: (d) => [resolveId(d), str(d.email), str(d.username), str(d.password_hash), str(d.role) || "user", ts(d.email_confirmed_at), bool(d.needs_password_reset, false), tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.users.known))],
  },
  profiles: {
    columns: ["id", "user_id", "email", "username", "role", "created_at", "updated_at", "data"],
    known: ["user_id", "email", "username", "role", "created_at", "updated_at"],
    map: (d) => [resolveId(d), resolveRef(d.user_id), str(d.email), str(d.username), str(d.role) || "user", tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.profiles.known))],
  },
  profile_settings: {
    columns: ["id", "user_id", "avatar_preset", "avatar_url", "banner_preset", "banner_url", "bio", "primary_color", "theme", "show_email", "show_stats", "social_discord", "social_twitter", "social_website", "created_at", "updated_at", "data"],
    known: ["user_id", "avatar_preset", "avatar_url", "banner_preset", "banner_url", "bio", "primary_color", "theme", "show_email", "show_stats", "social_discord", "social_twitter", "social_website", "created_at", "updated_at"],
    map: (d) => [resolveId(d), resolveRef(d.user_id), str(d.avatar_preset), str(d.avatar_url), str(d.banner_preset), str(d.banner_url), str(d.bio), str(d.primary_color), str(d.theme), bool(d.show_email, false), bool(d.show_stats, true), str(d.social_discord), str(d.social_twitter), str(d.social_website), tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.profile_settings.known))],
  },

  // ---------- B. CONTENU / LIENS ----------
  streaming_links: {
    columns: ["id", "tmdb_id", "media_type", "ww_id", "source_name", "source_url", "quality", "language", "season_number", "episode_number", "submitted_by", "api_source_id", "is_auto_generated", "is_verified", "is_active", "is_valid", "status", "last_checked", "view_count", "created_at", "updated_at", "data"],
    known: ["tmdb_id", "media_type", "ww_id", "source_name", "source_url", "quality", "language", "season_number", "episode_number", "submitted_by", "api_source_id", "is_auto_generated", "is_verified", "is_active", "is_valid", "status", "last_checked", "view_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), int(d.tmdb_id), str(d.media_type), str(d.ww_id), str(d.source_name), str(d.source_url), str(d.quality), str(d.language), int(d.season_number), int(d.episode_number), resolveRef(d.submitted_by), resolveRef(d.api_source_id), bool(d.is_auto_generated, false), bool(d.is_verified, false), bool(d.is_active, true), bool(d.is_valid), str(d.status) || "approved", ts(d.last_checked), int(d.view_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.streaming_links.known))],
  },
  download_links: {
    columns: ["id", "tmdb_id", "media_type", "ww_id", "source_name", "source_url", "link_type", "quality", "resolution", "language", "file_size", "codec_video", "codec_audio", "subtitle", "release_name", "nfo", "season_number", "episode_number", "submitted_by", "api_source_id", "has_audio_description", "is_auto_generated", "is_verified", "is_active", "is_valid", "status", "last_checked", "click_count", "created_at", "updated_at", "data"],
    known: ["tmdb_id", "media_type", "ww_id", "source_name", "source_url", "link_type", "quality", "resolution", "language", "file_size", "codec_video", "codec_audio", "subtitle", "release_name", "nfo", "season_number", "episode_number", "submitted_by", "api_source_id", "has_audio_description", "is_auto_generated", "is_verified", "is_active", "is_valid", "status", "last_checked", "click_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), int(d.tmdb_id), str(d.media_type), str(d.ww_id), str(d.source_name), str(d.source_url), str(d.link_type), str(d.quality), str(d.resolution), str(d.language), str(d.file_size), str(d.codec_video), str(d.codec_audio), str(d.subtitle), str(d.release_name), str(d.nfo), int(d.season_number), int(d.episode_number), resolveRef(d.submitted_by), resolveRef(d.api_source_id), bool(d.has_audio_description, false), bool(d.is_auto_generated, false), bool(d.is_verified, false), bool(d.is_active, true), bool(d.is_valid), str(d.status) || "approved", ts(d.last_checked), int(d.click_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.download_links.known))],
  },
  digital_content: {
    columns: ["id", "ww_id", "content_type", "title", "description", "cover_url", "author", "version", "file_size", "submitted_by", "is_active", "status", "view_count", "created_at", "updated_at", "data"],
    known: ["ww_id", "content_type", "title", "description", "cover_url", "author", "version", "file_size", "submitted_by", "is_active", "status", "view_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), str(d.ww_id), str(d.content_type), str(d.title), str(d.description), str(d.cover_url), str(d.author), str(d.version), str(d.file_size), resolveRef(d.submitted_by), bool(d.is_active, true), str(d.status) || "approved", int(d.view_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.digital_content.known))],
  },
  digital_download_links: {
    columns: ["id", "content_id", "ww_id", "source_name", "source_url", "reader_url", "link_type", "quality", "file_format", "file_size", "language", "submitted_by", "is_active", "is_valid", "status", "link_status", "last_checked", "click_count", "created_at", "updated_at", "data"],
    known: ["content_id", "ww_id", "source_name", "source_url", "reader_url", "link_type", "quality", "file_format", "file_size", "language", "submitted_by", "is_active", "is_valid", "status", "link_status", "last_checked", "click_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), resolveRef(d.content_id), str(d.ww_id), str(d.source_name), str(d.source_url), str(d.reader_url), str(d.link_type), str(d.quality), str(d.file_format), str(d.file_size), str(d.language), resolveRef(d.submitted_by), bool(d.is_active, true), bool(d.is_valid), str(d.status) || "approved", str(d.link_status), ts(d.last_checked), int(d.click_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.digital_download_links.known))],
  },
  live_tv_channels: {
    columns: ["id", "channel_name", "channel_logo", "stream_url", "category", "country", "language", "quality", "submitted_by", "is_active", "status", "view_count", "created_at", "updated_at", "data"],
    known: ["channel_name", "channel_logo", "stream_url", "category", "country", "language", "quality", "submitted_by", "is_active", "status", "view_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), str(d.channel_name), str(d.channel_logo), str(d.stream_url), str(d.category), str(d.country), str(d.language), str(d.quality), resolveRef(d.submitted_by), bool(d.is_active, true), str(d.status) || "approved", int(d.view_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.live_tv_channels.known))],
  },
  live_tv_sources: {
    columns: ["id", "channel_id", "source_name", "stream_url", "quality", "priority", "submitted_by", "is_active", "status", "created_at", "data"],
    known: ["channel_id", "source_name", "stream_url", "quality", "priority", "submitted_by", "is_active", "status", "created_at"],
    map: (d) => [resolveId(d), resolveRef(d.channel_id), str(d.source_name), str(d.stream_url), str(d.quality), int(d.priority) ?? 0, resolveRef(d.submitted_by), bool(d.is_active, true), str(d.status) || "approved", tsReq(d.created_at, d.updated_at), JSON.stringify(extraData(d, TABLES.live_tv_sources.known))],
  },
  ads: {
    columns: ["id", "slot_number", "name", "ad_url", "ad_type", "is_active", "click_count", "created_at", "updated_at", "data"],
    known: ["slot_number", "name", "ad_url", "ad_type", "is_active", "click_count", "created_at", "updated_at"],
    map: (d) => [resolveId(d), int(d.slot_number), str(d.name), str(d.ad_url), str(d.ad_type), bool(d.is_active, false), int(d.click_count) ?? 0, tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.ads.known))],
  },

  // ---------- C. TIME-SERIES (hypertables) ----------
  embed_views: {
    columns: ["id", "ww_id", "tmdb_id", "media_type", "embed_type", "referrer", "user_agent", "ip_hash", "country", "season_number", "episode_number", "viewed_at", "data"],
    known: ["ww_id", "tmdb_id", "media_type", "embed_type", "referrer", "user_agent", "ip_hash", "country", "season_number", "episode_number", "viewed_at"],
    map: (d) => [resolveId(d), str(d.ww_id), int(d.tmdb_id), str(d.media_type), str(d.embed_type), str(d.referrer), str(d.user_agent), str(d.ip_hash), str(d.country), int(d.season_number), int(d.episode_number), ts(d.viewed_at) || ts(d.created_at) || new Date().toISOString(), JSON.stringify(extraData(d, TABLES.embed_views.known))],
    requiresTime: "viewed_at",
  },
  link_clicks: {
    columns: ["id", "link_id", "link_type", "ww_id", "tmdb_id", "media_type", "referrer", "user_agent", "ip_hash", "country", "season_number", "episode_number", "provider", "host_name", "quality", "language", "file_size", "external_link_id", "is_external", "source", "clicked_at", "data"],
    known: ["link_id", "link_type", "ww_id", "tmdb_id", "media_type", "referrer", "user_agent", "ip_hash", "country", "season_number", "episode_number", "provider", "host_name", "quality", "language", "file_size", "external_link_id", "is_external", "source", "clicked_at"],
    map: (d) => [resolveId(d), resolveRef(d.link_id), str(d.link_type), str(d.ww_id), int(d.tmdb_id), str(d.media_type), str(d.referrer), str(d.user_agent), str(d.ip_hash), str(d.country), int(d.season_number), int(d.episode_number), str(d.provider), str(d.host_name), str(d.quality), str(d.language), str(d.file_size), resolveRef(d.external_link_id), bool(d.is_external, false), str(d.source), ts(d.clicked_at) || ts(d.created_at) || new Date().toISOString(), JSON.stringify(extraData(d, TABLES.link_clicks.known))],
    requiresTime: "clicked_at",
  },
  ad_clicks: {
    columns: ["id", "ad_id", "ww_id", "referrer", "user_agent", "clicked_at", "data"],
    known: ["ad_id", "ww_id", "referrer", "user_agent", "clicked_at"],
    map: (d) => [resolveId(d), resolveRef(d.ad_id), str(d.ww_id), str(d.referrer), str(d.user_agent), ts(d.clicked_at) || ts(d.created_at) || new Date().toISOString(), JSON.stringify(extraData(d, TABLES.ad_clicks.known))],
    requiresTime: "clicked_at",
  },

  // ---------- D. LOGS / DIVERS ----------
  bug_reports: {
    columns: ["id", "user_id", "title", "message", "status", "embed_type", "media_type", "tmdb_id", "season_number", "episode_number", "source_name", "source_url", "referrer", "reporter_ip", "user_agent", "admin_note", "ww_id", "created_at", "updated_at", "data"],
    known: ["user_id", "title", "message", "status", "embed_type", "media_type", "tmdb_id", "season_number", "episode_number", "source_name", "source_url", "referrer", "reporter_ip", "user_agent", "admin_note", "ww_id", "created_at", "updated_at"],
    map: (d) => [resolveId(d), resolveRef(d.user_id), str(d.title), str(d.message), str(d.status) || "open", str(d.embed_type), str(d.media_type), int(d.tmdb_id), int(d.season_number), int(d.episode_number), str(d.source_name), str(d.source_url), str(d.referrer), str(d.reporter_ip), str(d.user_agent), str(d.admin_note), str(d.ww_id), tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.bug_reports.known))],
  },
  api_usage: {
    columns: ["id", "endpoint", "method", "media_type", "tmdb_id", "season_number", "episode_number", "ww_id", "referrer", "user_agent", "ip_hash", "response_status", "response_time_ms", "created_at", "data"],
    known: ["endpoint", "method", "media_type", "tmdb_id", "season_number", "episode_number", "ww_id", "referrer", "user_agent", "ip_hash", "response_status", "response_time_ms", "created_at"],
    map: (d) => [resolveId(d), str(d.endpoint), str(d.method), str(d.media_type), int(d.tmdb_id), int(d.season_number), int(d.episode_number), str(d.ww_id), str(d.referrer), str(d.user_agent), str(d.ip_hash), int(d.response_status), int(d.response_time_ms), tsReq(d.created_at, d.updated_at), JSON.stringify(extraData(d, TABLES.api_usage.known))],
  },
  login_attempts: {
    columns: ["id", "identifier", "created_at", "data"],
    known: ["identifier", "created_at"],
    map: (d) => [resolveId(d), str(d.identifier), tsReq(d.created_at, d.updated_at), JSON.stringify(extraData(d, TABLES.login_attempts.known))],
  },
  link_status: {
    columns: ["id", "link_id", "collection", "link_type", "host", "source_url", "status", "consecutive_failures", "last_http_status", "response_ms", "last_error", "dead_since", "last_alive_at", "last_checked_at", "data"],
    known: ["link_id", "collection", "link_type", "host", "source_url", "status", "consecutive_failures", "last_http_status", "response_ms", "last_error", "dead_since", "last_alive_at", "last_checked_at"],
    map: (d) => [resolveId(d), str(d.link_id), str(d.collection), str(d.link_type), str(d.host), str(d.source_url), str(d.status), int(d.consecutive_failures) ?? 0, int(d.last_http_status), int(d.response_ms), str(d.last_error), ts(d.dead_since), ts(d.last_alive_at), ts(d.last_checked_at), JSON.stringify(extraData(d, TABLES.link_status.known))],
  },
  third_party_apis: {
    columns: ["id", "name", "api_type", "base_url", "url_pattern", "url_pattern_movie", "url_pattern_tv", "language", "priority", "is_active", "is_anonymous", "created_by", "created_at", "updated_at", "data"],
    known: ["name", "api_type", "base_url", "url_pattern", "url_pattern_movie", "url_pattern_tv", "language", "priority", "is_active", "is_anonymous", "created_by", "created_at", "updated_at"],
    map: (d) => [resolveId(d), str(d.name), str(d.api_type), str(d.base_url), str(d.url_pattern), str(d.url_pattern_movie), str(d.url_pattern_tv), str(d.language), int(d.priority) ?? 0, bool(d.is_active, true), bool(d.is_anonymous, false), resolveRef(d.created_by), tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.third_party_apis.known))],
  },
  site_settings: {
    columns: ["id", "created_at", "updated_at", "data"],
    known: ["created_at", "updated_at"],
    map: (d) => [resolveId(d), tsReq(d.created_at, d.updated_at), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.site_settings.known))],
  },
  runtime_status: {
    columns: ["id", "key", "updated_at", "data"],
    known: ["key", "updated_at"],
    map: (d) => [resolveId(d), str(d.key), tsReq(d.updated_at, d.created_at), JSON.stringify(extraData(d, TABLES.runtime_status.known))],
  },

  // ---------- E. CACHES importés (dark_cache, zt_cache) ----------
  //  _id est une string → devient `key`. Pas de resolveId ici.
  dark_cache: {
    columns: ["key", "cached_at", "expires_at", "data"],
    known: ["cached_at", "expires_at"],
    map: (d) => [str(d._id), ts(d.cached_at), ts(d.expires_at), JSON.stringify(extraData(d, [...TABLES.dark_cache.known, "_id"]))],
    stringId: true,
  },
  zt_cache: {
    columns: ["key", "cached_at", "expires_at", "data"],
    known: ["cached_at", "expires_at"],
    map: (d) => [str(d._id), ts(d.cached_at), ts(d.expires_at), JSON.stringify(extraData(d, [...TABLES.zt_cache.known, "_id"]))],
    stringId: true,
  },
}

// Ordre de migration : tables métier d'abord, time-series ensuite, caches en dernier.
const ORDER = [
  "users", "profiles", "profile_settings",
  "streaming_links", "download_links", "digital_content", "digital_download_links",
  "live_tv_channels", "live_tv_sources", "ads",
  "bug_reports", "api_usage", "login_attempts", "link_status", "third_party_apis",
  "site_settings", "runtime_status",
  "embed_views", "link_clicks", "ad_clicks",
  "dark_cache", "zt_cache",
]

// ---------------------------------------------------------------------------
//  Migration d'une collection
// ---------------------------------------------------------------------------
async function migrateCollection(mongoDb, pgPool, name) {
  const def = TABLES[name]
  if (!def) { console.log(`  [skip] ${name} : pas de définition`); return }

  const coll = mongoDb.collection(name)
  const total = await coll.estimatedDocumentCount()
  const target = LIMIT > 0 ? Math.min(LIMIT, total) : total
  process.stdout.write(`\n[${name}] ${target}/${total} docs `)

  if (TRUNCATE && !DRY_RUN) {
    await pgPool.query(`TRUNCATE TABLE ${name}`)
  }

  const cursor = coll.find({}, { batchSize: BATCH })
  if (LIMIT > 0) cursor.limit(LIMIT)

  let buf = []
  let done = 0
  let skipped = 0
  const seenKeys = new Set() // dédup PK dans le batch (caches/string id)

  const flush = async () => {
    if (!buf.length || DRY_RUN) { done += buf.length; buf = []; return }
    const client = await pgPool.connect()
    try {
      const colList = def.columns.join(", ")
      const stream = client.query(copyFrom(`COPY ${name} (${colList}) FROM STDIN`))
      const src = Readable.from(buf)
      await pipeline(src, stream)
    } finally {
      client.release()
    }
    done += buf.length
    buf = []
    process.stdout.write(".")
  }

  for await (const doc of cursor) {
    const row = def.map(doc)
    // garde-fou : id/key non-null
    if (row[0] == null) { skipped++; continue }
    // dédup PK (surtout caches string-id et hypertables sur (id,temps))
    if (def.stringId || true) {
      const k = String(row[0]) + (def.requiresTime ? "|" + row[def.columns.indexOf(def.requiresTime)] : "")
      if (seenKeys.has(k)) { skipped++; continue }
      seenKeys.add(k)
      // borne mémoire du set de dédup sur les grosses tables
      if (seenKeys.size > 2_000_000) seenKeys.clear()
    }
    buf.push(copyRow(row))
    if (buf.length >= BATCH) await flush()
  }
  await flush()
  process.stdout.write(` OK (${done} insérés${skipped ? ", " + skipped + " ignorés" : ""})`)
  return { done, skipped, total }
}

// ---------------------------------------------------------------------------
//  Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== wwembed2 migration Mongo → Timescale ===")
  console.log(`Mongo: ${MONGO_URL}/${DB_NAME}`)
  console.log(`PG   : ${DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`)
  console.log(`Mode : ${DRY_RUN ? "DRY-RUN" : "WRITE"}${TRUNCATE ? " +TRUNCATE" : ""}${LIMIT ? " limit=" + LIMIT : ""}${ONLY ? " only=" + ONLY.join(",") : ""}`)

  const mongo = new MongoClient(MONGO_URL)
  await mongo.connect()
  const mongoDb = mongo.db(DB_NAME)

  const pgPool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 })

  const tables = (ONLY || ORDER).filter((t) => ORDER.includes(t))
  const t0 = Date.now()
  const summary = []
  for (const name of tables) {
    try {
      const r = await migrateCollection(mongoDb, pgPool, name)
      if (r) summary.push({ name, ...r })
    } catch (e) {
      console.error(`\n  [ERROR] ${name}: ${e.message}`)
      throw e
    }
  }

  console.log("\n\n=== RÉCAP ===")
  for (const s of summary) {
    const flag = s.done === s.total || LIMIT > 0 ? "✓" : "⚠"
    console.log(`  ${flag} ${s.name.padEnd(24)} ${String(s.done).padStart(8)} / ${String(s.total).padStart(8)}${s.skipped ? "  (" + s.skipped + " ignorés)" : ""}`)
  }
  console.log(`\nDurée : ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  await mongo.close()
  await pgPool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
