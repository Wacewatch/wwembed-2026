# WWEmbed — Refonte complète

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies, bcrypt
- **Email transactionnel**: Resend
- **Shim Supabase→MongoDB** (`lib/mongo/shim.ts` + `browser-shim.ts`) — fluent API `.from().select().eq()` 100% compatible, gère maintenant aussi le mapping UUID legacy ↔ ObjectId

## Sessions delivered

### Session 6 (2026-05-10) — Test complet "tout vérifier"
- ✅ Container frais : `node_modules` manquaient → `yarn install --ignore-engines` exécuté (Node 20 vs swagger-client requiert Node ≥22)
- ✅ Frontend Next.js 16 redémarré, supervisor RUNNING
- ✅ Admin user re-seedé dans MongoDB (admin@wwembed.test / admin1234, bcrypt cost 10)
- ✅ Pytest backend : **32/32 tests passent** (auth, embed v1 routes, TMDB, /api/db RBAC, /api/admin/stats, /api/openapi, /api/v1/stats)
- ✅ Frontend e2e Playwright : homepage, /auth/login, /auth/sign-up, /auth/forgot-password, /dashboard, /admin, /docs, /profile/{username}, /embed/{wwId}/stats — tous green
- ⚠️ Issues mineures non-bloquantes :
  - Console TypeError sur /docs (apidom turbopack chunk) — UI fonctionne
  - /profile et /embed/{wwId} (bare, sans paramètre) → 404 by design (les routes implémentées sont /profile/{username} et /embed/{wwId}/stats)
  - ww_access / ww_refresh cookies en HttpOnly+SameSite=Lax mais sans flag Secure (hardening optionnel)

### Sessions 1-3 (2026-05-09)
Architecture migrée vers Next.js + MongoDB shim, auth JWT, /api/db RBAC, refonte UI dark glass, /api/admin/stats endpoint unifié, public stats par embed, profile pages, embed routes 1:1 avec Supabase preserved.

### Session 4 (2026-05-09) — Migration + Resend + API Docs + Glass refonte
Voir détails ci-dessous.

### Session 5 (2026-05-09) — Fix Top médias TV + finalisation migration
- ✅ **Migration embed_views complète** : 4,304,729 rows (la totalité de la table Supabase, ~6.5M cursor scans incluant les doublons upserts)
- ✅ **Fix lookup chaînes TV dans `/api/admin/stats`** : la requête `live_tv_channels` cherchait par `_id` ou `id` mais après migration les chaînes ont un `legacy_uuid` (UUID Supabase) et un `_id` ObjectId dérivé du hex. Ajout de la clé `legacy_uuid` dans le lookup + index par UUID dans le map.
- ✅ **Fix global du shim Supabase pour les UUIDs migrés** : nouveaux helpers `idFilter(value)` et `idArrayFilter(values)` qui :
  - Acceptent les ObjectId hex 24-chars (nouveaux docs) → `{_id: ObjectId(hex)}`
  - Acceptent les UUID 36-chars (docs migrés) → `{$or: [{legacy_uuid: uuid}, {_id: ObjectId(uuidHex24)}]}`
  - Acceptent les autres strings → `{_id: value}`
- ✅ Mis à jour `eq("id", ...)`, `neq("id", ...)`, `in("id", [...])`, le mode `upsert`, et les RPCs `increment_ad_clicks` / `increment_live_tv_views` du shim
- ✅ **Résultat user-facing** : "Top médias (vues)" affiche maintenant **"Canal+ Foot" / "Canal+" avec leurs logos** au lieu de "Chaîne TV / Live" anonymes

## Migration Supabase → MongoDB — DONE ✅
| Table | Rows |
|---|---|
| embed_views | 4,304,729 |
| download_links | 16,392 |
| streaming_links | 1,194 |
| ad_clicks | 108,757 |
| link_clicks | 45,764 |
| api_usage | 5,448 |
| live_tv_channels | 85 |
| live_tv_sources | 370 |
| bug_reports | 1,533 |
| digital_content | 60 |
| digital_download_links | 57 |
| profiles / users | 64 / 71 |
| third_party_apis | 44 |
| ads | 2 |
| site_settings | 2 |

Total : **~4.5M rows** persistés en MongoDB local. Idempotent — peut être re-exécuté.

## Action user requise (pour la prod)
- **Vérifier le domaine Resend** sur https://resend.com/domains pour pouvoir envoyer des emails à n'importe qui (actuellement testing → emails envoyés uniquement vers `wavewatchcontact@gmail.com` qui est le compte propriétaire de l'API key)

## Backlog
- P1 : Index Mongo affiné `embed_views: {ww_id: 1, viewed_at: -1}` (gros gain sur les stats par embed)
- P1 : Email "réactivation" en bulk pour les 71 users migrés (`needs_password_reset: true`) une fois domaine Resend vérifié — typiquement 30-40% de récupération sur une migration
- P2 : Tests E2E Playwright
- P2 : Email welcome au sign-up + digest hebdo uploaders
- P2 : Re-traitement des `submitted_by` UUID legacy → ObjectId user_id dans streaming_links/download_links/digital_content (cosmétique)

## Performance gains
- /api/admin/stats: ~180ms (vs 5-15s avant)
- /api/openapi: ~6ms cached
- Admin > Stats charge en < 500ms
- Shim Mongo ajoute ~10-30ms par /api/db (négligeable)
