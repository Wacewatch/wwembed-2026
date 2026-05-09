# WWEmbed — Refonte complète

## Original problem statement
> « je veux refaire entièrement tout wwembed mais il faut bien que toutes les fonctions, options, url api etc reste les même. je veux tout passer en mongodb (il faudra transféré tout ce qui existe deja sur ma db actuel supabase automatiquement). fait une masterclass ultra moderne et 100% fonctionnel et responsive pc et mobile. »

Suivi (session 2) :
> « fait tout ce que tu peut faire en attendant que supabase refonctionne — la le site ne fonctionne pas (erreur) — raffinement glass des pages secondaires (admin, profil, dashboard détaillé) — que tout fonctionne a 100% en admin et en uploader (pas de bug ou doublons) — optimise bien tout — que rien ne bug null par ni en creation ou modification de liens ou autre action en admin ou uploader — ajoute ce qui manque comme option est qui te parrais logique — ajouter un dashboard public "stats par embed" (ex : /embed/{wwId}/stats) »

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js — préserve les URLs publiques 1:1
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies (`ww_access`, `ww_refresh`), bcrypt
- **Shim Supabase→MongoDB** (`lib/mongo/shim.ts` + `browser-shim.ts`) — toute la fluent API `.from().select().eq()` continue de marcher → 28+ routes existantes intactes

## What's been implemented

### Session 1 (2026-05-09)
- Restructuration `/app/frontend` (Next.js) + `/app/backend` (FastAPI proxy)
- MongoDB shim 100% compatible Supabase (server + browser)
- Auth JWT (`/api/auth/{login,register,logout,me}`)
- Endpoint générique `/api/db` avec RBAC
- Tous les endpoints `/api/v1/*` fonctionnels via shim
- `/api/tmdb-stats` corrigé (n'utilise plus directement `@supabase/supabase-js`)
- Refonte UI Dark Premium / Glassmorphism : `globals.css`, home, header, login, sign-up
- Compte admin créé : `admin@wwembed.test` / `admin1234`
- Script de migration `/app/migration/migrate.ts` prêt
- Seed `/app/migration/seed.ts` exécuté (4 third_party_apis + site_settings)
- Backend FastAPI proxy : fix Set-Cookie multi-headers (testing agent)
- Fix dashboard auth-aware server client

### Session 2 (2026-05-09)
- ✅ **Site error fix** : `react-is` manquant pour `recharts` (admin) — installé
- ✅ **Public embed stats dashboard** :
  - Page `/embed/[wwId]/stats` (glass premium, auto-refresh 30s)
  - API `/api/v1/stats/[wwId]` (totaux all-time / today / 7j / 30j, série 30 jours, top pays, top sources)
  - CORS ouvert pour intégration tierce
- ✅ **Refonte glass admin** :
  - `admin-stats.tsx` réécrit (glass cards avec halos d'accent, hero banner glass premium au lieu du gradient cyan)
  - `admin-tabs.tsx` : tabs en pill glass avec primary cyan actif + shadow lumineux
- ✅ **Liens "Stats" sur les rangées du dashboard** :
  - Streaming, download et digital tables ont maintenant un lien direct vers `/embed/{ww_id}/stats` (icône BarChart3 à côté du compteur Eye)
- ✅ **RBAC peaufiné** dans `/api/db` :
  - Anonymes : lecture seulement (whitelist publique)
  - Authentifiés (member/uploader/admin) : peuvent insérer/modifier `streaming_links`, `download_links`, `live_tv_channels`, `live_tv_sources`, `digital_content`, `digital_download_links`, `bug_reports`, `embed_views`, `link_clicks`
  - Admin only : `users`, `third_party_apis`, `ads`, `site_settings`
- ✅ **CRUD complet validé** : insert / update / delete sur `streaming_links` testés via curl avec retour `id` correctement mappé depuis `_id`. Aucun bug null observé.
- ✅ Smoke tests final : 14 routes répondent 200 (sauf /api/v1/live/ww-live-test 404 normal car canal inexistant)

## Migration Supabase → MongoDB
- ⚠️ **Toujours en attente** : projet `ihvdfxtduxxswvpjrtln.supabase.co` répond 522 (Cloudflare). Script prêt :
  ```bash
  cd /app/migration && yarn migrate
  ```
- Les comptes Supabase migrés auront `needs_password_reset: true` ; ils doivent passer par `/auth/sign-up` avec leur email pour finaliser leur compte.

## Backlog / Phase 3
- P0 : Migration Supabase → MongoDB (à exécuter dès retour du projet Supabase)
- P1 : refonte glass complète des managers admin lourds (api-manager, streaming-links-manager, download-links-manager, etc.) — actuellement fonctionnels mais héritent de l'ancien style
- P1 : refonte glass profile/[username] (1320 lignes — hérité)
- P1 : email transactionnel reset password (Resend/SendGrid)
- P2 : dark/light toggle (forcé dark pour l'instant)
- P2 : indexes Mongo affinés après import des vraies données
- P2 : tests automatisés E2E

## Next action items pour l'utilisateur
1. Réveiller Supabase (https://supabase.com/dashboard) puis lancer `cd /app/migration && yarn migrate`
2. Tester un compte migré en s'inscrivant via `/auth/sign-up`
3. Visiter `/embed/{ton-ww-id}/stats` — le lien est aussi accessible depuis chaque ligne du dashboard

## URLs publiques utiles
- Home: `/`
- Auth: `/auth/login`, `/auth/sign-up`
- Dashboard utilisateur: `/dashboard`
- Admin: `/admin`
- Profil public: `/profile/[username]`
- **Stats publiques par embed (NEW)**: `/embed/[wwId]/stats`
- Embed iframes (inchangées): `/api/v1/streaming/{wwId}`, `/api/v1/download/{wwId}`, `/api/v1/live/{wwId}`, `/api/v1/ebook/{wwId}`, `/api/v1/music/{wwId}`, `/api/v1/digital/{wwId}`, `/api/v1/links/{wwId}`
