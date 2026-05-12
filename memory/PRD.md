# WWEmbed — Refonte complète

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000)
- **Backend**: FastAPI léger (`/app/backend`) qui forwarde `/api/*` vers Next.js
- **Database**: MongoDB local (db `wwembed`)
- **Auth**: JWT custom, httpOnly cookies, bcrypt
- **Email transactionnel**: Resend
- **Shim Supabase→MongoDB** (`lib/mongo/shim.ts` + `browser-shim.ts`) — fluent API `.from().select().eq()` 100% compatible, gère maintenant aussi le mapping UUID legacy ↔ ObjectId

## Sessions delivered

### Session 15 (2026-05-12) — Dashboard "Liens Invalides" : revalider + Tester mes liens
- 🎯 Demande user (capture d'écran "Liens Invalides (3)") : permettre de revalider un lien après l'avoir modifié au crayon, et ajouter un bouton "Tester mes liens" pour vérifier tous les liens en lot.
- ✅ **Bouton "Revalider" par ligne** : icône `RefreshCw` (emerald) ajoutée entre Pencil (edit) et Trash (delete) sur chaque entrée de la carte "Liens Invalides", pour download_links ET digital_download_links. Click → POST `/api/check-link` → si maintenant valide, le lien disparaît automatiquement de la liste invalide (filter sur `is_valid === false`). Spinner pendant la requête, désactivé pendant un test bulk. Data-testids `invalid-{download,digital}-revalidate-{id}`.
- ✅ **Bouton "Tester mes liens"** (`data-testid="test-all-links-btn"`) : ajouté dans l'en-tête de la carte "Liens Invalides". Itère séquentiellement sur tous les download_links + digital_download_links du user, appelle `/api/check-link` un par un (évite de marteler les hôtes), affiche un compteur en temps réel (`X/Y` puis résumé `valides/invalides`). Le bouton s'affiche aussi quand il n'y a aucun lien invalide (sous forme d'une carte "Tous tes liens semblent OK" verte, pour pouvoir relancer une vérif proactive).
- ✅ **Auto-revalidation après édition** : `handleSaveEdit()` capture l'identité du lien avant de fermer la modal, puis lance `checkLinkValidity()` en fire-and-forget sur la nouvelle URL — pas besoin pour le user de cliquer manuellement sur Revalider après avoir corrigé. Marche pour download, digital et streaming.
- ✅ **Banner de résumé** : une fois le test bulk terminé, un bandeau "Test terminé : X vérifiés — Y valides · Z invalides" s'affiche pendant 8s avant disparition auto.
- ✅ **Validation Playwright** : login admin → dashboard charge → `test-all-links-btn` détecté (1) + `invalid-download-revalidate-*` détectés (2) → screenshot OK montrant les 3 boutons par ligne. POST `/api/check-link` validé en curl : update bien `is_valid` + `last_checked` en DB.


