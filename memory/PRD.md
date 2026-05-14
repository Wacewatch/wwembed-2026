# WWEmbed — Product Requirements Document

## Original problem statement
Plateforme d'embed (streaming / téléchargement / TV live / contenu digital) pour des sites tiers, avec admin dashboard, gestion des liens uploaders, APIs externes, pubs, et statistiques temps réel.

## Tech stack
Next.js 16 (App Router) · React 19 · MongoDB · TMDB API · JWT auth (bcrypt) · Tailwind v4

## Current architecture (after Jan 2026 cleanup)
- 27 routes API (v1 publiques + internes)
- Players embed: streaming / download / live / ebook / music / digital
- Admin dashboard avec 11 tabs (Pending, APIs, Streaming, Download, Digital, TV Live, Bugs, Pubs, Users, Stats, Paramètres)
- Auth maison JWT (httpOnly cookies) + bcrypt
- Shim Mongo (`lib/mongo/shim.ts`) qui expose une API compatible Supabase pour limiter les changements dans 28 routes legacy

## What's been implemented
### 2026-05-14 — Stats fix + hardening + perf overhaul
- Fix compteurs "Utilisateurs en ligne" sous-évalués → ip_hash propagé sur les 7 endpoints embed_views + clé composite (ip_hash, user_agent)
- Fix doublons Top référents → normalisation hostname (lowercase, sans protocole/port/www/path/trailing-dot)
- Fix graphique plat sur `/embed/[wwId]/stats` → aggregation Mongo native avec dayBucket gérant ISO-string ET Date BSON
- Suppression code import Supabase + dépendances `@supabase/ssr`, `@supabase/supabase-js`, `resend`, dossier `migration/`, dossier `scripts/`
- Sécurité: JWT_SECRET requis en prod (>= 32 chars), CRON_SECRET requis (>=16 chars), rate-limit login (8/10min) + bug-report (5/10min) + link-click (60/min) via `login_attempts` collection
- Sécurité: link-click revalide les métadonnées depuis la DB (anti-gonflement stats par 3rd party)
- Sécurité: typescript ignoreBuildErrors → false ; CSP headers sur toutes routes hors `/api/v1`
- Perf: TTL 180j sur embed_views/link_clicks/ad_clicks via `_ttl: Date` ; TTL 7j sur tmdb_cache ; TTL 24h sur login_attempts
- Perf: TMDB cache déplacé du process en mémoire vers MongoDB (`tmdb_cache` collection, partagé multi-instance)
- Perf: compteurs view_count/click_count rendus asynchrones (fire-and-forget background) → -50/150 ms sur chaque embed view
- Perf: dashboard utilisateur refactoré pour utiliser un seul `find` Mongo au lieu de pagination 1000-rows × N
- Nouveau: `lib/stats-rollup.ts` + endpoint cron `/api/admin/stats-rollup?secret=$CRON_SECRET` → collection `stats_daily_rollup` (1 doc/jour) prête pour réduire l'admin/stats de 3-10s → <100ms
- Nouveau: SSE `/api/admin/online-stream` (events 'online' toutes les 10s + heartbeat 25s) consommé par `OnlineUsersModule` → counters live, poll réduit à 60s pour les listes enrichies

## Backlog / prioritised
- P1: Refactoriser admin/stats pour lire `stats_daily_rollup` au lieu de scanner embed_views (gain x100 sur historique 7j/30j)
- P1: Configurer le cron externe (Vercel/GitHub Actions/UptimeRobot) pour hit `/api/admin/stats-rollup` toutes les 30 min
- P1: Extraire le HTML inline (>800 lignes par route) de `app/api/v1/{streaming,download,live,ebook,music,digital}/[wwId]/route.ts` vers `lib/embed-templates/`
- P2: Migrer entièrement legacy_uuid → ObjectId puis virer le dual-id du shim et de `lib/mongo/auth.ts`
- P2: Tier API payant Stripe (free 10k vues/mois → $9 100k → $49 unlimited) avec `api_keys` collection + middleware quota
- P2: A/B testing des pubs depuis `AdsManager` + fréquence cap cookie 30min
- P3: Affiliate-rewriting des URLs 1fichier/Uptobox/Rapidgator
- P3: Notifications uploaders (lien approuvé/rejeté/bug) → besoin d'un fournisseur email (Resend a été retiré sur demande)
- P3: Export CSV stats admin, recherche/filtres dans les managers, page status publique, sitemap SEO uploaders, PWA
- P3: Tests automatisés (Jest/Vitest + smoke curl)

