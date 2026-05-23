-- ============================================================================
--  wwembed2 — Schéma PostgreSQL 16 + TimescaleDB 2.17
--  Migration depuis MongoDB (remplacement complet).
--
--  CONVENTIONS
--   - id            : uuid. Provient de `legacy_uuid` (Supabase d'origine) si présent,
--                     sinon dérivé de l'ObjectId Mongo (voir migrate.mjs). Toujours non-null.
--   - timestamps    : timestamptz. Les ISO strings Mongo ("+00:00" et "Z") sont
--                     parsés nativement par Postgres au chargement.
--   - data jsonb    : fourre-tout. Absorbe tout champ non explicitement colonné,
--                     garantissant zéro perte de données quel que soit le doc source.
--   - compteurs     : integer DEFAULT 0 (jamais null, pour que les $inc/UPDATE marchent).
--
--  FAMILLES DE TABLES
--   A. Auth / utilisateurs        : users, profiles, profile_settings
--   B. Contenu / liens (métier)   : streaming_links, download_links, digital_content,
--                                    digital_download_links, live_tv_channels,
--                                    live_tv_sources, ads
--   C. Time-series (HYPERTABLES)  : embed_views, link_clicks, ad_clicks
--   D. Logs / divers              : bug_reports, api_usage, login_attempts,
--                                    link_status, third_party_apis,
--                                    site_settings, runtime_status
--   E. Caches (recréés vides)     : tmdb_cache, geo_ip_cache
--      Caches importés            : dark_cache, zt_cache
--
--  Rejouable : IF NOT EXISTS / CREATE OR REPLACE partout.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;  -- approx_count_distinct (hyperloglog) pour les visiteurs uniques


-- ============================================================================
--  A. AUTH / UTILISATEURS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  username              text,
  password_hash         text,
  role                  text NOT NULL DEFAULT 'user',
  email_confirmed_at    timestamptz,
  needs_password_reset  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  data                  jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx    ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uidx ON users (lower(username)) WHERE username IS NOT NULL;

-- profiles : 1:1 avec users. En Mongo, profiles._id == users._id, et profiles.user_id
-- est un ObjectId pointant users._id. On aligne profiles.id sur users.id.
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY,
  user_id     uuid,
  email       text,
  username    text,
  role        text NOT NULL DEFAULT 'user',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_user_id_idx  ON profiles (user_id);

CREATE TABLE IF NOT EXISTS profile_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  avatar_preset   text,
  avatar_url      text,
  banner_preset   text,
  banner_url      text,
  bio             text,
  primary_color   text,
  theme           text,
  show_email      boolean NOT NULL DEFAULT false,
  show_stats      boolean NOT NULL DEFAULT true,
  social_discord  text,
  social_twitter  text,
  social_website  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS profile_settings_user_id_idx ON profile_settings (user_id);


-- ============================================================================
--  B. CONTENU / LIENS (métier)
-- ============================================================================

CREATE TABLE IF NOT EXISTS streaming_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id           integer,
  media_type        text,
  ww_id             text,
  source_name       text,
  source_url        text,
  quality           text,
  language          text,
  season_number     integer,
  episode_number    integer,
  submitted_by      uuid,
  api_source_id     uuid,
  is_auto_generated boolean NOT NULL DEFAULT false,
  is_verified       boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  is_valid          boolean,
  status            text DEFAULT 'approved',
  last_checked      timestamptz,
  view_count        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  data              jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS streaming_links_tmdb_idx   ON streaming_links (tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS streaming_links_ww_id_idx  ON streaming_links (ww_id);
CREATE INDEX IF NOT EXISTS streaming_links_status_idx ON streaming_links (status, is_active);

CREATE TABLE IF NOT EXISTS download_links (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id               integer,
  media_type            text,
  ww_id                 text,
  source_name           text,
  source_url            text,
  link_type             text,
  quality               text,
  resolution            text,
  language              text,
  file_size             text,          -- mixte en Mongo (string/null), normalisé en text
  codec_video           text,
  codec_audio           text,
  subtitle              text,
  release_name          text,
  nfo                   text,
  season_number         integer,
  episode_number        integer,
  submitted_by          uuid,
  api_source_id         uuid,
  has_audio_description boolean NOT NULL DEFAULT false,
  is_auto_generated     boolean NOT NULL DEFAULT false,
  is_verified           boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  is_valid              boolean,
  status                text DEFAULT 'approved',
  last_checked          timestamptz,
  click_count           integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  data                  jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS download_links_tmdb_idx   ON download_links (tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS download_links_ww_id_idx  ON download_links (ww_id);
CREATE INDEX IF NOT EXISTS download_links_status_idx ON download_links (status, is_active);

CREATE TABLE IF NOT EXISTS digital_content (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ww_id         text,
  content_type  text,
  title         text,
  description   text,
  cover_url     text,
  author        text,
  version       text,
  file_size     text,
  submitted_by  uuid,
  is_active     boolean NOT NULL DEFAULT true,
  status        text DEFAULT 'approved',
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  data          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS digital_content_ww_id_uidx ON digital_content (ww_id);
CREATE INDEX IF NOT EXISTS digital_content_type_idx ON digital_content (content_type);

CREATE TABLE IF NOT EXISTS digital_download_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    uuid,
  ww_id         text,
  source_name   text,
  source_url    text,
  reader_url    text,
  link_type     text,
  quality       text,
  file_format   text,
  file_size     text,
  language      text,
  submitted_by  uuid,
  is_active     boolean NOT NULL DEFAULT true,
  is_valid      boolean,
  status        text DEFAULT 'approved',
  link_status   text,
  last_checked  timestamptz,
  click_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  data          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS digital_dl_content_idx ON digital_download_links (content_id);
CREATE INDEX IF NOT EXISTS digital_dl_ww_id_idx   ON digital_download_links (ww_id);

CREATE TABLE IF NOT EXISTS live_tv_channels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name  text,
  channel_logo  text,
  stream_url    text,
  category      text,
  country       text,
  language      text,
  quality       text,
  submitted_by  uuid,
  is_active     boolean NOT NULL DEFAULT true,
  status        text DEFAULT 'approved',
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  data          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS live_tv_channels_status_idx ON live_tv_channels (status, is_active);

CREATE TABLE IF NOT EXISTS live_tv_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    uuid,
  source_name   text,
  stream_url    text,
  quality       text,
  priority      integer NOT NULL DEFAULT 0,
  submitted_by  uuid,
  is_active     boolean NOT NULL DEFAULT true,
  status        text DEFAULT 'approved',
  created_at    timestamptz NOT NULL DEFAULT now(),
  data          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS live_tv_sources_channel_idx ON live_tv_sources (channel_id);

CREATE TABLE IF NOT EXISTS ads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number  integer,
  name         text,
  ad_url       text,
  ad_type      text,
  is_active    boolean NOT NULL DEFAULT false,
  click_count  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  data         jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS ads_slot_uidx ON ads (slot_number) WHERE slot_number IS NOT NULL;


-- ============================================================================
--  C. TIME-SERIES — HYPERTABLES
--  Pas de PK uuid classique : la PK inclut la colonne temps (contrainte Timescale).
--  On garde `id uuid` comme identifiant logique mais la clé primaire est (id, <temps>).
-- ============================================================================

-- ---- embed_views (4.9M docs) -----------------------------------------------
CREATE TABLE IF NOT EXISTS embed_views (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  ww_id           text,
  tmdb_id         integer,
  media_type      text,
  embed_type      text,
  referrer        text,
  user_agent      text,
  ip_hash         text,
  country         text,
  season_number   integer,
  episode_number  integer,
  viewed_at       timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, viewed_at)
);
SELECT create_hypertable('embed_views', 'viewed_at',
  chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS embed_views_wwid_time_idx ON embed_views (ww_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS embed_views_type_time_idx ON embed_views (embed_type, viewed_at DESC);

-- ---- link_clicks (74k docs) ------------------------------------------------
CREATE TABLE IF NOT EXISTS link_clicks (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  link_id          uuid,
  link_type        text,
  ww_id            text,
  tmdb_id          integer,
  media_type       text,
  referrer         text,
  user_agent       text,
  ip_hash          text,
  country          text,
  season_number    integer,
  episode_number   integer,
  provider         text,
  host_name        text,
  quality          text,
  language         text,
  file_size        text,        -- mixte string/number/null en Mongo → text
  external_link_id uuid,
  is_external      boolean NOT NULL DEFAULT false,
  source           text,
  clicked_at       timestamptz NOT NULL DEFAULT now(),
  data             jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, clicked_at)
);
SELECT create_hypertable('link_clicks', 'clicked_at',
  chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS link_clicks_wwid_time_idx   ON link_clicks (ww_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS link_clicks_linkid_time_idx ON link_clicks (link_id, clicked_at DESC);

-- ---- ad_clicks (543k docs) -------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_clicks (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  ad_id       uuid,
  ww_id       text,
  referrer    text,
  user_agent  text,
  clicked_at  timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, clicked_at)
);
SELECT create_hypertable('ad_clicks', 'clicked_at',
  chunk_time_interval => INTERVAL '14 days', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS ad_clicks_adid_time_idx ON ad_clicks (ad_id, clicked_at DESC);


-- ============================================================================
--  C bis. COMPRESSION + RETENTION (hypertables)
--  Compression des chunks > 7j (≈10-15x). Retention raw : 180j (comme l'ancien TTL).
--  Les continuous aggregates conservent l'historique agrégé au-delà.
-- ============================================================================

ALTER TABLE embed_views SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'embed_type',
  timescaledb.compress_orderby   = 'viewed_at DESC'
);
ALTER TABLE link_clicks SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'link_type',
  timescaledb.compress_orderby   = 'clicked_at DESC'
);
ALTER TABLE ad_clicks SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'clicked_at DESC'
);

-- Politiques (idempotentes via if_not_exists)
SELECT add_compression_policy('embed_views', INTERVAL '7 days',  if_not_exists => TRUE);
SELECT add_compression_policy('link_clicks', INTERVAL '14 days', if_not_exists => TRUE);
SELECT add_compression_policy('ad_clicks',   INTERVAL '7 days',  if_not_exists => TRUE);

SELECT add_retention_policy('embed_views', INTERVAL '180 days', if_not_exists => TRUE);
SELECT add_retention_policy('link_clicks', INTERVAL '180 days', if_not_exists => TRUE);
SELECT add_retention_policy('ad_clicks',   INTERVAL '180 days', if_not_exists => TRUE);


-- ============================================================================
--  C ter. CONTINUOUS AGGREGATES
--  Pré-calculent les comptages par jour. Le dashboard lit ces vues (quelques
--  centaines de lignes) au lieu de scanner des millions de docs.
-- ============================================================================

-- Vues par jour, par embed_type
-- + visitors_hll : empreinte hyperloglog du couple (ip_hash, user_agent) pour
--   le comptage de visiteurs uniques. Fusionnable entre jours/types via rollup(),
--   ce qui rend le count unique sur n'importe quelle période quasi instantané
--   (vs ~18s en COUNT(DISTINCT ...) sur la table brute).
CREATE MATERIALIZED VIEW IF NOT EXISTS embed_views_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', viewed_at) AS day,
  embed_type,
  media_type,
  count(*) AS views,
  approx_count_distinct(coalesce(ip_hash, '') || '|' || coalesce(user_agent, '')) AS visitors_hll
FROM embed_views
GROUP BY day, embed_type, media_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('embed_views_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

-- Vues par jour, par contenu (ww_id) — pour les tops/leaderboards
CREATE MATERIALIZED VIEW IF NOT EXISTS embed_views_by_content_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', viewed_at) AS day,
  ww_id,
  count(*) AS views
FROM embed_views
GROUP BY day, ww_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('embed_views_by_content_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

-- Vues par jour, par ŒUVRE (media_type + tmdb_id) — pour le "top media" admin.
-- Groupé par tmdb_id (l'œuvre entière) et non par ww_id (l'épisode) : ~110k clés
-- au lieu de 720k, donc top-100 rapide. live/digital (tmdb_id NULL) sont exclus
-- ici et résolus séparément via embed_views_by_content_daily côté code.
CREATE MATERIALIZED VIEW IF NOT EXISTS embed_views_bywork_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', viewed_at) AS day,
  media_type,
  tmdb_id,
  count(*) AS views
FROM embed_views
WHERE tmdb_id IS NOT NULL
GROUP BY day, media_type, tmdb_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('embed_views_bywork_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

-- Vues par jour, par referrer — pour le "top referer" admin (faible cardinalité,
-- ~5k referrers distincts → cagg minuscule, top instantané vs ~2.5s en brut).
CREATE MATERIALIZED VIEW IF NOT EXISTS embed_views_byreferer_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', viewed_at) AS day,
  referrer,
  count(*) AS views
FROM embed_views
GROUP BY day, referrer
WITH NO DATA;

SELECT add_continuous_aggregate_policy('embed_views_byreferer_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

-- Clics liens par jour, par type
CREATE MATERIALIZED VIEW IF NOT EXISTS link_clicks_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', clicked_at) AS day,
  link_type,
  media_type,
  count(*) AS clicks
FROM link_clicks
GROUP BY day, link_type, media_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('link_clicks_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

-- Clics pubs par jour, par annonce
CREATE MATERIALIZED VIEW IF NOT EXISTS ad_clicks_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', clicked_at) AS day,
  ad_id,
  count(*) AS clicks
FROM ad_clicks
GROUP BY day, ad_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('ad_clicks_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);


-- ============================================================================
--  D. LOGS / DIVERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,
  title           text,
  message         text,
  status          text NOT NULL DEFAULT 'open',
  embed_type      text,
  media_type      text,
  tmdb_id         integer,
  season_number   integer,
  episode_number  integer,
  source_name     text,
  source_url      text,
  referrer        text,
  reporter_ip     text,
  user_agent      text,
  admin_note      text,
  ww_id           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON bug_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS api_usage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint         text,
  method           text,
  media_type       text,
  tmdb_id          integer,
  season_number    integer,
  episode_number   integer,
  ww_id            text,
  referrer         text,
  user_agent       text,
  ip_hash          text,
  response_status  integer,
  response_time_ms integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  data             jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS api_usage_created_idx ON api_usage (created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS login_attempts_ident_idx ON login_attempts (identifier, created_at DESC);

CREATE TABLE IF NOT EXISTS link_status (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id              text NOT NULL,
  collection           text,
  link_type            text,
  host                 text,
  source_url           text,
  status               text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_http_status     integer,
  response_ms          integer,
  last_error           text,
  dead_since           timestamptz,
  last_alive_at        timestamptz,
  last_checked_at      timestamptz,
  data                 jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS link_status_linkid_idx ON link_status (link_id);

CREATE TABLE IF NOT EXISTS third_party_apis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text,
  api_type          text,
  base_url          text,
  url_pattern       text,
  url_pattern_movie text,
  url_pattern_tv    text,
  language          text,
  priority          integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  is_anonymous      boolean NOT NULL DEFAULT false,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  data              jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Tables singleton (1 ligne) : structure libre en jsonb pour ne rien contraindre.
CREATE TABLE IF NOT EXISTS site_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS runtime_status (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS runtime_status_key_uidx ON runtime_status (key) WHERE key IS NOT NULL;

-- runtime_locks : utilisé pour le flock applicatif. Clé string = nom du lock.
CREATE TABLE IF NOT EXISTS runtime_locks (
  key         text PRIMARY KEY,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);


-- ============================================================================
--  E. CACHES
--  tmdb_cache / geo_ip_cache : recréés vides (se re-remplissent, ont un TTL).
--  dark_cache / zt_cache     : importés (petits, par sécurité).
--  Le purge TTL est géré applicativement (ou via un cron) sur expires_at/_ttl.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tmdb_cache (
  key         text PRIMARY KEY,
  title       text,
  poster      text,
  ttl         timestamptz,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS tmdb_cache_ttl_idx ON tmdb_cache (ttl);

CREATE TABLE IF NOT EXISTS geo_ip_cache (
  ip          text PRIMARY KEY,
  country     text,
  ttl         timestamptz,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS geo_ip_cache_ttl_idx ON geo_ip_cache (ttl);

CREATE TABLE IF NOT EXISTS dark_cache (
  key         text PRIMARY KEY,        -- _id string en Mongo
  cached_at   timestamptz,
  expires_at  timestamptz,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS dark_cache_exp_idx ON dark_cache (expires_at);

CREATE TABLE IF NOT EXISTS zt_cache (
  key         text PRIMARY KEY,        -- _id string en Mongo
  cached_at   timestamptz,
  expires_at  timestamptz,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS zt_cache_exp_idx ON zt_cache (expires_at);


-- ============================================================================
--  FIN DU SCHÉMA
-- ============================================================================