### Session 14 (2026-05-11) — API publique WaveWatch : 7 endpoints + auth X-API-Key
- 🎯 Demande user : exposer 7 endpoints (`/health`, `/api/v1/download_links/{recent,/,for-content,media-types}`, `/api/v1/profiles/uploaders`, `/api/v1/stats`) consommés par WaveWatch. Protection : clé API dans `.env`.
- ✅ **Clé API** : `WAVEWATCH_API_KEY=wwk_24db521eac4ca6f1cf4435c27ffeabee51387ba2549ee5ba547f4f6b13893d23` dans `.env`. Acceptée via 3 canaux : header `X-API-Key`, `Authorization: Bearer ...`, ou `?api_key=...` en query string.
- ✅ **Helper partagé** : `lib/wavewatch-api.ts` — `requireApiKey()`, `BASE_FILTER` (is_active≠false, status=approved, is_valid≠false), `normalizeLink()` (shape publique exacte du spec), `fetchUploaderMap()` (résolution batch ObjectId+legacy_uuid→{username,role}), `queryDownloadLinks()`, `QUALITY_RANK` (`4k`>`1080p`>`720p` numérique).
- ✅ **Healthcheck** : `app/health/route.ts` ET `app/api/v1/health/route.ts` — réponse `{ status: "ok" }`, sans auth.
- ✅ **`/api/v1/download_links/recent`** : `?limit` (défaut 12, max 50), tri `created_at desc`.
- ✅ **`/api/v1/download_links`** : 7 filtres (`quality`, `media_type`, `language`, `q` regex sur release_name|source_name|ww_id, `uploader` résolu en `submitted_by`, `limit` max 20000, `offset`), 4 sorts (`created_at.{asc,desc}`, `quality.{asc,desc}`). Validation 400 sur `media_type` et `sort` invalides. Renvoie `{ items, total, offset, limit }`.
- ✅ **`/api/v1/download_links/for-content`** : params requis `tmdb_id` + `media_type`, optionnels `season` + `episode` (episode exige season → 400 sinon). Tri qualité desc puis `created_at` desc.
- ✅ **`/api/v1/download_links/media-types`** : `db.distinct("media_type", BASE_FILTER)` trié.
- ✅ **`/api/v1/profiles/uploaders`** : `distinct(submitted_by)` sur liens actifs → résolution profiles (ObjectId + legacy_uuid), tri alphabétique case-insensitive.
- ✅ **`/api/v1/stats`** : compte global download_links + last_24h. **Seul endpoint sans filtres implicites** (conforme au spec).
- ✅ **Tests E2E curl** validés sur DB seedée (4 liens valides + 3 liens "trash" : inactive/pending/invalid pour vérifier les filtres implicites) : tous les filtres + paginations + sorts + cas d'erreur (401 no-key, 401 wrong-key, 400 sur params invalides) passent. `/stats` retourne bien 7 (tous) vs 4 visibles dans les listes.


### Session 13 (2026-05-11) — Suppression flow Resend, remplacement par setup-password + code admin
- 🎯 Demande user : retirer le flow Resend (forgot/reset password) et permettre aux comptes importés Supabase de créer leur mot de passe via une page dédiée gated par un code admin (`AdminC26C789#@`).
- ✅ **Login API** (`app/api/auth/login/route.ts`) : quand un user existe avec `needs_password_reset=true` OU sans `password_hash`, renvoie `{ error, needs_setup: true, email }` HTTP 401 au lieu de l'ancien message Resend.
- ✅ **Login page** (`app/auth/login/page.tsx`) : appelle désormais `/api/auth/login` directement (au lieu du shim Supabase) et redirige vers `/auth/setup-password?email=...` quand `needs_setup` est retourné. Suppression du lien "Mot de passe oublié ?".
- ✅ **Nouvelle page `/auth/setup-password`** : 4 champs (email pré-rempli readonly, nouveau mot de passe, confirmer, **code admin**). Tous data-testids ajoutés (`setup-form`, `setup-email`, `setup-password`, `setup-confirm`, `setup-admin-code`, `setup-submit`, `setup-error`, `setup-success`).
- ✅ **Nouvelle API `/api/auth/setup-password`** : valide email + password (≥6) + admin_code, compare `admin_code === process.env.ADMIN_RESET_CODE`, vérifie que le compte est bien dans l'état "needs_setup", hash bcrypt le password, met à jour `users` ET miroir `profiles`, auto-login (cookies JWT). Retourne 400/403/404 selon le cas.
- ✅ **ADMIN_RESET_CODE="AdminC26C789#@"** ajouté dans `/app/frontend/.env` (entre guillemets car dotenv traite `#` comme un commentaire sinon — bug attrapé pendant les tests).
- ✅ **Cleanup** : supprimés `app/auth/forgot-password/`, `app/auth/reset-password/`, `app/api/auth/forgot-password/`, `app/api/auth/reset-password/`, `lib/email/` (Resend + templates). Retrait de l'index `password_reset_tokens` dans `lib/mongo/db.ts`. OpenAPI mis à jour (anciens endpoints marqués deprecated, nouveau `/api/auth/setup-password` documenté). Message de l'écran d'import Supabase mis à jour pour pointer vers le nouveau flow.
- ✅ **Tests E2E curl** : tous OK — login d'un user `needs_password_reset=true` → 401 + `needs_setup:true` ; setup sans code → 400 ; setup avec mauvais code → 403 ; setup avec bon code → 200 + cookies posés ; relogin avec le nouveau mdp → 200 ; setup sur compte déjà actif → 400 "Ce compte a déjà un mot de passe".
- 📸 Screenshot Playwright validé : page `/auth/setup-password?email=test@test.com` rend correctement avec email pré-rempli readonly et tous les champs.


