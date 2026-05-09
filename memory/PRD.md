# WWEmbed — Refonte complète

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies, bcrypt
- **Shim Supabase→MongoDB** (`lib/mongo/shim.ts` + `browser-shim.ts`) — toute la fluent API `.from().select().eq()` continue de marcher

## Sessions delivered

### Session 1 (2026-05-09)
- Restructuration `/app/frontend` (Next.js) + `/app/backend` (FastAPI proxy)
- MongoDB shim 100% compatible Supabase (server + browser)
- Auth JWT (`/api/auth/{login,register,logout,me}`)
- Endpoint générique `/api/db` avec RBAC
- Refonte UI Dark Premium / Glassmorphism : `globals.css`, home, header, login, sign-up
- Compte admin : `admin@wwembed.test` / `admin1234`
- Script de migration `/app/migration/migrate.ts` prêt
- Seed `/app/migration/seed.ts` exécuté

### Session 2 (2026-05-09)
- Site error fix (`react-is` manquant + `BarChart3` doublon)
- Public embed stats dashboard `/embed/[wwId]/stats` + API `/api/v1/stats/[wwId]`
- Refonte glass admin-stats.tsx + admin-tabs.tsx
- Stats links sur dashboard rows
- RBAC peaufiné (live_tv_channels accessible aux uploaders)

### Session 3 (2026-05-09) — ce qu'on vient de faire
- ✅ **Endpoint admin stats unifié `/api/admin/stats`** — agrège tout via MongoDB pipelines (~180ms vs 5-15s en Supabase pagination). Inclut: vues totales, clics liens/pubs, visiteurs uniques, top médias views/downloads, top référents, online stats temps réel (5min/15min/1h/24h), pages actives, visiteurs récents, breakdown par type, **tout les stats des liens externes** (totalClicks, byProvider, byHost, byQuality, byMediaType, topMedia)
- ✅ **stats-viewer.tsx complètement refait** : 1 seul fetch, glass cards, AreaChart en gradient, posters TMDB, auto-refresh 30s, click → /embed/{wwId}/stats
- ✅ **external-links-stats.tsx** réécrit en glass premium : pie chart providers, bars by-day, top hosts/quality/media-type, top medias avec clicks
- ✅ **Cache TMDB** côté serveur (Map en mémoire, TTL 6h) pour ne pas re-hit l'API à chaque ouverture des stats
- ✅ **Auto-incrément view_count / click_count** dans le shim (insert embed_views → bump streaming_links/digital_content/live_tv_channels.view_count ; insert link_clicks → bump download_links/digital_download_links.click_count). Reproduit le comportement des triggers SQL Supabase.
- ✅ **Time fields auto** dans le shim : embed_views ⇒ `viewed_at`, link_clicks/ad_clicks ⇒ `clicked_at` (en plus de `created_at`)
- ✅ **Backfill** des `viewed_at`/`clicked_at` manquants sur les rows existants (depuis `created_at`)
- ✅ **Vérifié uploader e2e** : register → role uploader → login → POST /api/db insert streaming_link + download_link → /profile/{username} affiche les liens avec poster TMDB
- ✅ **Public profile `/profile/[username]`** validée fonctionnelle (97KB rendu, posters TMDB, theme midnight, downloads + streaming sections)
- ✅ Smoke test final: 16 routes en 200 (UI + APIs)

## Migration Supabase → MongoDB
- ⚠️ **Toujours en attente** : projet `ihvdfxtduxxswvpjrtln.supabase.co` répond 522 (Cloudflare). Script prêt : `cd /app/migration && yarn migrate`
- Les comptes Supabase migrés auront `needs_password_reset: true` ; ils doivent passer par `/auth/sign-up` avec leur email pour finaliser leur compte

## Backlog
- P0 : Migration Supabase → MongoDB (à exécuter dès retour du projet)
- P1 : refonte glass des managers admin lourds restants (api-manager, links-manager, etc.)
- P1 : email reset password (Resend/SendGrid)
- P2 : tests E2E automatisés
- P2 : indexes Mongo affinés après import réel

## Performance gains constatés
- /api/admin/stats: ~180ms (vs ~5-15s en pagination client + TMDB N+1)
- Toute la page admin > Stats charge en < 500ms côté navigateur
- Le shim n'ajoute que ~10-30ms par requête /api/db (négligeable)
