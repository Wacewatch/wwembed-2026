# WWEmbed — Refonte complète

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies, bcrypt
- **Email transactionnel**: Resend (`onboarding@resend.dev` en testing, à basculer sur `noreply@wwembed.wavewatch.top` une fois le domaine vérifié)
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

### Session 3 (2026-05-09) — endpoint admin/stats
- Endpoint admin stats unifié `/api/admin/stats` (~180ms vs 5-15s)
- stats-viewer.tsx complètement refait, glass cards, AreaChart, posters TMDB
- external-links-stats.tsx réécrit en glass premium
- Cache TMDB côté serveur (Map en mémoire, TTL 6h)
- Auto-incrément view_count / click_count dans le shim
- Time fields auto + backfill

### Session 4 (2026-05-09) — ce qu'on vient de faire
- ✅ **Migration Supabase → MongoDB** lancée (script `migrate.ts` patché : ajout `ws` polyfill pour Node <22). Profile/settings/APIs/streaming_links/download_links migrés. embed_views (>1.8M rows) en cours, se termine en background.
- ✅ **Resend intégré** :
  - `lib/email/resend.ts` (wrapper) + `lib/email/templates.ts` (template HTML password reset, dark glass premium)
  - `RESEND_API_KEY` + `RESEND_SENDER_EMAIL` dans `/app/frontend/.env`
  - Sender par défaut : `onboarding@resend.dev` (testing — délivre uniquement à l'email du compte Resend tant que le domaine n'est pas vérifié)
- ✅ **Password reset flow complet** :
  - `POST /api/auth/forgot-password` → génère token (sha256 hashé en DB), envoie l'email Resend, répond toujours `{ok:true}` (anti-énumération)
  - `POST /api/auth/reset-password` → valide token, met à jour `users.password_hash`, auto-login (cookies posés)
  - Pages `/auth/forgot-password` + `/auth/reset-password` (glass premium, data-testid complets)
  - Lien "Mot de passe oublié ?" sur `/auth/login`
  - Indexes Mongo sur `password_reset_tokens` (token_hash, user_id, email)
- ✅ **API Docs Swagger** :
  - Spec OpenAPI 3.1 servie par `GET /api/openapi` (auth, embeds, stats, db, search, tracking)
  - Page interactive `/docs` (renommée depuis `/api-docs` à cause du routing K8s ingress qui shunt `/api*` vers FastAPI)
  - `swagger-ui-react` 5.11.10 + thème glass dark complet (`swagger.css`) — couleurs primary cyan, glassmorphism sur opblocks
  - `requestInterceptor` envoie les cookies de session pour tester les routes authentifiées
  - Lien "API" ajouté dans le header
- ✅ **Refonte glass des managers admin** : utilitaire CSS `.dark [data-slot="card"]` qui applique automatiquement le glassmorphism (blur, border, hover state cyan) à TOUS les Cards shadcn/ui en mode dark — refonte instantanée de tous les managers (api, users, ads, streaming-links, download-links, digital-content, live-tv, bug-reports, settings, pending, stats) sans modifier le JSX. Ajout `.admin-card` et `.admin-stat-card` pour cas spécifiques.
- ✅ **Smoke test e2e validé** : login admin OK, forgot-password → token DB, reset-password → auto-login, login avec nouveau mdp OK ; admin dashboard rendu avec glass premium, stats temps-réel chargées (17,586 contenus, 1.8M+ vues, 64 utilisateurs).

## Migration Supabase → MongoDB
- ✅ Scripté + en cours d'exécution (background — embed_views ~1.85M, takes time)
- ⚠️ Tables restantes après embed_views (link_clicks, api_usage, daily_stats, ads, ad_clicks, live_tv_*, digital_*, bug_reports, site_settings, auth.users) seront traitées séquentiellement par le script
- ℹ️ Les comptes Supabase migrés auront `needs_password_reset: true` ; ils peuvent maintenant utiliser `/auth/forgot-password` (ou `/auth/sign-up` avec leur email) pour finaliser leur compte

## Resend — domain verification (action user requise)
Pour pouvoir envoyer des emails à n'importe qui (et pas seulement au compte propriétaire de l'API key) :
1. Aller sur https://resend.com/domains
2. Ajouter `wwembed.wavewatch.top` (ou un sous-domaine `mail.wavewatch.top`)
3. Configurer les enregistrements DNS (SPF, DKIM, DMARC) fournis par Resend
4. Une fois vérifié, mettre à jour `/app/frontend/.env` :
   ```
   RESEND_SENDER_EMAIL=noreply@wwembed.wavewatch.top
   ```
5. `sudo supervisorctl restart frontend`

## Backlog
- P0 : laisser la migration finir + vérifier auth.users importés (login attempts pour comptes legacy)
- P1 : vérification domaine Resend pour la prod
- P1 : indexes Mongo affinés (embed_views par ww_id + viewed_at)
- P2 : tests E2E automatisés (Playwright)
- P2 : email autres flows (notification nouveau lien, etc.)

## Performance gains constatés
- /api/admin/stats: ~180ms (vs ~5-15s en pagination client + TMDB N+1)
- /api/openapi: ~6ms (cached 5min)
- Toute la page admin > Stats charge en < 500ms côté navigateur
- Le shim n'ajoute que ~10-30ms par requête /api/db (négligeable)
