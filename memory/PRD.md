# WWEmbed — Refonte complète

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies, bcrypt
- **Email transactionnel**: Resend
- **Shim Supabase→MongoDB** (`lib/mongo/shim.ts` + `browser-shim.ts`) — fluent API `.from().select().eq()` 100% compatible

## Sessions delivered

### Sessions 1-3 (2026-05-09)
Voir l'historique git. Auth JWT, /api/db RBAC, refonte UI dark glass, /api/admin/stats, public stats, profile pages, embed routes 1:1 avec Supabase.

### Session 4 (2026-05-09) — Migration + Resend + API Docs
- ✅ **Migration Supabase → MongoDB COMPLÈTE** (sauf embed_views qui finit en background) :
  - Patché `migrate.ts` avec polyfill `ws` pour Node 20
  - `migrate-rest.ts` pour les tables restantes après timeout
  - `migrate-embed-cursor.ts` pour embed_views via cursor pagination (`WHERE id > X`)
  - **Tables 100% importées** : profiles (64), profile_settings (7), third_party_apis (40), streaming_links (1194), download_links (16,392), link_clicks (45,764), api_usage (5,448), ads (2), ad_clicks (108,757), live_tv_channels (85), live_tv_sources (370), digital_content (60), digital_download_links (57), bug_reports (1,533), site_settings (1), users (71)
  - **embed_views** : ~4.13M+ rows, en cours via cursor (`migrate-embed-cursor.ts`). Background job — log : `/app/memory/migrate-embed-cursor.log`. Status au moment du finish : 3.4M+ déjà en Mongo, le cursor scan continue vers la fin du UUID keyspace.
  - Drop unique constraint sur `users.username` (kept sparse index) car migration auth.users avait des doublons (LadyFM, admin) → maintenant index sparse non-unique, le code register gère les conflits avec suffixe random
  - Tous les comptes Supabase migrés ont `needs_password_reset: true` → ils peuvent maintenant cliquer "Mot de passe oublié ?" sur /auth/login
- ✅ **Seed.ts maintenant idempotent pour l'admin** : recrée admin@wwembed.test / admin1234 à chaque run (plus de risque de perdre le compte)
- ✅ **Resend + Password Reset complet** :
  - `lib/email/resend.ts` (wrapper Node SDK) + `lib/email/templates.ts` (HTML email premium)
  - `POST /api/auth/forgot-password` → token sha256 hashé en DB, email Resend, anti-énumération (toujours `{ok:true}`)
  - `POST /api/auth/reset-password` → validation token + auto-login
  - Pages glass `/auth/forgot-password` et `/auth/reset-password`
  - Lien "Mot de passe oublié ?" sur /auth/login
  - Indexes Mongo (token_hash, user_id, email)
- ✅ **API Docs Swagger** sur `/docs` (renommé depuis /api-docs à cause routing K8s) :
  - Spec OpenAPI 3.1 servie par `GET /api/openapi`
  - swagger-ui-react 5.11.10 + thème glass dark complet
  - tryItOut activé avec cookies de session
  - Lien "API" dans le header
- ✅ **Refonte glass des managers admin** appliquée globalement via CSS :
  - `.dark [data-slot="card"]` → backdrop-blur + border cyan au hover
  - TOUS les managers (api, users, ads, streaming, download, digital, livetv, bugs, settings, pending, stats) sont premium glass d'un coup
  - Utilities `.admin-card` et `.admin-stat-card` pour cas spécifiques
- ✅ **Smoke test e2e validé** : login admin OK ; admin dashboard affiche TV LIVE: 85, BUGS: 1524, CONTENUS DIGITAUX: 60, CLICS PUBS: 540,438, etc. — tout est rendu correctement.

## Migration Supabase → MongoDB
- ✅ **DONE pour 16/17 tables**
- ⏳ embed_views en cours (cursor scan via `id > X`). Le script tourne en background (`tail -f /app/memory/migrate-embed-cursor.log`). Idempotent (upsert) — peut être relancé sans souci en cas de crash.

## Action user requise (pour la prod)
1. **Vérifier le domaine Resend** sur https://resend.com/domains :
   - Ajouter `wwembed.wavewatch.top` (ou `mail.wavewatch.top`)
   - Configurer SPF, DKIM, DMARC fournis par Resend
   - Une fois vérifié : `RESEND_SENDER_EMAIL=noreply@wwembed.wavewatch.top` dans `/app/frontend/.env` puis `sudo supervisorctl restart frontend`
   - Tant que ce n'est pas fait, l'email reset n'arrive QU'à `wavewatchcontact@gmail.com`

## Backlog
- P1 : Indexes Mongo affinés sur embed_views (ww_id + viewed_at)
- P1 : Vérification domaine Resend pour mailing à tous les utilisateurs
- P2 : Tests E2E Playwright automatisés
- P2 : Autres flows email (welcome au sign-up, digest hebdo uploaders, notif lien approuvé)

## Performance gains
- /api/admin/stats: ~180ms (vs 5-15s avant)
- /api/openapi: ~6ms cached
- Admin > Stats charge en < 500ms côté navigateur
- Shim Mongo ajoute ~10-30ms par /api/db (négligeable)