## Operational notes
- TTL purge automatique au-delà de 180 jours sur les events bruts (rollup conserve l'historique long terme)
- `JWT_SECRET` et `CRON_SECRET` sont obligatoires en NODE_ENV=production (le serveur refuse de démarrer ou de servir les endpoints sensibles sinon)
- Aucune migration DB requise pour cette release: les indexes et collections nouveaux sont créés lazily au premier `getDb()`

## 2026-05-14 (suite) — Admin + Uploader + Embed feature pack
### Link health checker
- `lib/link-checker.ts` : HEAD-first / GET-Range fallback, browser-like UA, 12s timeout, scan body for dead-link patterns. Hesteresis 3 failures avant flag DEAD (anti faux-négatif). Throttle 3 parallel par host.
- `lib/link-checker-runner.ts` : background scanner avec process mutex + Mongo lock TTL 5min, throttle min interval 5min. Pickup LRU 60 liens / 12h cooldown. Auto-déclenché par les hits sur `/api/admin/stats/advanced` — pas besoin de cron externe.
- `POST /api/admin/check-link/run` (admin) : trigger background ou `?wait=1` synchrone. `?link_id=&link_type=` pour recheck unique.
- `GET /api/admin/check-link/run` (admin) : breakdown alive/dead/unknown × {download,digital,streaming} + dernière scan report + dead list paginated.
- Stockage : collection `link_status` { link_id, status, consecutive_failures, last_checked_at, dead_since, last_http_status, response_ms, last_alive_at }. Mirror sur parent `is_valid` + `link_status`.
- UI : nouveau tab admin "Santé liens" → tiles overview + tableau breakdown + dead list avec bouton recheck par lien.

### Stats avancées admin
- `GET /api/admin/stats/advanced?period=1|7|30` (admin) : comparatif period vs prev (delta %) sur views/clicks/ad_clicks/unique. Heatmap 7×24 (dayOfWeek × hour UTC). Top countries via geo lookup ip_prefix → ip-api.com (cache Mongo 180j). Funnel impressions→sessions→source clicks→ad clicks. Top bandwidth (views × avg file_size).
- UI : nouveau tab admin "Avancé" → 4 KPI tiles comparatif, heatmap colorée 7×24, funnel waterfall, top pays avec drapeaux, top bandwidth.

### Geo capture
- Tous les inserts `embed_views` capturent maintenant `ip_prefix` (IPv4 /24, IPv6 /48) — GDPR friendly. Permet le geo lookup sans stocker l'IP brute.
- `lib/geo.ts` : `countryForIp()` avec cache Mongo `geo_ip_cache` + concurrency 5.

### Uploader features
- `GET /api/dashboard/my-stats` : KPIs perso (vues 30j / clicks 30j / total / avg), série dense 30j, top contenus, best day, link health, content count, delta_pct vs 30j précédents.
- `GET /api/leaderboard?period=7d|30d|all&limit=N` : ranking par vues générées. Public.
- UI : nouveau composant `DashboardStatsOverview` injecté en haut du dashboard uploader → 4 KPI tiles, graphique 30j (recharts Area+Line), santé liens, top contenus, leaderboard avec position de l'user en surbrillance.

### Auto-fill URL
- `lib/url-probe.ts` : provider detection (regex hostname, 26 hosters supportés), quality/language extraction (4K/1080p/.../VF/VOSTFR/MULTI/TRUEFRENCH), file_size + filename via HEAD/GET-Range + Content-Disposition, media type guess.
- `POST /api/upload/probe` (auth user) : rate-limited 20/min/user.
- `<UrlProbeButton>` composant réutilisable. Branché sur le champ URL streaming d'AddLinkModal en pilot (les autres URL fields à brancher iteration future).

### Pages publiques + OG
- `/movie/[tmdbId]` + `/tv/[tmdbId]` : SSR fiche complète avec poster, backdrop, genres, rating, sources WW disponibles, CTA Lecture + Stats. generateMetadata complet (OG image, Twitter Card large_image, canonical). JSON-LD Movie / TVSeries pour SEO.

### Files créés (cette session)
lib/link-checker.ts, lib/link-checker-runner.ts, lib/url-probe.ts, lib/url-utils.ts, lib/geo.ts, app/api/admin/check-link/run/route.ts, app/api/admin/stats/advanced/route.ts, app/api/dashboard/my-stats/route.ts, app/api/leaderboard/route.ts, app/api/upload/probe/route.ts, app/movie/[tmdbId]/page.tsx, app/tv/[tmdbId]/page.tsx, components/admin/link-health-module.tsx, components/admin/admin-stats-advanced.tsx, components/dashboard/dashboard-stats-overview.tsx, components/url-probe-button.tsx
