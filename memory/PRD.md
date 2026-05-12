# WWEmbed — PRD

## Original problem statement (this session, FR)
- Erreurs lors de l'import Supabase (E11000 username collision + statement_timeout sur embed_views)
- Stats clics téléchargement doivent fonctionner sur le Dashboard
- Onglet admin "Téléchargements internes" avec top liens + classement uploaders
- Supprimer TOUTES les limites (1000, 50, etc.) dans les stats

## Architecture (existant)
- Next.js 14 (App Router) + MongoDB native driver
- `lib/mongo/shim.ts` : fluent Supabase-compatible shim backed by MongoDB
- Auth JWT custom (cookies httpOnly)
- Migration Supabase→MongoDB en cours via `/api/admin/import-supabase`

## Implémenté cette session (12/05/2026)
1. **Fix import Supabase** (`lib/mongo/supabase-import.ts`)
   - Pagination CURSOR (par `viewed_at`/`clicked_at`/`created_at` ASC) au lieu de `range(offset)` pour `embed_views`, `link_clicks`, `ad_clicks`, `api_usage` → évite `statement_timeout 57014`
   - PAGE=200 pour embed_views (vs 500), backoff exponentiel avec page-size shrink à chaque retry (jusqu'à 6 tentatives)
   - Suffixe automatique `_2`, `_3`... sur collision username dans `auth.users` (LadyFM → LadyFM_2), fallback `_${uuid[:8]}` après 50 essais
2. **Stats clics par lien — Dashboard** (`app/dashboard/page.tsx` + `components/dashboard/dashboard-content.tsx`)
   - Agrégation MongoDB native par `link_id` et `ww_id` pour calculer `click_count` par lien
   - Nouvelle colonne **Clics** dans les tableaux streaming/download/digital
   - Nouvelle tuile **CLICS DL** en haut du dashboard avec total
   - Aucune limite : on agrège l'intégralité des clics (groupBy naturellement borné)
3. **Onglet "Téléchargements Internes"** (`/api/admin/stats` + `components/admin/internal-downloads-stats.tsx`)
   - Bloc `internal` dans la réponse JSON : `totalClicks`, `totalClicksAllTime`, `byDay`, `topLinks`, `topUploaders`, `byQuality`, `byMediaType`, `byLinkType`
   - Top liens : join via `$lookup` avec `download_links`/`digital_download_links` → titre TMDB enrichi, source, qualité, langue, link_type, statut, uploader
   - Classement uploaders avec médailles 🥇🥈🥉, % d'impact, count liens
   - Nouvel onglet visible dans Admin > Stats
4. **Suppression de TOUTES les limites stats**
   - `/api/admin/stats` : retrait de tous les `$limit` + `.slice()` (topMedia, topDownload, topReferer, externalTop, activePages, recentVisitors)
   - `/api/stats` : retrait `.limit(1000)` sur top_media + `.slice(0, 10)` sur tri
   - `/api/v1/stats/[wwId]` : retrait `.limit(5000)` viewsRecent/clicksRecent + `.slice(0, 10)` countries/referers
   - Pagination du dashboard `fetchAllRows` conservée (boucle 1000 jusqu'à épuisement → récupère tout)

## Test
- Backend validé via curl/seed local (admin@wwembed.test / admin1234) : `/api/admin/stats?period=7` retourne `internal.{topLinks, topUploaders, totalClicks}` correctement enrichis (titre TMDB, posters)
- Frontend validé via screenshots :
  - Dashboard download tab → colonne Clics 25/25 ✅
  - Admin Stats > Téléchargements Internes → graphique + top liens + classement uploader ✅

## Next Action Items
- Relancer l'import en production (idempotent) — embed_views devrait passer cette fois, et auth.users gérera les collisions
- Si production a déjà 0 entrées dans `auth.users` à cause de l'ancien crash, l'import reprendra le tour complet

## 12/05/2026 — Fix download embed externalliens
- **Bug 1** : Typo `tmdbdId` au lieu de `tmdbId` dans l'URL movix `/darkiworld/download/movie/{id}?tmdbdId=...` → l'API recevait pas le tmdbId et matchait par titre, retournant les mauvais liens (ex. Mario Galaxy → liens random)
- **Bug 2** : Sélection du `first` result naïve. Pour TMDB id `1226863` (Super Mario Galaxy le film), 41 résultats movix dont 38 jeux Mario. Nouveau matching multi-passes :
  1. tmdb_id exact + type attendu (movie/animes pour film, series/animes pour TV)
  2. tmdb_id exact (any type)
  3. premier résultat de type attendu
  4. fallback : results[0]
- Fichier modifié : `app/api/v1/download/[wwId]/route.ts` (route film/série uniquement, la digital_content section utilisait déjà la logique correcte)
- Modal pub 2 étapes (otieu + adsterra) **conservée intacte**
- Validé : `ww-movie-1226863` retourne 13 liens corrects (1Fichier WEB 1080p Light 2.63 GB, Ultra HDLight x265, etc.) en provenance de movix avec posters, qualités, sub, lang corrects
