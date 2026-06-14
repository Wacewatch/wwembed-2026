# Fix ZT source — 2026-06-14 (multi-mirror update)

## Mises à jour de la session précédente
Voir [`zt_fix_2026-06.md`](./zt_fix_2026-06.md) — réécriture du scraper pour le nouveau CMS .org.

## Nouvelle évolution : agrégation `.org` + `.cafe` (et tout miroir futur)

### Pourquoi
- Les miroirs ZT (`.org`, `.cafe`, `.irish`/`.cafe`, …) servent en majorité le même contenu,
  mais l'un peut être down ou Cloudflare-protected pendant que l'autre répond.
- Certains hosters peuvent aussi être présents sur un miroir et pas sur l'autre
  (mirroring asynchrone côté ZT).
- L'agrégation maximise le nombre de liens disponibles dans l'onglet « Sources ZT ».

### Comment
1. **Nouvelle constante `ZT_MIRRORS`** dans `/app/zt.php` :
   ```php
   const ZT_MIRRORS = [
       'https://www.zone-telechargement.org',
       'https://www.zone-telechargement.cafe',
   ];
   ```
   (`BASE_URL` reste le miroir principal pour la rétrocompat des `sourceUrl`.)

2. **`zt_search($query, $type)`** interroge maintenant TOUS les miroirs **en parallèle**
   via `http_fetch_multi`, dédup les items par couple (kind, id-slug) et conserve la
   liste des miroirs où chaque item a été vu (champ `mirrors`).

3. **`scrape_listing($html, $baseUrl)`** prend désormais le miroir source en paramètre
   pour reconstruire les `pageUrl` absolues correctement.

4. **Nouveau helper `expand_urls_to_all_mirrors($urls)`** : prend une liste de
   pageUrls ZT et les explose sur tous les miroirs, en dédupliquant.
   Ex : `[org/?p=film&id=56479]` → `[org/?p=film&id=56479, cafe/?p=film&id=56479]`.

5. **`merge_qualities()`** appelle automatiquement `expand_urls_to_all_mirrors()`
   avant le fetch parallèle. Toutes les routes (TMDB lookup, AJAX detail, etc.)
   en profitent sans modification.

6. **Dédup finale par `url`** : si les deux miroirs renvoient les mêmes liens
   dl-protect.link (cas standard), un seul est conservé. Si un miroir a un hoster
   en plus, il s'ajoute aux liens du film.

### Validation (test live depuis cette machine)
La sandbox a son IP bloquée par Cloudflare sur `.org` (HTTP 403) mais `.cafe` répond
normalement. **Le scraper continue à trouver les résultats parce qu'il interroge les
deux miroirs simultanément** :
```
zt_search("Fight Club", "movie")  → 25 items (tous via .cafe, .org timeouted)
merge_qualities([org-url])        → fetches org+cafe → 4 DL links + 1 stream link
                                     (dédupés correctement)
```

C'est précisément le comportement attendu : si l'un des miroirs tombe, l'autre prend
le relais et l'utilisateur ne voit rien d'anormal.

### Déploiement
Toujours pareil : uploader `/app/zt.php` à la racine de `apis.wavewatch.top`.
Aucun changement nécessaire côté Next.js (le proxy `/api/v1/zt-proxy` reçoit
les mêmes shapes JSON).

### Ajout/retrait d'un miroir
Pour ajouter `.team`, `.cafe2`, etc. : modifier la constante `ZT_MIRRORS` au début
du fichier. Aucun autre changement nécessaire.