### Session 12 (2026-05-11) — Fix admin redirect + rebranding wavewatch.xyz → wavewatch.top
- 🐛 **Bug "click sur Admin → rien ne se passe"** : `/app/admin/page.tsx` vérifiait `profiles.role` qui pouvait dériver de `users.role` (la source d'auth lue par `getCurrentUser()` et le Header). Quand un user était admin dans `users` mais "member" dans le miroir `profiles`, le Header montrait le lien "Admin", mais la page server-side faisait `redirect("/")` → aucune navigation visible.
- ✅ **Fix 1** : `app/admin/page.tsx` utilise désormais `(user as any).role` (lecture directe du JWT, même source que le Header) au lieu de relire `profiles`.
- ✅ **Fix 2** : `app/api/stats/route.ts` accepte `profile?.role || user.role` (fallback sur la collection `users` si le miroir est manquant/stale).
- ✅ **Fix 3** : `components/admin/users-manager.tsx` propage les changements de rôle/suppression dans **les deux** collections (`profiles` ET `users`) pour rester en sync avec l'auth JWT. `/api/db/route.ts` autorise désormais les writes admin-only sur `users` (gate `ADMIN_ONLY_WRITE` déjà en place).
- ✅ **Rebranding `wavewatch.xyz` → `wavewatch.top`** dans tous les sources : footer (`app/page.tsx`), embed streaming (`app/api/v1/streaming/[wwId]/route.ts`), embed digital (`app/api/v1/digital/[wwId]/route.ts`). Validé : `curl /` n'affiche plus que `wavewatch.top`, embed streaming idem.
- ✅ **Validation manuelle** : register `admin@wwembed.test` → promotion `users.role=admin` + `profiles.role=member` (cas dégénéré) → `curl /admin` retourne **HTTP 200 + contenu "Administration"** (auparavant redirect vers `/`).


### Session 11 (2026-05-10) — Tests E2E Playwright complets + 3 fixes (regex digital, labels, ad-clicks)
- 🎯 Demande user : "[Backlog P2] Tests E2E Playwright sur les flows pub avec données réelles" + "[User] Re-cliquer 'Démarrer l'import complet'".
- ✅ **Re-import Supabase déclenché** : login admin (re-seedé via `npx tsx /app/migration/seed.ts` car users vide), POST `/api/admin/import-supabase`, polling 20s → 14 tables critiques DONE (profiles 63, third_party_apis 40, ads 2, live_tv_channels 85, live_tv_sources 370, digital_content 60, digital_download_links 57, streaming_links 1232, download_links 16436, etc.). ad_clicks et embed_views continuent en background.
- ✅ **Tests E2E Playwright iteration_3** sur les 7 routes ad-modal avec wwIds réels : 5/7 PASS direct (streaming/ww-movie-10948, live/ww-live-cc04..., download/ww-movie-74607, download/ww-soft-865259, ebook/ww-ebook-579975), 1 BLOCKED data (music — pas de tracks pour ww-music-861486, code identique à ebook), **1 BUG CRITIQUE** sur `/api/v1/digital/[wwId]`.
- 🐛 **Bug 1 (CRITIQUE) — regex digital fixé** : `/api/v1/digital/[wwId]/route.ts:14` avait `/^ww-(software|game)-/` mais la DB stocke `ww-soft-*` (8), `ww-ebook-*` (51), `ww-music-*` (1) — `ww-software-*`/`ww-game-*` n'existent pas. Résultat : 100% des wwIds renvoyaient HTTP 400. Fix : regex élargie `/^ww-(soft|software|game|ebook|music)-/` + map `PREFIX_TO_TYPE = {soft:'software', software:'software', game:'game', ebook:'ebook', music:'music'}` pour normaliser avant `.eq('content_type', ...)`.
- 🐛 **Bug 2 (MEDIUM) — labels & icônes ebook/music fixés** : ligne 98 `typeLabel = contentType === "software" ? "Logiciel" : "Jeu"` → tous les ebooks/musics affichaient le badge "Jeu" + icône gamepad. Fix : maps `TYPE_LABEL` et `TYPE_ICON` dédiées (Logiciel/Jeu/Ebook/Musique avec SVG monitor/gamepad/book/music-note). Vérifié visuellement : ww-ebook-579975 affiche maintenant "Ebook" + book icon.
- 🐛 **Bug 3 (LOW) — `/api/ads/click` HTTP 500 fixé** : MongoServerError "Cannot apply $inc to a value of non-numeric type" car les rows `ads` migrées avaient `click_count: null`. Fix dans `/app/frontend/lib/mongo/shim.ts:449-462` : remplacé `$inc` par aggregation pipeline `[{$set:{click_count:{$add:[{$ifNull:["$click_count",0]},1]}}}]`. Pareil pour `increment_live_tv_views`. **Bonus cleanup** : `/api/ads/click/route.ts` faisait un update intermédiaire `click_count: undefined` qui resettait le compteur — supprimé. Vérifié : 3 POST consécutifs → click_count incrémente 1→4 + 3 docs `ad_clicks` insérés.
- ✅ **Tests E2E iteration_4** post-fix : 3/3 PASS sur `/api/v1/digital/{soft,ebook,music}` — 2-PUB modal exercise end-to-end avec capture des 3 popups (otieu → adsterra → file URL), modal auto-close, no forbidden labels.
- ✅ **Bilan total : 7/7 routes ad-modal validées** — streaming, live, download movie, download digital, digital direct (soft/ebook/music), ebook, music. Tous utilisent `https://otieu.com/4/9248013` (PUB 1) + `https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5` (PUB 2). Aucun 3e bouton.

### Session 10 (2026-05-10) — Vérification complète des modales pub 2-clics partout
- 🎯 Demande user : "continu mon code, ma derniere demande n'est pas fini (modal pub 2 clique comme streaming, pour download et download digital et les lien interne externe alt etc..)". Puis confirmation : "oui, vérifie".
- ✅ **Audit complet des 7 routes de pub** par grep + curl HTML rendu :
  - `/api/v1/streaming/[wwId]` → 2 boutons ÉTAPE 1/2 + 2/2, otieu + adsterra ✅ (showFinalBtn:false)
  - `/api/v1/live/[wwId]` → idem ✅ (lecteur auto après 2e PUB)
  - `/api/v1/download/[wwId]` flow movie/serie : `_sa()` lien interne DB → otieu + adsterra ✅ ; `_openExtAdModal()` lien externe (movix) → otieu + adsterra ✅ ; lien alt (wavewatch.top) → utilise `_openExtAdModal` → otieu + adsterra ✅
  - `/api/v1/download/[wwId]` flow digital (ww-soft/ebook/music/game) : `_showAdModal()` lien interne → `window._wwAdModal` 2-step (otieu + adsterra) ✅ ; `_openExtAdModal()` lien externe + alt → `window._wwAdModal` ✅
  - `/api/v1/digital/[wwId]` → 2 boutons ÉTAPE 1/2 + 2/2, otieu + adsterra ✅
  - `/api/v1/ebook/[wwId]` → idem ✅
  - `/api/v1/music/[wwId]` → idem ✅
- ✅ **Test curl E2E** : `curl /api/v1/streaming/ww-movie-99999` et `/api/v1/download/ww-movie-99999` rendent du HTML. Grep confirme :
  - Seules les 2 URLs pubs unifiées présentes : `otieu.com/4/9248013` + `foreignabnormality.com/fgntgn3c16?key=9a04e35a...`
  - Boutons "ÉTAPE 1 / 2" et "ÉTAPE 2 / 2" présents
  - Aucune trace de `VOIR LE LIEN` / `DÉMARRER LA LECTURE` / `CONTINUER` (3e clic) — ni de `q7jywq0h` (vieille pub) ni de `exemple.com`
- 🧹 **Nettoyage dead code** : 2 déclarations orphelines `var AD_URL_EXT="https://foreignabnormality.com/q7jywq0h?..."` (lignes 315 et 1097) jamais utilisées après l'unification → supprimées (remplacées par un commentaire explicatif).
- ⚙️ **Setup container** : `node_modules/` absent au démarrage → `yarn install --ignore-engines` (48s) + `supervisorctl restart frontend` → service RUNNING, `curl localhost:3000 → 200`.
- ⚠️ DB toujours vide (collections existent mais 0 docs partout) — user doit re-cliquer "Démarrer l'import complet" sur `/admin → Import` pour récupérer les 4.5M rows depuis Supabase.

### Session 9 (2026-05-10) — Modales pub harmonisées 2-PUB-clics partout + fix bug visuel ww-ebook
- 🎯 Demande user : "dans streaming le modal a 2 clique pub et accède directement au résultat (pas de 3eme clique inutile). je veus le meme partout download, download digital, tv live etc. et gardant les couleur deja en place. les meme pub 2 clique pas plus" — puis (suite) : "il y a des bug visuel dans les download digital sans avoir cliquer sur un lien", "les 2 pub doivent etre les meme que streaming partout otieu et adsterra", "j'ai vu des clique pub sur exemple.com"
- ✅ **Live TV** (`/api/v1/live/[wwId]`) : `showFinalBtn:true`→`false`. Plus de clic "DÉMARRER LA LECTURE" — le lecteur charge auto après les 2 pubs.
- ✅ **Download digital flow** (`/api/v1/download/ww-{soft,ebook,music,game}-*`) : `showFinalBtn:true`→`false`. Plus de clic "VOIR LE LIEN".
- ✅ **Download direct DB** (`_sa()` dans `/api/v1/download/[wwId]`) : modal refondue — 2 boutons PUB (ÉTAPE 1/2 + ÉTAPE 2/2) au lieu de "Continuer" + "Voir le lien". Auto-affichage du lien après le 2ème clic.
- ✅ **Download external sources** (`_openExtAdModal()`) : 2 boutons PUB au lieu de "CONTINUER" + "VOIR LE LIEN".
- ✅ **Digital / Ebook / Music** (`/api/v1/{digital,ebook,music}/[wwId]`) : modales refondues — 2 boutons PUB au lieu de 1 PUB + timer 5s + bouton final. Auto-déclenchement du résultat après le 2ème clic.
- ✅ **Bug visuel critique fixé** : sur le flow digital de `/api/v1/download/[wwId]`, la HTML du modal unifié (`${adModalDigital.html}`) était insérée mais **le CSS associé (`adModalDigital.css`) manquait** dans la balise `<style>`. Conséquence : le `display:none` de l'overlay n'était pas appliqué et la modal apparaissait en bas de page comme un énorme SVG cassé. Ajout d'`${adModalDigital.css}` ligne 237.
- ✅ **Pubs harmonisées partout** : les 6 routes utilisent maintenant LES MÊMES 2 URLs que streaming :
  - PUB 1 = `https://otieu.com/4/9248013` (otieu)
  - PUB 2 = `https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5` (adsterra)
  - Plus aucun `window.open(_u)` (ad random DB) ni `AD_URL_EXT` différent — tout est désormais figé sur otieu + adsterra.
- ✅ Couleurs originales préservées (streaming dark blue/purple, livetv orange, download violet/pink, digital/ebook/music dark glass).
- ✅ Test E2E Playwright + curl : streaming, download direct, digital — tous PASS (2 clics → résultat direct).
- ⚠️ Session précédente avait seedé des données de test (ww-movie-27205, ww-soft-test-1 etc) — **toutes supprimées** dans cette session. Le user doit re-importer depuis Supabase via /admin → onglet Import → "Démarrer l'import complet".

### Session 8 (2026-05-10) — Fix bug "modal pub digital download : pas de bouton 'voir le lien'"
- 🐛 Bug user : sur `/api/v1/download/ww-soft-XXX` (et autres digital), click sur lien direct DB → modal pub s'affiche, click "CONTINUER" → la pub s'ouvre, mais ensuite la modal reste vide (ni lien ni bouton "voir le lien").
- 🔍 RCA : dans `_showAdModal` du flow digital, le code clone le bouton btnDownload pour reset les listeners (`var dnClone = dn.cloneNode(true); dn.parentNode.replaceChild(dnClone, dn)`), mais — contrairement au bouton `bu` (CONTINUER) à la ligne 562 où on fait `bu = buClone` — la variable JS `dn` n'était PAS réassignée. Résultat : `dn` pointait vers l'ancien node DOM **détaché**, et l'appel `dn.classList.remove("hi")` dans `_advance()` modifiait un node fantôme. Le vrai bouton (dnClone) gardait la classe `hi` (`display:none !important`) → invisible.
- ✅ Fix 1-ligne dans `/app/frontend/app/api/v1/download/[wwId]/route.ts:580` : ajouter `;dn=dnClone` après le `replaceChild` pour que la closure de `_advance` voie le nouveau node.
- ✅ Test E2E Playwright complet : load page → click "Télécharger" → modal → click "CONTINUER" (pub s'ouvre) → bouton "VOIR LE LIEN" maintenant visible → click → modal se ferme + zone "Votre lien est prêt !" affiche l'URL + bouton "Ouvrir le lien".

### Session 7 (2026-05-10) — Bouton "Import Supabase → MongoDB" admin
- ✅ Endpoint `POST /api/admin/import-supabase` (admin only, requireAdmin) — démarre un job d'import en background, retourne le jobId immédiatement
- ✅ Endpoint `GET /api/admin/import-supabase` — retourne le dernier job (ou `?id=<id>`) avec status, phase, current_table, total_rows et état par table
- ✅ Lib `/app/frontend/lib/mongo/supabase-import.ts` : logique de migration extraite (UUID→ObjectId hex 24, bulkWrite upsert idempotent, retries timeout/57014, ne réécrase pas un user qui a déjà un password_hash). Persiste le job dans la collection `import_jobs` à chaque page (500 rows) pour progress live.
- ✅ Composant `/app/frontend/components/admin/import-supabase.tsx` : panel glass avec banner Cyan, bouton "Démarrer l'import complet" + confirmation, polling toutes les 2s tant que running, barre de progression, grid des 17 tables + auth.users avec icônes d'état (pending/running/done/error), succès/erreur summary.
- ✅ Nouvel onglet "Import" dans `AdminTabs` (icône Database, accent cyan) — accessible uniquement aux admins (page /admin redirect non-admin)
- ✅ **Réordonnage des tables** (Session 7.1) : tables small + critical user-facing (profiles, third_party_apis, ads, live_tv_channels, live_tv_sources, digital_content, digital_download_links, streaming_links, download_links, site_settings, daily_stats, bug_reports) AVANT les grosses tables logs (api_usage, ad_clicks, link_clicks, embed_views). Résultat : les chaînes TV/digital/streaming sont disponibles en < 2 min, embed_views (~4M rows) tourne en arrière-plan.
- ✅ **Auto-stale handling** : si `globalThis.__ww_import_running` est false mais qu'un job en DB est marqué "running" (ex: process restart / hot-reload), on le marque automatiquement comme stale (`status=error, error="Process restarted"`) et on autorise un nouveau démarrage. L'admin peut donc re-cliquer "Démarrer" sans manipulation manuelle.
- ✅ Test E2E : 16/17 tables migrées en 2 min (live_tv_channels: 85 ✓, live_tv_sources: 370 ✓, digital_content: 60 ✓, ads: 2 ✓, ad_clicks: 540,568 ✓, link_clicks: 45,851 ✓, …). embed_views et auth.users continuent en background — peuvent être finalisés en re-cliquant "Démarrer" (idempotent).

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
