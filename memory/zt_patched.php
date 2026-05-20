<?php
/**
 * ════════════════════════════════════════════════════════════════
 *  ZT Search — Scraper & API REST pour zone-telechargement.org
 *  v1.0  (basé sur la structure de wawa.php)
 *
 *  Routes :
 *    /api/v1/liens?type=movie&id={tmdb_id}
 *    /api/v1/liens?type=tv&id={tmdb_id}&s={saison}&e={episode}
 *    /api/v1/liens?type={type}&q={titre}
 *
 *  .htaccess :
 *    RewriteEngine On
 *    RewriteRule ^api/v1/liens$ /zt.php?_route=api [L,QSA]
 * ════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');

// ─── Config ───────────────────────────────────────────────────
const BASE_URL       = 'https://www.zone-telechargement.org';
const TMDB_API_KEY   = 'd4b8332681051181b69c8a6c9ba1a70a';
const FETCH_TIMEOUT  = 15;
const USER_AGENT     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// ─── Routing ──────────────────────────────────────────────────
if (defined('ZT_LIB_ONLY') && ZT_LIB_ONLY) {
    $isApiCall = false;
    $isAjax    = false;
    $ZT_LIB    = true;
} else {
    $isApiCall = (isset($_GET['_route']) && $_GET['_route'] === 'api')
              || (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/v1/liens') !== false);
    $isAjax    = isset($_GET['ajax']);
    $ZT_LIB    = false;
}

// ═════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═════════════════════════════════════════════════════════════
function http_fetch(string $url, int $timeout = FETCH_TIMEOUT, string $method = 'GET', array $postFields = []): ?string {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_ENCODING       => 'gzip, deflate',
        CURLOPT_USERAGENT      => USER_AGENT,
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
            'Referer: ' . BASE_URL . '/',
        ],
    ];
    if ($method === 'POST') {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = http_build_query($postFields);
    }
    curl_setopt_array($ch, $opts);
    $r = curl_exec($ch);
    curl_close($ch);
    return ($r !== false && $r !== '') ? $r : null;
}

function http_fetch_multi(array $urls, int $timeout = FETCH_TIMEOUT): array {
    $unique = array_values(array_unique(array_filter($urls)));
    if (empty($unique)) return [];
    $mh = curl_multi_init();
    $handles = [];
    foreach ($unique as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 4,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_ENCODING       => 'gzip, deflate',
            CURLOPT_USERAGENT      => USER_AGENT,
            CURLOPT_HTTPHEADER     => [
                'Accept: text/html,*/*',
                'Accept-Language: fr-FR,fr;q=0.9',
                'Referer: ' . BASE_URL . '/',
            ],
        ]);
        curl_multi_add_handle($mh, $ch);
        $handles[$url] = $ch;
    }
    $active = null;
    do { curl_multi_exec($mh, $active); curl_multi_select($mh, 0.5); } while ($active > 0);
    $results = [];
    foreach ($handles as $url => $ch) {
        $b = curl_multi_getcontent($ch);
        $results[$url] = ($b !== false && $b !== '') ? $b : null;
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $results;
}

// ═════════════════════════════════════════════════════════════
// TMDB
// ═════════════════════════════════════════════════════════════
function hd(string $s): string {
    return html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function tmdb_search(string $title, string $type = 'movie', string $year = ''): ?array {
    $url = 'https://api.themoviedb.org/3/search/' . $type
         . '?api_key=' . TMDB_API_KEY . '&language=fr-FR&query=' . rawurlencode($title);
    if ($year) $url .= ($type === 'movie' ? '&year=' : '&first_air_date_year=') . $year;
    $raw = http_fetch($url, 8);
    if (!$raw) return null;
    $d = json_decode($raw, true);
    if (empty($d['results'])) return null;
    $best = $d['results'][0];
    if ($year) {
        foreach ($d['results'] as $r) {
            $ry = substr($r['release_date'] ?? $r['first_air_date'] ?? '', 0, 4);
            if ($ry === $year) { $best = $r; break; }
        }
    }
    return tmdb_normalize($best);
}

function tmdb_get(int $id, string $type = 'movie'): ?array {
    $raw = http_fetch('https://api.themoviedb.org/3/' . $type . '/' . $id
        . '?api_key=' . TMDB_API_KEY . '&language=fr-FR', 8);
    if (!$raw) return null;
    $d = json_decode($raw, true);
    return empty($d['id']) ? null : tmdb_normalize($d);
}

function tmdb_normalize(array $r): array {
    return [
        'id'             => $r['id'],
        'title'          => hd($r['title'] ?? $r['name'] ?? ''),
        'original_title' => hd($r['original_title'] ?? $r['original_name'] ?? ''),
        'poster_path'    => $r['poster_path'] ?? '',
        'overview'       => hd($r['overview'] ?? ''),
        'release_date'   => $r['release_date'] ?? $r['first_air_date'] ?? '',
    ];
}

// ═════════════════════════════════════════════════════════════
// TITLE CLEANING
// ═════════════════════════════════════════════════════════════
function clean_title(string $t): string {
    $t = hd($t);
    $t = preg_replace('/\[.*?\]/', '', $t);
    $t = preg_replace('/\s*\((TRUEFRENCH|VOSTFR|VOSTF|MULTI|FRENCH|VF|VO|HD|4K|1080p?|720p?|WEBRIP|WEB-?DL|BDRIP|BLURAY|HDLIGHT)\)\s*/i', ' ', $t);
    $t = preg_replace('/[-–]?\s*(?:saison|season)\s*\d+/i', '', $t);
    $t = preg_replace('/[-–]?\s*s\d{1,2}(?:\s*[-–]?\s*e?\d{1,2})?(?!\w)/i', '', $t);
    $t = preg_replace('/\s*[-–]\s*(TRUEFRENCH|VOSTFR|VOSTF|MULTI|FRENCH|VF|VO)\s*(HD|4K|1080p?|720p?|UHD)?\s*/i', ' ', $t);
    $t = preg_replace('/\s+(TRUEFRENCH|VOSTFR|VOSTF|MULTI|FRENCH)\s*$/i', '', $t);
    $t = preg_replace('/[-–]?\s*(HD|4K|1080p?|720p?|UHD|WEBRIP|WEB[-\s]?DL|BDRIP|HDRIP|DVDRIP|BLURAY|BLU[-\s]?RAY|HDLIGHT|HDTS|CAM|TS|X265|X264|ULTRA\s*HD)\s*$/i', '', $t);
    $t = preg_replace('/\s+/', ' ', $t);
    return trim($t, '-–: ');
}

function normalize_title(string $t): string {
    $t = hd($t);
    $t = mb_strtolower($t, 'UTF-8');
    $t = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $t) ?: $t;
    $t = preg_replace("/[''`´]/", '', $t);
    $t = preg_replace('/[:;,.!\-–—?()\[\]{}]/u', ' ', $t);
    $t = preg_replace('/\b(?:le|la|les|l|un|une|des|de|du|the|a|an)\b/u', ' ', $t);
    $t = preg_replace('/\s+/', ' ', $t);
    return trim($t);
}

function extract_year_from_title(string $t): string {
    if (preg_match('/\b(19\d{2}|20\d{2})\b/', $t, $m)) return $m[1];
    return '';
}

function extract_season_episode(string $text): array {
    $se = ['season' => null, 'episode' => null];
    if (preg_match('/\bS(\d{1,2})E(\d{1,3})\b/i', $text, $m)) {
        $se['season']  = (int)$m[1];
        $se['episode'] = (int)$m[2];
        return $se;
    }
    if (preg_match('/(?:saison|season)\s*(\d{1,2})/iu', $text, $m)) {
        $se['season'] = (int)$m[1];
    }
    if (preg_match('/(?:épisode|episode|ép\.?\s*|ep\.?\s*)(\d{1,3})/iu', $text, $m)) {
        $se['episode'] = (int)$m[1];
    }
    return $se;
}

// ═════════════════════════════════════════════════════════════
// HOSTS, PROTECTION & ZONEURS DECODER
// ═════════════════════════════════════════════════════════════
const HOST_PATTERNS = [
    '1fichier'      => '1Fichier',
    'uptobox'       => 'Uptobox',
    'turbobit'      => 'Turbobit',
    'trbt.cc'       => 'Turbobit',
    'rapidgator'    => 'Rapidgator',
    'uploaded.net'  => 'Uploaded',
    'uploaded.to'   => 'Uploaded',
    'ul.to'         => 'Uploaded',
    'nitroflare'    => 'Nitroflare',
    'nitro.download'=> 'Nitroflare',
    'uploady'       => 'Uploady',
    'dailyuploads'  => 'Dailyuploads',
    'fileserve'     => 'Fileserve',
    'mediafire'     => 'Mediafire',
    'send.now'      => 'Send.now',
    'send.cm'       => 'Send.cm',
    'gofile'        => 'Gofile',
    'multiup'       => 'Multiup',
    'qiwi'          => 'Qiwi',
    'mega.nz'       => 'Mega',
    'mega.co'       => 'Mega',
    'k2s.cc'        => 'Keep2Share',
    'keep2share'    => 'Keep2Share',
    'doodstream'    => 'Doodstream',
    'dood.watch'    => 'Doodstream',
    'dood.la'       => 'Dood.la',
    'dood.so'       => 'Dood.so',
    'dood.re'       => 'Dood.re',
    'dsvplay'       => 'DSV Play',
    'dsv.la'        => 'DSV Play',
    'lulustream'    => 'Lulustream',
    'luluvdo'       => 'Lulustream',
    'luluvid'       => 'Lulustream',
    'voe.sx'        => 'Voe',
    'embedseek'     => 'EmbedSeek',
    'seekstreaming' => 'Seekstreaming',
    'rdh.embedseek' => 'Seekstreaming',
    'streamtape'    => 'Streamtape',
    'vidoza'        => 'Vidoza',
    'uqload'        => 'Uqload',
    'mixdrop'       => 'MixDrop',
    'filemoon'      => 'FileMoon',
    'sibnet'        => 'Sibnet',
];

// Hosts considered as streaming (URL-based fallback classification)
const STREAM_HOST_PATTERNS = [
    'doodstream','dood.la','dood.so','dood.re','dsvplay','dsv.la',
    'lulustream','luluvdo','luluvid','voe.sx','embedseek','seekstreaming',
    'streamtape','vidoza','uqload','mixdrop','filemoon','sibnet',
];

const PROTECTION_PATTERNS = [
    'zoneurs.net'        => 'zoneurs',
    'protect-lien'       => 'dl-protect',
    'dl-protect'         => 'dl-protect',
    'liens-telechargement' => 'dl-protect',
    'linkpoi'            => 'dl-protect',
];

/**
 * Décode un lien zoneurs.net (?url=BASE64) vers l'URL réelle.
 * Si l'URL n'est pas un zoneurs.net, la retourne telle quelle.
 */
function decode_zoneurs(string $url): string {
    if (preg_match('~^https?://(?:www\.)?zoneurs\.net/\?url=([A-Za-z0-9%+/=_-]+)~i', $url, $m)) {
        $b64 = urldecode($m[1]);
        // strict standard base64
        $decoded = base64_decode($b64, true);
        if ($decoded !== false && preg_match('~^https?://~i', $decoded)) {
            return $decoded;
        }
        // try URL-safe variant
        $b64s = strtr($b64, '-_', '+/');
        $pad  = strlen($b64s) % 4;
        if ($pad) $b64s .= str_repeat('=', 4 - $pad);
        $decoded = base64_decode($b64s, true);
        if ($decoded !== false && preg_match('~^https?://~i', $decoded)) {
            return $decoded;
        }
    }
    return $url;
}

function extract_host_and_protection(string $href, string $textSrc = ''): array {
    $hlow = strtolower($href);
    $tlow = strtolower($textSrc);

    $protection = '';
    foreach (PROTECTION_PATTERNS as $pat => $label) {
        if (strpos($hlow, $pat) !== false) { $protection = $label; break; }
    }

    // Decode zoneurs to detect the real host
    $real = decode_zoneurs($href);
    $rlow = strtolower($real);

    $host = '';
    foreach (HOST_PATTERNS as $pat => $label) {
        if ($tlow && strpos($tlow, $pat) !== false) { $host = $label; break; }
    }
    if (!$host) {
        foreach (HOST_PATTERNS as $pat => $label) {
            if (strpos($rlow, $pat) !== false) { $host = $label; break; }
        }
    }
    if (!$host) {
        foreach (HOST_PATTERNS as $pat => $label) {
            if (strpos($hlow, $pat) !== false) { $host = $label; break; }
        }
    }
    if (!$host) {
        $p = parse_url($real);
        if (!empty($p['host'])) {
            $h = preg_replace('/^(?:www\d*|dl\d*|cdn\d*|files?\d*)\./', '', strtolower($p['host']));
            $parts = explode('.', $h);
            $host = ucfirst($parts[0] ?? '');
        }
    }

    return ['host' => $host, 'protection' => $protection, 'realUrl' => $real];
}

// ═════════════════════════════════════════════════════════════
// LINK FILTERING
// ═════════════════════════════════════════════════════════════
const BLACKLIST_DOMAINS = [
    'youtube.com', 'youtu.be',
    'twitter.com', 'x.com', 't.co',
    'facebook.com', 'fb.com',
    'instagram.com', 'tiktok.com',
    'google.com', 'google.fr',
    'telegram.me', 't.me',
    'discord.gg', 'discord.com',
    'themoviedb.org', 'imdb.com',
    'allocine.fr',
    'pastebin.com',
    'bit.ly', 'tinyurl',
    'adf.ly', 'linkvertise', 'sh.st',
    'vpnmentor', 'nordvpn', 'expressvpn', 'cyberghost',
];

const BLACKLIST_TEXT = [
    'bande annonce', 'bande-annonce', 'trailer', 'teaser',
    'vpn gratuit', 'vpn offert', 'protection vpn',
    'abonnez', 'subscribe', 'newsletter',
    'installer', 'download app',
    'tweet', 'share', 'partager',
    'anonymement', 'anonymat',
    'lien premium', 'streaming anonyme', 'anonyme',
    'signaler un problème', 'lien mort', 'commentaire',
    'créer un compte', 'mot de passe oublié',
    'être notifié',
];

function is_valid_link(string $url, string $linkText = ''): bool {
    if (!$url || $url === '#') return false;
    if (preg_match('/^(?:javascript|mailto|tel|data):/i', $url)) return false;
    // Accepte les URLs protocol-relative (commençant par //) — courantes
    // dans les pages ZT (ex : //zoneurs.net/?url=...). On les promeut en https.
    if (strpos($url, '//') === 0) {
        $url = 'https:' . $url;
    } elseif (strpos($url, 'http') !== 0) {
        return false;
    }

    $urlLow  = strtolower($url);
    $textLow = strtolower($linkText);

    // We accept zone-telechargement internal "ajouter au favoris" etc only if not in blacklist
    foreach (BLACKLIST_DOMAINS as $bd) {
        if (strpos($urlLow, $bd) !== false) return false;
    }
    foreach (BLACKLIST_TEXT as $bt) {
        if (strpos($textLow, $bt) !== false) return false;
    }

    if (strlen($url) < 12) return false;
    if (preg_match('/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|ttf)(\?|$)/i', $url)) return false;

    return true;
}

// ═════════════════════════════════════════════════════════════
// LISTING SCRAPER (search & category pages)
// ═════════════════════════════════════════════════════════════
/**
 * Extract content detail URLs from a listing page.
 * ZT detail urls match pattern: /{category-folder}/{id}-{slug}.html
 */
function scrape_listing(string $html): array {
    if (!$html) return [];
    $results = [];
    $seen = [];

    // Match: <a href=".../[category-folder]/[digits]-[slug].html">TITLE</a>
    // Categories of interest: film-gratuit, nouveaux-films, telecharger-serie, animes,
    //   jeux-gratuit, musique-mp3-gratuite, ebooks, logiciels, documentaire-gratuit, emissions-tv...
    $allowedCats = [
        'film-gratuit','nouveaux-films','film-vostfr','film-bluray-hd','films-ultra-hd-4k',
        'film-x265-x264-hdlight','film-dvdrip-bdrip','film-mkv','tscam-films-2020',
        'dessins-animes','film-vfstfr','films-vo','collections-films-integrale','film-bluray-3d',
        'telecharger-serie','serie-vf','serie-vf-en-hd','serie-vf-1080p',
        'serie-vostfr','serie-vostfr-hd','serie-vostfr-1080p','serie-vo','ancienne-serie',
        'animes','animes-vostfr','animes-vostfr-720p','animes-vostfr-1080p',
        'animes-vf','animes-vf-720p','animes-vf-1080p','animes-vosten','films-mangas','oav',
        'jeux-gratuit','jeux-pc','jeux-xbox360','jeux-ps3','jeux-wii-ds','jeux-wii',
        'jeux-psp','jeux-mac','jeux-objets-caches','nintendo-switch',
        'musique-mp3-gratuite','musiques-enfants',
        'ebooks','livre-audio','magazines','journaux','livres','bandeessinee',
        'logiciels',
        'documentaire-gratuit',
        'emissions-tv','emissions-tv-reportages-investigations','emissions-tv-divertissements',
        'emissions-tv-telerealite','emissions-tv-musique-danse','emissions-tv-actualite',
        'emissions-tv-nature-animaux','emissions-tv-sport-auto','emissions-tv-cuisine',
        'emissions-tv-sante','emissions-tv-sciences-technologie',
        'spectacles','concerts','sport','autoformations',
    ];
    $catRe = implode('|', array_map('preg_quote', $allowedCats));

    // Pattern : /CAT/12345-slug-blabla.html
    $pattern = '~href=["\'](https?://[^"\']*zone-telechargement[^"\']*?/(?:' . $catRe . ')/\d+-[^"\']+\.html)["\'][^>]*>(.*?)</a>~si';
    if (preg_match_all($pattern, $html, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $m) {
            $href  = hd($m[1]);
            if (isset($seen[$href])) continue;
            $title = hd(preg_replace('/\s+/', ' ', trim(strip_tags($m[2]))));
            // Skip when the anchor only contains an image (no text)
            if (!$title || mb_strlen($title) < 3) continue;
            // Skip generic navigation links
            $titleLow = mb_strtolower($title, 'UTF-8');
            if (preg_match('~^(suite\.{0,3}|voir toute la liste|cliquez|accueil)~u', $titleLow)) continue;
            $seen[$href] = true;
            // Extrait un titre depuis le slug URL (souvent plus complet que le
            // texte tronqué du <a> dans les listings). Ex :
            //   /film-gratuit/91280-telecharger-a-marvel-television-special-presentation-the-punisher-one-last-kill-web-dl-1080p-multi.html
            //   → "a marvel television special presentation the punisher one last kill web dl 1080p multi"
            $slugTitle = '';
            if (preg_match('~/\d+-(?:telecharger-)?([^/]+?)\.html~i', $href, $sm)) {
                $slugTitle = str_replace('-', ' ', $sm[1]);
                $slugTitle = preg_replace('/\s+/', ' ', trim($slugTitle));
            }
            $results[] = ['title' => $title, 'pageUrl' => $href, 'slugTitle' => $slugTitle];
        }
    }
    return $results;
}

/**
 * Build a search URL for zone-telechargement (DataLife Engine).
 * subaction=search + story=... + result_from optional.
 */
function zt_search_url(string $query, string $category = ''): string {
    // Si une catégorie est fournie, on recherche dans cette section uniquement via search.xfsearch
    // L'URL de recherche standard fonctionne globalement, on filtrera après par catégorie côté code.
    return BASE_URL . '/index.php?do=search&subaction=search&story=' . rawurlencode($query);
}

function zt_search(string $query): array {
    // ZT search uses POST (form action="/"), but DLE supports GET on index.php?do=search aussi.
    // On essaie GET d'abord, fallback POST si rien.
    $url = zt_search_url($query);
    $html = http_fetch($url);
    $items = scrape_listing($html ?: '');
    if (!empty($items)) return $items;

    // Fallback POST sur la racine avec champ "q"
    $html2 = http_fetch(BASE_URL . '/', 15, 'POST', ['q' => $query]);
    return scrape_listing($html2 ?: '');
}

/**
 * Détermine la catégorie ZT (slug) à partir d'une URL détail.
 */
function category_from_url(string $url): string {
    if (preg_match('~/([\w-]+)/\d+-[^/]+\.html~', $url, $m)) return $m[1];
    return '';
}

/**
 * Filtre les items de listing pour ne garder que ceux d'une famille de catégories.
 */
function filter_by_category(array $items, array $catSlugs): array {
    if (empty($catSlugs)) return $items;
    $out = [];
    foreach ($items as $it) {
        $c = category_from_url($it['pageUrl']);
        if (in_array($c, $catSlugs, true)) $out[] = $it;
    }
    return $out;
}

// ═════════════════════════════════════════════════════════════
// DETAIL PAGE SCRAPER
// ═════════════════════════════════════════════════════════════
/**
 * Parse une page détail zone-telechargement.org.
 * Retourne meta + downloadLinks + streamLinks + quality + lang.
 */
function scrape_detail_html(string $html, string $pageUrl = '', bool $isSerie = false): array {
    if (!$html) return [
        'meta' => [], 'quality' => '', 'lang' => '', 'size' => '',
        'season' => null, 'episode' => null,
        'streamLinks' => [], 'downloadLinks' => [],
    ];

    // ── Titre h1 ────────────────────────────────────────────
    $title = '';
    if (preg_match('~<h1[^>]*>(.*?)</h1>~si', $html, $m)) {
        $title = hd(trim(strip_tags($m[1])));
    }

    // ── Récupération de la zone "centersideinn" / "dle-content" ──
    // On isole la zone de contenu pour éviter de scraper le menu/sidebar.
    $content = $html;
    if (preg_match('~<div\s+id=["\']dle-content["\'][^>]*>(.*?)<div\s+class=["\']pheading~si', $html, $cm)) {
        $content = $cm[1];
    }

    // ── Titre principal de la fiche (gros texte 24px) ────────
    $bigTitle = '';
    if (preg_match('~font-size:\s*24px[^"\']*["\'][^>]*>(.*?)</div>~si', $content, $bm)) {
        $bigTitle = hd(trim(strip_tags($bm[1])));
    }
    if (!$bigTitle) $bigTitle = $title;

    // ── Poster (image principale dans la fiche) ──────────────
    // Accepte les chemins relatifs (/img/films/...) ainsi que les hébergeurs
    // externes (zone-images.com/uploads/..., etc.). Pour les pages jeux/musique
    // l'image est souvent sur zone-images.com.
    $poster = '';
    $posterPatterns = [
        // /img/{categorie}/...
        '~<img[^>]+src=["\']((?:https?://[^"\']*zone-telechargement[^"\']*)?/img/(?:films?|series?|animes|jeux|musique|musiques|ebooks?|logiciels?|documentaires?|emissions?|spectacles?|concerts?|sports?|autoformations?)/[^"\']+\.(?:webp|jpg|png|jpeg))["\']~i',
        // zone-images.com (utilisé surtout sur les pages non-films)
        '~<img[^>]+src=["\'](https?://(?:www\.)?zone-images\.com/[^"\']+\.(?:webp|jpg|png|jpeg))["\']~i',
        // Fallback: première grosse image absolue qui n'est ni un hébergeur connu
        // ni un asset interne (logs/synopsis/infos_upload).
    ];
    foreach ($posterPatterns as $pp) {
        if (preg_match($pp, $content, $pm)) { $poster = $pm[1]; break; }
    }
    if ($poster && strpos($poster, 'http') !== 0) {
        $poster = rtrim(BASE_URL, '/') . $poster;
    }

    // ── Méta (Origine, Réalisation, Acteur(s), Genre, Date, Note) ──
    $meta = ['title' => $bigTitle, 'poster' => $poster];
    $metaLabels = [
        'Origine'          => 'origin',
        'Réalisation'      => 'director',
        'Acteur(s)'        => 'actors',
        'Acteurs'          => 'actors',
        'Genre'            => 'genres',
        'Date de sortie'   => 'release_date',
        'Note'             => 'rating',
        'Titre original'   => 'original_title',
        'Durée'            => 'duration',
        'Année'            => 'year',
        'Développement'    => 'developer',
        'Développeur'      => 'developer',
        'Édition'          => 'publisher',
        'Editeur'          => 'publisher',
        'Éditeur'          => 'publisher',
        'Plateforme'       => 'platform',
        'Plateformes'      => 'platform',
        'Date de parution' => 'release_date',
        'Mode(s)'          => 'modes',
        'Mode'             => 'modes',
        'Artiste'          => 'artist',
        'Album'            => 'album',
        'Auteur'           => 'author',
        'Auteur(s)'        => 'author',
        'Langue'           => 'lang_meta',
        'Format'           => 'format_meta',
        'Taille'           => 'size_meta',
    ];
    foreach ($metaLabels as $lbl => $key) {
        // Plus tolérant : le ":" peut être avant OU après </strong>/</b>,
        // et l'ouverture peut être <strong> ou <b> avec ou sans <u>.
        $re = '~<(?:strong|b)>\s*(?:<u>)?\s*' . preg_quote($lbl, '~')
            . '\s*(?::\s*)?</u>\s*(?::\s*)?</(?:strong|b)>\s*:?\s*([^<\n]{1,400})~siu';
        if (preg_match($re, $content, $mm)) {
            $val = hd(trim(strip_tags($mm[1])));
            $val = trim($val, " :\t\n\r\0\x0B");
            if ($val && !isset($meta[$key])) $meta[$key] = $val;
            continue;
        }
        // Fallback sans <u>
        $re2 = '~<(?:strong|b)>\s*' . preg_quote($lbl, '~')
             . '\s*(?::\s*)?</(?:strong|b)>\s*:?\s*([^<\n]{1,400})~siu';
        if (preg_match($re2, $content, $mm)) {
            $val = hd(trim(strip_tags($mm[1])));
            $val = trim($val, " :\t\n\r\0\x0B");
            if ($val && !isset($meta[$key])) $meta[$key] = $val;
        }
    }
    // Synopsis : <em> (films) OU <i> (selon pages) OU bloc après "synopsis.png"
    if (preg_match('~<(?:em|i)>([^<]{30,3000})</(?:em|i)>~si', $content, $sm)) {
        $meta['synopsis'] = hd(trim(strip_tags($sm[1])));
    }
    if (empty($meta['synopsis'])
        && preg_match('~synopsis\.png[^>]*>\s*(?:<br\s*/?>\s*)*(.{30,3000}?)(?:<img|<a\s+class=["\']btnToLink|Qualit[eé]\s*[A-Z])~si', $content, $sm)) {
        $txt = hd(trim(strip_tags($sm[1])));
        $txt = preg_replace('/\s+/u', ' ', $txt);
        if (mb_strlen($txt) >= 30) $meta['synopsis'] = $txt;
    }

    // ── Qualité & Langue depuis le bandeau "Qualité X | LANG" ──
    $quality = '';
    $lang    = '';
    if (preg_match('~Qualit[eé]\s*([^|<]+)\s*\|\s*([A-ZÉ]+)~iu', $content, $qm)) {
        $quality = strtoupper(trim($qm[1]));
        $lang    = strtoupper(trim($qm[2]));
    }
    // Fallback : extraire depuis le titre h1
    if (!$quality && $bigTitle) {
        $qPatterns = [
            '~\b(ULTRA\s*HD\s*\(?X265\)?|ULTRA\s*HD\s*4K|WEB[-\s]?DL\s*2160p|4K\s*BLU\s*RAY|4K)\b~i',
            '~\b(BLU[-\s]?RAY\s*1080p?|BDRIP\s*1080p?|BDREMUX|BLURAY\s*REMUX\s*1080p?)\b~i',
            '~\b(WEB[-\s]?DL\s*1080p\s*x265|WEB[-\s]?DL\s*1080p\s*x264|WEB[-\s]?DL\s*1080p|WEBRIP\s*1080p?|HDLIGHT\s*1080p?|HD\s*1080p)\b~i',
            '~\b(WEB[-\s]?DL\s*720p\s*x265|WEB[-\s]?DL\s*720p|WEBRIP\s*720p?|HDLIGHT\s*720p?|BLU[-\s]?RAY\s*720p?|HD\s*720p)\b~i',
            '~\b(HDRIP|BDRIP|DVDRIP\s*MKV|DVDRIP|HDTS|TELE[-\s]?SYNC|CAM|HDCAM|TC|TS)\b~i',
            '~\b(WEBRIP|WEB[-\s]?DL|BLURAY|BLU[-\s]?RAY|HDLIGHT)\b~i',
            '~\b(EXE|ISO|IMG|MP3|FLAC|M4A|EPUB|PDF|CBR|CBZ|APK)\b~i',
            '~\b(1080p?|720p?|480p?|2160p|UHD)\b~i',
        ];
        foreach ($qPatterns as $qp) {
            if (preg_match($qp, $bigTitle, $qmm)) {
                $quality = strtoupper(preg_replace('/\s+/', ' ', trim($qmm[1])));
                break;
            }
        }
    }
    if (!$lang && $bigTitle) {
        if (preg_match('~\((TRUEFRENCH|VOSTFR|MULTI|FRENCH|VFSTFR|VF|VO)\)~i', $bigTitle, $lm)) {
            $lang = strtoupper($lm[1]);
        }
    }

    // ── Saison / Épisode depuis le bandeau ──
    $pageSeInfo = ['season' => null, 'episode' => null];
    if (preg_match('~Episode\s+(\d{1,3})\s*\|\s*Saison\s*(\d{1,2})~iu', $content, $sem)) {
        $pageSeInfo['episode'] = (int)$sem[1];
        $pageSeInfo['season']  = (int)$sem[2];
    } else {
        $pageSeInfo = extract_season_episode($bigTitle . ' ' . $pageUrl);
    }

    // ── Taille globale ──
    $globalSize = '';
    if (preg_match('~Taille\s*:?\s*</(?:strong|b|u|td)>\s*<[^>]*>?\s*([^<\n]{1,30})~si', $content, $sz)) {
        $globalSize = hd(trim(strip_tags($sz[1])));
    }
    if (!$globalSize && preg_match('~Taille\s*:?\s*<[^>]+>([^<]{1,30})~si', $content, $sz)) {
        $globalSize = hd(trim(strip_tags($sz[1])));
    }

    // ════════════════════════════════════════════════════════
    // EXTRACTION DES LIENS DDL & STREAMING
    // ════════════════════════════════════════════════════════
    //
    // Structure rencontrée dans <div class="postinfo"> :
    //   <img src=".../img/{host}.png">  → indique l'hébergeur DDL
    //   <a class="btnToLink" href="zoneurs.net/?url=BASE64">Episode 1</a>
    //   <a class="btnToLink" href="...">Episode 2</a>
    //   ...
    //
    // Puis un marqueur "▶ Regarder en Streaming" suivi de :
    //   <a class="btnToLink" href="...">Hostname - Episode 1</a>
    //
    // Stratégie : on parcourt le HTML séquentiellement et on garde un état :
    //   - $currentHost : dernier host vu (via <img src=".../img/X.png"> ou <div>HostName</div>)
    //   - $inStream    : true après avoir vu le marqueur "Regarder en Streaming"
    //
    $streamLinks   = [];
    $downloadLinks = [];

    // On travaille uniquement sur la zone contenu (entre <div class="postinfo">...).
    // Il peut y avoir plusieurs postinfo / sections. On capture tout le bloc news-id-* ou postinfo.
    $contentZone = $content;
    if (preg_match('~<div\s+id=["\']news-id-\d+["\'][^>]*>(.*?)<div\s+style=["\']bottom~si', $content, $nm)) {
        $contentZone = $nm[1];
    }

    // Token-based parsing : on extrait tous les "tokens d'intérêt" dans l'ordre
    // (img-host, text-host-marker, stream-marker, link-anchor).
    $tokens = [];
    $tokenRe = '~'
        . '(?P<imgHost><img[^>]+src=["\'](?:https?://[^"\']*)?/img/([\w.\-]+)\.png["\'][^>]*>)'
        . '|'
        // Texte "Hostname" sous forme de <div ...>Send.now</div> (host sans icône)
        . '(?P<textHost><div[^>]*font-weight\s*:\s*bold[^>]*>\s*([\w.\-]{2,40})\s*</div>)'
        . '|'
        // Marqueur streaming "▶ Regarder en Streaming"
        . '(?P<streamMarker>▶\s*Regarder\s+en\s+Streaming)'
        . '|'
        // Marqueur DDL alternatif
        . '(?P<dlMarker>(?:Lien[s]?\s+de\s+)?T[ée]l[ée]chargement[^<]{0,40})'
        . '|'
        // Lien btnToLink
        . '(?P<link><a[^>]*class=["\'][^"\']*btnToLink[^"\']*["\'][^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>)'
        . '~siu';

    if (preg_match_all($tokenRe, $contentZone, $tokenMatches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE)) {
        $currentHost = '';
        $inStream    = false;
        $seenUrls    = [];

        foreach ($tokenMatches as $tk) {
            if (!empty($tk['imgHost'][0])) {
                $hostKey = strtolower($tk[2][0]);
                $currentHost = HOST_PATTERNS[$hostKey] ?? ucfirst($hostKey);
                continue;
            }
            if (!empty($tk['textHost'][0])) {
                $candidate = trim($tk[4][0]);
                $candLow   = strtolower($candidate);
                // Whitelist : doit correspondre à un host connu
                if (isset(HOST_PATTERNS[$candLow])) {
                    $currentHost = HOST_PATTERNS[$candLow];
                } else {
                    foreach (HOST_PATTERNS as $pat => $label) {
                        if (strpos($candLow, $pat) !== false) { $currentHost = $label; break; }
                    }
                }
                continue;
            }
            if (!empty($tk['streamMarker'][0])) {
                $inStream    = true;
                $currentHost = ''; // hosts du stream sont dans le texte du lien
                continue;
            }
            if (!empty($tk['dlMarker'][0])) {
                $inStream = false;
                continue;
            }
            if (!empty($tk['link'][0])) {
                // Indices positionnels avec alternance :
                // [1]=imgHost, [2]=imgHostName, [3]=textHost, [4]=textHostName,
                // [5]=streamMarker, [6]=dlMarker, [7]=link, [8]=href, [9]=linkText
                $rawHref  = hd(trim($tk[8][0]));
                // Normalise les URLs protocol-relative (//host/path → https://...)
                if (strpos($rawHref, '//') === 0) {
                    $rawHref = 'https:' . $rawHref;
                }
                $rawText  = hd(preg_replace('/\s+/', ' ', trim(strip_tags($tk[9][0]))));
                if (!is_valid_link($rawHref, $rawText)) continue;

                $hostInfo  = extract_host_and_protection($rawHref, $rawText);
                $realUrl   = $hostInfo['realUrl'];
                if (isset($seenUrls[$realUrl])) continue;
                $seenUrls[$realUrl] = true;

                // Filename + Episode/Saison
                $episode = null;
                $season  = $pageSeInfo['season'] ?? null;
                $filename = $rawText;

                if (preg_match('/Episode\s+(\d{1,3})/iu', $rawText, $em)) {
                    $episode = (int)$em[1];
                }
                if (preg_match('/Saison\s+(\d{1,2})/iu', $rawText, $sm2)) {
                    $season = (int)$sm2[1];
                }

                // Host detection : pour streaming, dans le texte ; pour DDL, $currentHost.
                $host = '';
                if ($inStream) {
                    // texte "Hostname - Episode 1" → host = avant le " - "
                    if (preg_match('~^([\w.\-]+)\s*[-–]\s*Episode~iu', $rawText, $hm)) {
                        $rawHostName = $hm[1];
                        $rhLow = strtolower($rawHostName);
                        $host = HOST_PATTERNS[$rhLow] ?? null;
                        if (!$host) {
                            foreach (HOST_PATTERNS as $pat => $label) {
                                if (strpos($rhLow, $pat) !== false) { $host = $label; break; }
                            }
                        }
                        if (!$host) $host = $rawHostName;
                    } else {
                        $host = $hostInfo['host'];
                    }
                } else {
                    $host = $currentHost ?: $hostInfo['host'];
                }

                // filename pour les séries : "Épisode X - Saison Y"
                if ($isSerie && $episode) {
                    $filename = 'Épisode ' . $episode;
                    if ($season) $filename .= ' - Saison ' . $season;
                }

                $entry = [
                    'host'       => $host,
                    'protection' => $hostInfo['protection'],
                    'filename'   => $filename,
                    'size'       => $globalSize,
                    'url'        => $realUrl,            // URL directe vers l'hébergeur (décodée si zoneurs)
                    'season'     => $season,
                    'episode'    => $episode,
                ];

                // Classification : marqueur stream, ou host connu comme streaming
                $finalIsStream = $inStream;
                $realLow = strtolower($realUrl);
                foreach (STREAM_HOST_PATTERNS as $sp) {
                    if (strpos($realLow, $sp) !== false) { $finalIsStream = true; break; }
                }

                if ($finalIsStream) {
                    $streamLinks[] = $entry;
                } else {
                    $downloadLinks[] = $entry;
                }
            }
        }
    }

    return [
        'meta'          => $meta,
        'quality'       => $quality,
        'lang'          => $lang,
        'size'          => $globalSize,
        'season'        => $pageSeInfo['season'] ?? null,
        'episode'       => $pageSeInfo['episode'] ?? null,
        'streamLinks'   => $streamLinks,
        'downloadLinks' => $downloadLinks,
    ];
}

// ═════════════════════════════════════════════════════════════
// GROUPING & TMDB MERGE FOR LISTING RESULTS
// ═════════════════════════════════════════════════════════════
function group_results(array $items, bool $supportsTmdb, string $tmdbSType): array {
    $groups = [];
    foreach ($items as $item) {
        // Préférer le titre extrait du slug URL quand il est sensiblement plus
        // complet que le texte du <a> du listing (que ZT tronque parfois).
        $rawTitle = $item['title'];
        $slug     = $item['slugTitle'] ?? '';
        if ($slug && mb_strlen($slug) > mb_strlen($rawTitle) + 8) {
            $rawTitle = $slug;
        }
        $clean = clean_title($rawTitle);
        $norm  = normalize_title($clean);
        $year  = extract_year_from_title($rawTitle) ?: extract_year_from_title($slug);
        if (!isset($groups[$norm])) {
            $groups[$norm] = ['title' => $clean, 'pageUrls' => [], 'year' => $year, 'slugTitle' => $slug];
        }
        if (!in_array($item['pageUrl'], $groups[$norm]['pageUrls'])) {
            $groups[$norm]['pageUrls'][] = $item['pageUrl'];
        }
        if (!$groups[$norm]['year'] && $year) $groups[$norm]['year'] = $year;
        // Garde le slug le plus long si plusieurs items se groupent
        if ($slug && mb_strlen($slug) > mb_strlen($groups[$norm]['slugTitle'])) {
            $groups[$norm]['slugTitle'] = $slug;
        }
    }

    $tmdbByNorm = [];
    if ($supportsTmdb && !empty($groups)) {
        $tmdbUrls = [];
        foreach ($groups as $norm => $g) {
            $tmdbUrls[$norm] = 'https://api.themoviedb.org/3/search/' . $tmdbSType
                . '?api_key=' . TMDB_API_KEY . '&language=fr-FR&query=' . rawurlencode($g['title'])
                . ($g['year'] ? '&' . ($tmdbSType === 'tv' ? 'first_air_date_year' : 'year') . '=' . $g['year'] : '');
        }
        $raws = http_fetch_multi(array_values($tmdbUrls), 8);
        foreach ($tmdbUrls as $norm => $tUrl) {
            $raw = $raws[$tUrl] ?? null;
            if (!$raw) continue;
            $d = json_decode($raw, true);
            if (empty($d['results'])) continue;

            // 1) Si on a une année, on privilégie un résultat avec la même année.
            $best = null;
            if ($groups[$norm]['year']) {
                foreach ($d['results'] as $r) {
                    $ry = substr($r['release_date'] ?? $r['first_air_date'] ?? '', 0, 4);
                    if ($ry === $groups[$norm]['year']) { $best = $r; break; }
                }
            }

            // 2) Sinon (ou si l'année n'a rien donné) on cherche le premier
            //    résultat dont le titre matche réellement le groupe ZT.
            //    Cela évite que "Avatar" (sans année) soit mappé sur
            //    "Avatar: De feu et de cendres" qui est juste le best-match récent.
            if (!$best) {
                foreach (array_slice($d['results'], 0, 8) as $r) {
                    $cand = tmdb_normalize($r);
                    if (title_matches_tmdb($groups[$norm]['title'], $cand, $groups[$norm]['year'], $groups[$norm]['slugTitle'] ?? '')) {
                        $best = $r;
                        break;
                    }
                }
            }

            // 3) Fallback final : on garde le best-match brut (sera quand même
            //    re-validé plus bas avant fusion par tmdbId).
            if (!$best) $best = $d['results'][0];

            $tmdbByNorm[$norm] = tmdb_normalize($best);
        }
    }

    $byTmdb  = [];
    $results = [];
    foreach ($groups as $norm => $g) {
        $td = $tmdbByNorm[$norm] ?? null;

        // VALIDATION : on n'accepte le match TMDB que s'il correspond vraiment
        // au titre du groupe. Évite la fusion abusive (ex: "Avatar" + "Avatar: De
        // feu et de cendres" qui pointent tous deux vers le best-match TMDB le
        // plus récent, ce qui absorbait les versions Avatar 2009).
        if ($td && !title_matches_tmdb($g['title'], $td, $g['year'], $g['slugTitle'] ?? '')) {
            $td = null;
        }

        if ($td) {
            $tid = $td['id'];
            if (isset($byTmdb[$tid])) {
                foreach ($g['pageUrls'] as $pu) {
                    if (!in_array($pu, $results[$byTmdb[$tid]]['pageUrls']))
                        $results[$byTmdb[$tid]]['pageUrls'][] = $pu;
                }
                continue;
            }
            $byTmdb[$tid] = $norm;
        }
        $results[$norm] = [
            'id'            => $norm,
            'title'         => $td ? $td['title'] : $g['title'],
            'cleanTitle'    => $g['title'],
            'tmdbId'        => $td ? $td['id'] : null,
            'poster'        => $td && $td['poster_path'] ? 'https://image.tmdb.org/t/p/w500' . $td['poster_path'] : null,
            'year'          => $td ? substr($td['release_date'], 0, 4) : ($g['year'] ?: null),
            'synopsis'      => $td ? $td['overview'] : null,
            'originalTitle' => $td ? $td['original_title'] : null,
            'pageUrls'      => $g['pageUrls'],
            'pageUrl'       => $g['pageUrls'][0],
        ];
    }
    return array_values($results);
}

/**
 * Enrichit chaque carte de résultats avec les méta-données scrapées
 * sur les pages détail ZT : jaquette, synopsis, année, origine, réalisation,
 * acteurs, genre, note, durée, etc. Fonctionne pour tous les types (films,
 * séries, jeux, musique, ebooks, logiciels...). Fetch parallèle.
 *
 * Les méta-données sont promues au niveau racine de la carte (et aussi
 * copiées dans `details` pour la rétro-compat). Si la carte a déjà un
 * champ (ex: poster TMDB), il est préservé.
 *
 * @param array $results       liste des cartes produites par group_results()
 * @param int   $maxCards      nombre maximum de cartes à enrichir (perf)
 * @param int   $maxUrlsPerCard nombre max de pageUrls à fetcher par carte
 * @return array results enrichis (modification in-place)
 */
function enrich_non_tmdb_cards(array $results, int $maxCards = 12, int $maxUrlsPerCard = 3): array {
    if (empty($results)) return $results;
    $sliced = array_slice($results, 0, $maxCards, true);
    $allPageUrls = [];
    foreach ($sliced as $card) {
        foreach (array_slice($card['pageUrls'], 0, $maxUrlsPerCard) as $pu) {
            $allPageUrls[] = $pu;
        }
    }
    $allPageUrls = array_values(array_unique($allPageUrls));
    if (empty($allPageUrls)) return $results;
    $htmlByUrl = http_fetch_multi($allPageUrls);

    // Champs méta à exposer au top-level (en plus de details)
    $TOPLEVEL_FIELDS = [
        'origin','director','actors','genres','release_date','rating',
        'duration','developer','publisher','platform','modes','artist',
        'album','author','lang_meta','format_meta','size_meta','original_title',
    ];

    foreach ($sliced as $idx => $card) {
        $allQualities = [];
        $cardMeta     = [];
        foreach (array_slice($card['pageUrls'], 0, $maxUrlsPerCard) as $pu) {
            $html = $htmlByUrl[$pu] ?? null;
            if (!$html) continue;
            $r = scrape_detail_html($html, $pu, false);

            // Capture la première méta disponible (priorité aux fiches avec jaquette)
            if (!empty($r['meta'])) {
                if (empty($cardMeta)) {
                    $cardMeta = $r['meta'];
                } elseif (empty($cardMeta['poster']) && !empty($r['meta']['poster'])) {
                    $cardMeta = array_merge($r['meta'], $cardMeta);
                    $cardMeta['poster'] = $r['meta']['poster'];
                }
                // Complète les champs manquants au fil des pages
                foreach ($r['meta'] as $k => $v) {
                    if (!isset($cardMeta[$k]) && !empty($v)) $cardMeta[$k] = $v;
                }
            }

            $hasLinks = !empty($r['downloadLinks']) || !empty($r['streamLinks']);
            if (!$hasLinks && !$r['quality']) continue;

            $key = ($r['quality'] ?: 'Inconnu') . '||' . ($r['lang'] ?: '');
            $found = false;
            foreach ($allQualities as &$q) {
                if ($q['_key'] === $key) {
                    foreach ($r['downloadLinks'] as $dl) {
                        if (!in_array($dl['url'], array_column($q['downloadLinks'], 'url')))
                            $q['downloadLinks'][] = $dl;
                    }
                    foreach ($r['streamLinks'] as $sl) {
                        if (!in_array($sl['url'], array_column($q['streamLinks'], 'url')))
                            $q['streamLinks'][] = $sl;
                    }
                    $found = true; break;
                }
            }
            unset($q);
            if (!$found) {
                $allQualities[] = [
                    '_key'          => $key,
                    'quality'       => $r['quality'] ?: 'Inconnu',
                    'lang'          => $r['lang'],
                    'size'          => $r['size'],
                    'downloadLinks' => $r['downloadLinks'],
                    'streamLinks'   => $r['streamLinks'],
                    'pageUrl'       => $pu,
                ];
            }
        }
        foreach ($allQualities as &$q) unset($q['_key']); unset($q);
        $allQualities = array_values(array_filter($allQualities, function ($q) {
            return !empty($q['downloadLinks']) || !empty($q['streamLinks']);
        }));
        $totalLinks = array_sum(array_map(
            fn($q) => count($q['downloadLinks']) + count($q['streamLinks']),
            $allQualities
        ));

        if (!empty($cardMeta)) {
            // Poster : ZT en fallback seulement (TMDB déjà prioritaire)
            if (!empty($cardMeta['poster']) && empty($results[$idx]['poster'])) {
                $results[$idx]['poster'] = $cardMeta['poster'];
            }
            // Synopsis : ZT en fallback seulement
            if (!empty($cardMeta['synopsis']) && empty($results[$idx]['synopsis'])) {
                $results[$idx]['synopsis'] = $cardMeta['synopsis'];
            }
            // Promotion au top-level de toutes les méta-données ZT
            foreach ($TOPLEVEL_FIELDS as $k) {
                if (!empty($cardMeta[$k]) && empty($results[$idx][$k])) {
                    $results[$idx][$k] = $cardMeta[$k];
                }
            }
            // Bloc details (rétro-compat)
            $details = [];
            foreach ($TOPLEVEL_FIELDS as $k) {
                if (!empty($cardMeta[$k])) $details[$k] = $cardMeta[$k];
            }
            if (!empty($cardMeta['year']))         $details['year']        = $cardMeta['year'];
            if (!empty($cardMeta['release_date'])) $details['release_date']= $cardMeta['release_date'];
            if (!empty($details)) $results[$idx]['details'] = $details;

            // Année : ZT en fallback si pas déjà fournie par TMDB
            if (empty($results[$idx]['year'])) {
                if (!empty($cardMeta['year'])) {
                    $results[$idx]['year'] = $cardMeta['year'];
                } elseif (!empty($cardMeta['release_date'])
                          && preg_match('/\b(19\d{2}|20\d{2})\b/', $cardMeta['release_date'], $ym)) {
                    $results[$idx]['year'] = $ym[1];
                }
            }
        }

        $results[$idx]['qualities']  = $allQualities;
        $results[$idx]['totalLinks'] = $totalLinks;
    }
    return $results;
}

// ═════════════════════════════════════════════════════════════
// MERGE QUALITIES (parallel fetch of detail pages)
// ═════════════════════════════════════════════════════════════
function filter_links_by_year(array $links, string $year): array {
    if (!$year) return $links;
    return array_values(array_filter($links, function ($lk) use ($year) {
        if (empty($lk['filename'])) return true;
        if (preg_match('/\b(19\d{2}|20\d{2})\b/', $lk['filename'], $m)) {
            return $m[1] === $year;
        }
        return true;
    }));
}

function merge_qualities(array $urlList, string $year = '', bool $isSerie = false,
                         int $filterSeason = 0, int $filterEpisode = 0): array {
    if (empty($urlList)) return ['qualities' => [], 'meta' => []];
    $htmlByUrl = http_fetch_multi($urlList);
    $allQualities = [];
    $mainMeta = [];

    foreach ($urlList as $pageUrl) {
        $html = $htmlByUrl[$pageUrl] ?? null;
        if (!$html) continue;
        $r = scrape_detail_html($html, $pageUrl, $isSerie);
        if (!$mainMeta && !empty($r['meta']['title'])) $mainMeta = $r['meta'];

        if ($year) {
            $r['downloadLinks'] = filter_links_by_year($r['downloadLinks'], $year);
            $r['streamLinks']   = filter_links_by_year($r['streamLinks'], $year);
        }

        if ($isSerie && $filterSeason > 0) {
            $r['downloadLinks'] = array_values(array_filter($r['downloadLinks'],
                fn($lk) => ($lk['season'] ?? 0) == $filterSeason));
            $r['streamLinks']   = array_values(array_filter($r['streamLinks'],
                fn($lk) => ($lk['season'] ?? 0) == $filterSeason));
        }
        if ($isSerie && $filterEpisode > 0) {
            $r['downloadLinks'] = array_values(array_filter($r['downloadLinks'],
                fn($lk) => ($lk['episode'] ?? 0) == $filterEpisode));
            $r['streamLinks']   = array_values(array_filter($r['streamLinks'],
                fn($lk) => ($lk['episode'] ?? 0) == $filterEpisode));
        }

        $hasLinks = !empty($r['downloadLinks']) || !empty($r['streamLinks']);
        if (!$hasLinks && !$r['quality']) continue;

        $key = ($r['quality'] ?: 'Inconnu') . '||' . ($r['lang'] ?: '');
        $found = false;
        foreach ($allQualities as &$q) {
            if ($q['_key'] === $key) {
                foreach ($r['downloadLinks'] as $dl) {
                    if (!in_array($dl['url'], array_column($q['downloadLinks'], 'url')))
                        $q['downloadLinks'][] = $dl;
                }
                foreach ($r['streamLinks'] as $sl) {
                    if (!in_array($sl['url'], array_column($q['streamLinks'], 'url')))
                        $q['streamLinks'][] = $sl;
                }
                $found = true; break;
            }
        }
        unset($q);
        if (!$found) {
            $allQualities[] = [
                '_key'          => $key,
                'quality'       => $r['quality'] ?: 'Inconnu',
                'lang'          => $r['lang'],
                'size'          => $r['size'],
                'season'        => $r['season'],
                'episode'       => $r['episode'],
                'downloadLinks' => $r['downloadLinks'],
                'streamLinks'   => $r['streamLinks'],
                'pageUrl'       => $pageUrl,
            ];
        }
    }
    foreach ($allQualities as &$q) unset($q['_key']); unset($q);

    $allQualities = array_values(array_filter($allQualities, function ($q) {
        return !empty($q['downloadLinks']) || !empty($q['streamLinks']);
    }));

    usort($allQualities, function ($a, $b) {
        $rank = function ($q) {
            $u = strtoupper($q);
            if (strpos($u, '4K') !== false || strpos($u, '2160') !== false || strpos($u, 'UHD') !== false) return 0;
            if (strpos($u, '1080') !== false) return 1;
            if (strpos($u, '720')  !== false) return 2;
            return 3;
        };
        return $rank($a['quality']) - $rank($b['quality']);
    });
    return ['qualities' => $allQualities, 'meta' => $mainMeta];
}

// ═════════════════════════════════════════════════════════════
// HELPERS TYPES & CATEGORIES
// ═════════════════════════════════════════════════════════════

/**
 * Registre exhaustif des sous-catégories ZT, regroupées par type principal.
 * Permet : (1) filtrage fin via ?type=<slug>, (2) endpoint /categories pour
 * découvrir les sous-types, (3) mapping label → slug.
 */
function zt_category_registry(): array {
    static $cats = null;
    if ($cats !== null) return $cats;
    $cats = [
        'movie' => [
            'label' => 'Films',
            'tmdb'  => 'movie',
            'subs'  => [
                'film-gratuit'              => 'Tous les Films',
                'nouveaux-films'            => 'Nouveaux Films',
                'film-vostfr'               => 'Films VOSTFR',
                'film-vfstfr'               => 'Films VFSTFR',
                'film-bluray-hd'            => 'Films BluRay HD',
                'films-ultra-hd-4k'         => 'Films Ultra HD 4K',
                'film-bluray-3d'            => 'Films BluRay 3D',
                'film-x265-x264-hdlight'    => 'Films HDLight (x265/x264)',
                'film-dvdrip-bdrip'         => 'Films DVDRip/BDRip',
                'film-mkv'                  => 'Films MKV',
                'tscam-films-2020'          => 'Films TS/Cam',
                'films-vo'                  => 'Films VO',
                'dessins-animes'            => 'Dessins animés',
                'collections-films-integrale' => 'Collections / Intégrale',
            ],
        ],
        'tv' => [
            'label' => 'Séries',
            'tmdb'  => 'tv',
            'subs'  => [
                'telecharger-serie'  => 'Toutes les Séries',
                'serie-vf'           => 'Séries VF',
                'serie-vf-en-hd'     => 'Séries VF 720p',
                'serie-vf-1080p'     => 'Séries VF 1080p',
                'serie-vostfr'       => 'Séries VOSTFR',
                'serie-vostfr-hd'    => 'Séries VOSTFR 720p',
                'serie-vostfr-1080p' => 'Séries VOSTFR 1080p',
                'serie-vo'           => 'Séries VO',
                'ancienne-serie'     => 'Anciennes Séries',
            ],
        ],
        'anime' => [
            'label' => 'Animes',
            'tmdb'  => 'tv',
            'subs'  => [
                'animes'              => 'Tous les Animes',
                'animes-vostfr'       => 'Animes VOSTFR',
                'animes-vostfr-720p'  => 'Animes VOSTFR 720p',
                'animes-vostfr-1080p' => 'Animes VOSTFR 1080p',
                'animes-vf'           => 'Animes VF',
                'animes-vf-720p'      => 'Animes VF 720p',
                'animes-vf-1080p'     => 'Animes VF 1080p',
                'animes-vosten'       => 'Animes VOSTEN',
                'films-mangas'        => 'Films Mangas',
                'oav'                 => 'OAV',
            ],
        ],
        'jeux' => [
            'label' => 'Jeux',
            'tmdb'  => null,
            'subs'  => [
                'jeux-gratuit'       => 'Tous les Jeux',
                'jeux-pc'            => 'Jeux PC',
                'jeux-xbox360'       => 'Xbox 360',
                'jeux-ps3'           => 'PS3',
                'jeux-wii-ds'        => 'Nintendo DS & 3DS',
                'jeux-wii'           => 'Nintendo Wii',
                'jeux-psp'           => 'PSP',
                'jeux-mac'           => 'Jeux Mac',
                'jeux-objets-caches' => "Jeux d'objets cachés",
                'nintendo-switch'    => 'Nintendo Switch',
            ],
        ],
        'musique' => [
            'label' => 'Musiques',
            'tmdb'  => null,
            'subs'  => [
                'musique-mp3-gratuite' => 'Musique MP3',
                'musiques-enfants'     => 'Musiques pour enfants',
            ],
        ],
        'ebook' => [
            'label' => 'E-books',
            'tmdb'  => null,
            'subs'  => [
                'ebooks'        => 'Tous les E-books',
                'livre-audio'   => 'Audio Books',
                'magazines'     => 'Magazines',
                'journaux'      => 'Journaux',
                'livres'        => 'Livres',
                'bandeessinee'  => 'Bande Dessinée',
            ],
        ],
        'logiciel' => [
            'label' => 'Logiciels',
            'tmdb'  => null,
            'subs'  => [
                'logiciels' => 'Tous les Logiciels',
            ],
        ],
        'documentaire' => [
            'label' => 'Documentaires',
            'tmdb'  => null,
            'subs'  => [
                'documentaire-gratuit' => 'Tous les Documentaires',
            ],
        ],
        'emission' => [
            'label' => 'Émissions TV',
            'tmdb'  => null,
            'subs'  => [
                'emissions-tv'                              => 'Toutes les Émissions TV',
                'emissions-tv-reportages-investigations'    => 'Reportages, Investigations',
                'emissions-tv-divertissements'              => 'Divertissements',
                'emissions-tv-telerealite'                  => 'Téléréalité',
                'emissions-tv-musique-danse'                => 'Musique, Danse',
                'emissions-tv-actualite'                    => 'Actualité, Quotidienne',
                'emissions-tv-nature-animaux'               => 'Natures, Animaux',
                'emissions-tv-sport-auto'                   => 'Sports, Sports mécanique',
                'emissions-tv-cuisine'                      => 'Cuisine',
                'emissions-tv-sante'                        => 'Santé',
                'emissions-tv-sciences-technologie'         => 'Sciences, Technologie',
            ],
        ],
        'spectacle'     => ['label' => 'Spectacles',     'tmdb' => null, 'subs' => ['spectacles' => 'Spectacles']],
        'concert'       => ['label' => 'Concerts',       'tmdb' => null, 'subs' => ['concerts'   => 'Concerts']],
        'sport'         => ['label' => 'Sports',         'tmdb' => null, 'subs' => ['sport'      => 'Sports']],
        'autoformation' => ['label' => 'Autoformations', 'tmdb' => null, 'subs' => ['autoformations' => 'Autoformations']],
    ];
    return $cats;
}

/** Normalise les alias (pluriels, anglais, etc.) vers la clé principale du registre. */
function normalize_type_alias(string $t): string {
    $t = strtolower(trim($t));
    static $alias = [
        'film' => 'movie', 'films' => 'movie',
        'serie' => 'tv', 'series' => 'tv',
        'animes' => 'anime',
        'game' => 'jeux', 'games' => 'jeux',
        'music' => 'musique', 'musiques' => 'musique',
        'livre' => 'ebook', 'ebooks' => 'ebook',
        'software' => 'logiciel', 'logiciels' => 'logiciel',
        'documentaires' => 'documentaire',
        'emissions' => 'emission',
        'spectacles' => 'spectacle',
        'concerts'   => 'concert',
        'sports'     => 'sport',
        'autoformations' => 'autoformation',
    ];
    return $alias[$t] ?? $t;
}

/**
 * Retourne la liste des slugs ZT correspondant à un type.
 * - Si $t est un alias principal (movie, tv, jeux...) → tous les slugs du groupe.
 * - Si $t est un slug précis (jeux-pc, serie-vf-1080p, animes-vostfr-720p…) → uniquement celui-là.
 * - Sinon → liste large par défaut.
 */
function type_to_categories(string $t): array {
    $reg = zt_category_registry();
    $tn  = normalize_type_alias($t);

    // 1) Type principal ?
    if (isset($reg[$tn])) {
        return array_keys($reg[$tn]['subs']);
    }
    // 2) Slug précis ?
    foreach ($reg as $group) {
        if (isset($group['subs'][$t])) {
            return [$t];
        }
    }
    // 3) Fallback global
    return [
        'film-gratuit','telecharger-serie','animes','jeux-gratuit','musique-mp3-gratuite',
        'ebooks','logiciels','documentaire-gratuit','emissions-tv',
    ];
}

/** Indique si le type donné (alias ou slug) bénéficie d'enrichissement TMDB. */
function is_tmdb_type(string $t): bool {
    $reg = zt_category_registry();
    $tn  = normalize_type_alias($t);
    if (isset($reg[$tn])) {
        return !empty($reg[$tn]['tmdb']);
    }
    foreach ($reg as $group) {
        if (isset($group['subs'][$t])) {
            return !empty($group['tmdb']);
        }
    }
    return false;
}

/** 'movie' ou 'tv' selon le type, pour l'API TMDB. */
function tmdb_search_type(string $t): string {
    $reg = zt_category_registry();
    $tn  = normalize_type_alias($t);
    if (isset($reg[$tn]) && !empty($reg[$tn]['tmdb'])) {
        return $reg[$tn]['tmdb'];
    }
    foreach ($reg as $group) {
        if (isset($group['subs'][$t]) && !empty($group['tmdb'])) {
            return $group['tmdb'];
        }
    }
    return 'movie';
}

function title_matches_tmdb(string $ztTitle, array $tmdbData, string $year = '', string $extraTitle = ''): bool {
    $cleanZt  = clean_title($ztTitle);
    $normZt   = normalize_title($cleanZt);
    $normTmdb = normalize_title($tmdbData['title']);
    $normOrig = normalize_title($tmdbData['original_title']);

    // Source supplémentaire (typiquement le titre extrait du slug URL),
    // utile quand le texte du <a> dans le listing est tronqué par ZT.
    $normExtra = $extraTitle ? normalize_title(clean_title($extraTitle)) : '';

    $ztYear = extract_year_from_title($ztTitle);
    if ($year && $ztYear && $ztYear !== $year) return false;

    // Détection numéro de suite — sur titre nettoyé (sans "Saison X")
    $tmdbSeq = $ztSeq = '';
    if (preg_match('/\b(\d+|II|III|IV|VI{0,3}|IX|X)\s*$/u', $tmdbData['title'], $smT)) {
        $tmdbSeq = strtoupper(trim($smT[1]));
    }
    if (preg_match('/\b(\d+|II|III|IV|VI{0,3}|IX|X)\s*$/u', $cleanZt, $smW)) {
        $ztSeq = strtoupper(trim($smW[1]));
    }
    if ($tmdbSeq !== '' && $ztSeq === '')                       return false;
    if ($tmdbSeq !== '' && $ztSeq !== '' && $ztSeq !== $tmdbSeq) return false;
    if ($tmdbSeq === '' && $ztSeq !== '')                       return false;

    if ($normZt === $normTmdb || $normZt === $normOrig) return true;
    if ($normExtra && ($normExtra === $normTmdb || $normExtra === $normOrig)) return true;

    $tmdbWords = array_values(array_filter(explode(' ', $normTmdb)));
    $ztWords   = array_values(array_filter(explode(' ', $normZt)));
    $extraWords = $normExtra ? array_values(array_filter(explode(' ', $normExtra))) : [];

    if (count($tmdbWords) < 2) {
        if (strpos($normZt, $normTmdb) !== false || strpos($normZt, $normOrig) !== false) return true;
        if ($normExtra && (strpos($normExtra, $normTmdb) !== false || strpos($normExtra, $normOrig) !== false)) return true;
        return false;
    }
    $minReq = max(2, (int)ceil(count($tmdbWords) * 0.7));
    $common = count(array_intersect($tmdbWords, $ztWords));
    if ($common >= $minReq) return true;
    if ($extraWords) {
        $commonExtra = count(array_intersect($tmdbWords, $extraWords));
        if ($commonExtra >= $minReq) return true;
    }
    return false;
}

function filter_candidates(array $items, string $norm, array $tmdbData, int $season = 0, string $year = ''): array {
    $f = array_filter($items, function ($i) use ($tmdbData, $year) {
        return title_matches_tmdb($i['title'], $tmdbData, $year, $i['slugTitle'] ?? '');
    });
    if (empty($f)) {
        $f = array_filter($items, function ($i) use ($norm) {
            $in = normalize_title(clean_title($i['title']));
            $is = !empty($i['slugTitle']) ? normalize_title(clean_title($i['slugTitle'])) : '';
            $hit = $in && ($norm === $in || strpos($in, $norm) !== false || strpos($norm, $in) !== false);
            if (!$hit && $is) {
                $hit = ($norm === $is || strpos($is, $norm) !== false || strpos($norm, $is) !== false);
            }
            return $hit;
        });
    }
    $c = $f ?: [];
    if ($season && !empty($c)) {
        $sf = array_filter($c, function ($i) use ($season) {
            $t = mb_strtolower($i['title'], 'UTF-8');
            $p = str_pad((string)$season, 2, '0', STR_PAD_LEFT);
            return strpos($t, 'saison ' . $season) !== false
                || strpos($t, 'saison ' . $p) !== false
                || preg_match('/\bs' . $p . '\b/i', $t);
        });
        if ($sf) $c = $sf;
    }
    if ($year && !empty($c)) {
        $yf = array_filter($c, function ($i) use ($year) {
            $iy = extract_year_from_title($i['title']);
            return !$iy || $iy === $year;
        });
        if (!empty($yf)) $c = $yf;
    }
    return array_values($c);
}

function build_result_base(array $tmdbData, string $type, int $season, int $episode,
                           array $merged, int $pageCount): array {
    $total = array_sum(array_map(
        fn($q) => count($q['downloadLinks']) + count($q['streamLinks']),
        $merged['qualities']
    ));
    return [
        'tmdbId'        => $tmdbData['id'],
        'type'          => $type,
        'title'         => $tmdbData['title'],
        'originalTitle' => $tmdbData['original_title'],
        'poster'        => $tmdbData['poster_path']
            ? 'https://image.tmdb.org/t/p/w500' . $tmdbData['poster_path']
            : null,
        'year'          => substr($tmdbData['release_date'], 0, 4),
        'season'        => $season  ?: null,
        'episode'       => $episode ?: null,
        'qualities'     => $merged['qualities'],
        'totalLinks'    => $total,
        'pagesScraped'  => $pageCount,
        'message'       => ($pageCount === 0 || $total === 0)
            ? 'Aucun lien trouvé pour ce titre sur zone-telechargement.org'
            : null,
    ];
}

/**
 * Construit une liste de variantes de recherche à essayer.
 * Ordre stratégique : du mot distinctif (court & efficace) → au plus long.
 *
 * Raison : ZT search renvoie la homepage par défaut quand la requête
 * est trop spécifique (apostrophe, deux-points, articles…). Donc on
 * commence par le mot le plus distinctif qui a le plus de chances de
 * matcher dans l'index de recherche.
 */
function build_search_variants(array $tmdbData, string $year, int $season): array {
    $variants = [];
    $title    = $tmdbData['title'];
    $orig     = $tmdbData['original_title'];

    // Helper : extrait le premier mot significatif (> 3 lettres, non générique)
    $firstSignificantWord = function (string $s): string {
        $words = preg_split('/[\s:,\-–\'"()]+/u', $s) ?: [];
        foreach ($words as $w) {
            $wn = preg_replace('/[^\w]/u', '', $w);
            if (mb_strlen($wn) > 3 && !preg_match('/^(?:the|les|une|special|edition|saison|season|deep|dive)$/iu', $wn)) {
                return $wn;
            }
        }
        return '';
    };

    // Helper : extrait tous les mots significatifs (> 3 lettres, non génériques)
    $sigWords = function (string $s): array {
        $words = preg_split('/[\s:,\-–\'"()]+/u', $s) ?: [];
        $out = [];
        foreach ($words as $w) {
            $wn = preg_replace('/[^\w]/u', '', $w);
            if (mb_strlen($wn) > 3 && !preg_match('/^(?:the|les|une|special|edition|saison|season|deep|dive|presentation|television|marvel|with|from|your|have)$/iu', $wn)) {
                $out[] = $wn;
            }
        }
        return $out;
    };

    // 1) PREMIER MOT DISTINCTIF (priorité 1 — meilleure couverture)
    $w = $firstSignificantWord($title);
    if ($w) $variants[] = $w;
    $w2 = $firstSignificantWord($orig);
    if ($w2 && $w2 !== $w) $variants[] = $w2;

    // 1bis) DEUX premiers mots significatifs (réduit le bruit pour titres communs)
    $sw = $sigWords($title);
    if (count($sw) >= 2) {
        $variants[] = $sw[0] . ' ' . $sw[1];
    }
    $swOrig = $sigWords($orig);
    if (count($swOrig) >= 2 && implode(' ', $swOrig) !== implode(' ', $sw)) {
        $variants[] = $swOrig[0] . ' ' . $swOrig[1];
    }

    // 2) Titre sans articles initiaux
    $stripped = preg_replace('/^(?:le|la|les|l\'|un|une|des|the|a|an)\s+/iu', '', $title);
    if ($stripped !== $title) $variants[] = $stripped;

    // 3) Titre complet (français)
    $variants[] = $title;

    // 4) Titre original si différent
    if ($orig && $orig !== $title) $variants[] = $orig;

    // 5) Variantes spécifiques (saison) — pour les séries
    if ($season) {
        if ($w) $variants[] = $w . ' Saison ' . $season;
        $variants[] = $title . ' Saison ' . $season;
    }

    // Dédup en conservant l'ordre
    return array_values(array_unique($variants));
}

/**
 * Reverse-TMDB lookup : pour chaque item, fait un tmdb_search en parallèle
 * et garde uniquement ceux dont le TMDB-match correspond au tmdbId cible.
 *
 * Limité à 12 items pour rester rapide (parallèle).
 */
function reverse_tmdb_filter(array $items, int $targetTmdbId, string $tmdbSType, string $year = ''): array {
    if (empty($items)) return [];
    $items = array_slice($items, 0, 24);  // élargi pour mieux gérer les listings mixtes
    $tmdbUrls = [];
    foreach ($items as $idx => $it) {
        // Priorité au slug URL (souvent plus complet) si le titre listing est très court.
        $titleSource = $it['title'];
        $slug = $it['slugTitle'] ?? '';
        if ($slug && mb_strlen($slug) > mb_strlen($titleSource) + 8) {
            $titleSource = $slug;
        }
        $clean = clean_title($titleSource);
        if (!$clean) continue;
        $itYear = extract_year_from_title($it['title']) ?: extract_year_from_title($slug) ?: $year;
        $url = 'https://api.themoviedb.org/3/search/' . $tmdbSType
             . '?api_key=' . TMDB_API_KEY . '&language=fr-FR&query=' . rawurlencode($clean);
        if ($itYear) $url .= ($tmdbSType === 'tv' ? '&first_air_date_year=' : '&year=') . $itYear;
        $tmdbUrls[$idx] = $url;
    }
    $raws = http_fetch_multi(array_values($tmdbUrls), 8);
    $matched = [];
    foreach ($tmdbUrls as $idx => $tUrl) {
        $raw = $raws[$tUrl] ?? null;
        if (!$raw) continue;
        $d = json_decode($raw, true);
        if (empty($d['results'])) continue;
        // On accepte si le TMDB cible figure dans les 3 premiers résultats
        // (et non plus uniquement le best match). Cela rattrape les cas où
        // TMDB classe légèrement à côté un titre proche.
        foreach (array_slice($d['results'], 0, 3) as $r) {
            if ((int)($r['id'] ?? 0) === $targetTmdbId) {
                $matched[] = $items[$idx];
                break;
            }
        }
    }
    return $matched;
}

/**
 * Trouve les candidats ZT pour un TMDB ID donné :
 * 1) essaie plusieurs variantes de recherche,
 * 2) filtre strict par title_matches_tmdb,
 * 3) si vide → reverse TMDB lookup sur les résultats agrégés.
 */
function find_candidates_for_tmdb(array $tmdbData, string $type, array $catSlugs, int $season, string $year): array {
    $tmdbSType = tmdb_search_type($type);
    $variants  = build_search_variants($tmdbData, $year, $season);

    // Agrégation des résultats de toutes les variantes (dédup par pageUrl)
    $aggregated = [];
    foreach ($variants as $q) {
        $batch = zt_search($q);
        $batch = filter_by_category($batch, $catSlugs);
        foreach ($batch as $it) {
            if (!isset($aggregated[$it['pageUrl']])) {
                $aggregated[$it['pageUrl']] = $it;
            }
        }
        if (count($aggregated) >= 60) break;
    }
    $allItems = array_values($aggregated);

    // Pré-filtre : ne garder que les items qui contiennent au moins UN mot significatif
    // (>3 lettres, non-stopword) commun avec le titre TMDB OU le titre original.
    // Cela élimine les bruits du genre "Avatar" cherchant "Les Secrets…" → on garde
    // uniquement les items qui ressemblent vraiment au film/série recherché.
    $stopwords = ['the','les','une','des','this','that','with','from','your','have',
                  'special','edition','saison','season','deep','dive','part'];
    $extractSigWords = function (string $s) use ($stopwords): array {
        $s = mb_strtolower(iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$s) ?: $s, 'UTF-8');
        $words = preg_split('/[^a-z0-9]+/u', $s) ?: [];
        $out = [];
        foreach ($words as $w) {
            if (mb_strlen($w) > 3 && !in_array($w, $stopwords, true)) {
                $out[$w] = true;
            }
        }
        return array_keys($out);
    };
    $tmdbWords = array_merge(
        $extractSigWords($tmdbData['title']),
        $extractSigWords($tmdbData['original_title'])
    );
    $tmdbWords = array_unique($tmdbWords);

    $prefiltered = $allItems;
    if (!empty($tmdbWords)) {
        $prefiltered = [];
        foreach ($allItems as $it) {
            $itWords = $extractSigWords(clean_title($it['title']));
            // Si le titre listing est tronqué (cas "A Marvel Television Special"),
            // on regarde aussi les mots significatifs du slug URL.
            if (!empty($it['slugTitle'])) {
                $itWords = array_unique(array_merge($itWords, $extractSigWords($it['slugTitle'])));
            }
            if (!empty(array_intersect($itWords, $tmdbWords))) {
                $prefiltered[] = $it;
            }
        }
    }
    // Fallback : si le pré-filtre élimine tout, on retombe sur la liste complète
    if (empty($prefiltered)) $prefiltered = $allItems;

    // 1) Filtrage STRICT par title_matches_tmdb uniquement (pas de fallback substring,
    //    pour éviter qu'"Avatar" matche "Les Secrets du monde d'Avatar").
    //    On passe également le slug URL en source de matching alternative pour
    //    rattraper les cas où ZT tronque le texte du <a> du listing.
    $strict = array_values(array_filter($prefiltered, function ($i) use ($tmdbData, $year) {
        return title_matches_tmdb($i['title'], $tmdbData, $year, $i['slugTitle'] ?? '');
    }));
    if ($season && !empty($strict)) {
        $sf = array_values(array_filter($strict, function ($i) use ($season) {
            $t = mb_strtolower($i['title'], 'UTF-8');
            $p = str_pad((string)$season, 2, '0', STR_PAD_LEFT);
            return strpos($t, 'saison ' . $season) !== false
                || strpos($t, 'saison ' . $p) !== false
                || preg_match('/\bs' . $p . '\b/i', $t);
        }));
        if (!empty($sf)) $strict = $sf;
    }
    if (!empty($strict)) return $strict;

    // 2) Reverse TMDB lookup sur la liste pré-filtrée (plus précise)
    $reverse = reverse_tmdb_filter($prefiltered, $tmdbData['id'], $tmdbSType, $year);
    if (!empty($reverse) && $season) {
        $sf = array_filter($reverse, function ($i) use ($season) {
            $t = mb_strtolower($i['title'], 'UTF-8');
            $p = str_pad((string)$season, 2, '0', STR_PAD_LEFT);
            return strpos($t, 'saison ' . $season) !== false
                || strpos($t, 'saison ' . $p) !== false
                || preg_match('/\bs' . $p . '\b/i', $t);
        });
        if (!empty($sf)) return array_values($sf);
    }
    return $reverse;
}

// ═════════════════════════════════════════════════════════════
// API REST
// ═════════════════════════════════════════════════════════════
if ($isApiCall) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

    $type    = strtolower(trim($_GET['type'] ?? 'movie'));
    $tmdbId  = (int)($_GET['id'] ?? 0);
    $query   = trim($_GET['q'] ?? '');
    $season  = (int)($_GET['s'] ?? 0);
    $episode = (int)($_GET['e'] ?? 0);
    $listCat = isset($_GET['list']) && strtolower($_GET['list']) === 'categories';

    // Endpoint de découverte des catégories et sous-catégories
    if ($listCat) {
        $reg = zt_category_registry();
        $out = [];
        foreach ($reg as $key => $info) {
            $subs = [];
            foreach ($info['subs'] as $slug => $label) {
                $subs[] = ['slug' => $slug, 'label' => $label];
            }
            $out[] = [
                'type'       => $key,
                'label'      => $info['label'],
                'tmdb'       => $info['tmdb'],
                'subcategories' => $subs,
            ];
        }
        echo json_encode(['categories' => $out], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    if ($tmdbId > 0) {
        if (!is_tmdb_type($type)) {
            http_response_code(400);
            echo json_encode(['error' => "type doit être : movie, film, tv, serie, series, anime"]);
            exit;
        }
        $tmdbSType = tmdb_search_type($type);
        $isSerie   = ($tmdbSType === 'tv');
        $tmdbData  = tmdb_get($tmdbId, $tmdbSType);
        if (!$tmdbData) {
            http_response_code(404);
            echo json_encode(['error' => "TMDB ID {$tmdbId} introuvable pour le type '{$type}'"]);
            exit;
        }
        $catSlugs = type_to_categories($type);
        $tmdbYear = substr($tmdbData['release_date'], 0, 4);

        // Nouvelle stratégie : multi-variantes + reverse TMDB lookup
        $cands = find_candidates_for_tmdb($tmdbData, $type, $catSlugs, $season, $tmdbYear);

        $pageUrls = array_column(array_slice($cands, 0, 8), 'pageUrl');
        $merged   = merge_qualities($pageUrls, $tmdbYear, $isSerie, $season, $episode);
        echo json_encode(
            build_result_base($tmdbData, $type, $season, $episode, $merged, count($pageUrls)),
            JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
        );
        exit;
    }

    if ($query !== '') {
        $catSlugs = type_to_categories($type);
        $items    = zt_search($query);
        $items    = filter_by_category($items, $catSlugs);
        $supportsTmdb = is_tmdb_type($type);
        $tmdbSt   = tmdb_search_type($type);
        $results  = group_results($items, $supportsTmdb, $tmdbSt);

        // Enrichissement systématique avec les méta scrapées sur les pages
        // détail ZT (origine, réalisation, acteurs, genre, note, durée,
        // développeur, éditeur, plateforme, artiste, auteur…). TMDB reste
        // prioritaire pour poster/synopsis/année quand applicable.
        $results = enrich_non_tmdb_cards($results, 12, 3);

        echo json_encode([
            'query'      => $query,
            'type'       => $type,
            'categories' => $catSlugs,
            'total'      => count($results),
            'results'    => $results,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    http_response_code(400);
    echo json_encode([
        'error'    => "Paramètre manquant : 'id' (TMDB ID) ou 'q' (titre)",
        'exemples' => [
            '/api/v1/liens?type=movie&id=27205',
            '/api/v1/liens?type=tv&id=1396&s=2&e=5',
            '/api/v1/liens?type=movie&q=inception',
            '/api/v1/liens?type=jeux-pc&q=fifa',
            '/api/v1/liens?type=ebook&q=musso',
            '/api/v1/liens?type=serie-vf-1080p&q=walking+dead',
            '/api/v1/liens?list=categories',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ═════════════════════════════════════════════════════════════
// AJAX INTERNE (pour l'UI HTML)
// ═════════════════════════════════════════════════════════════
if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    $action  = $_GET['ajax'];
    $type    = $_GET['type']  ?? 'films';
    $title   = $_GET['title'] ?? '';
    $urls    = $_GET['urls']  ?? '';
    $tmdbId  = (int)($_GET['tmdb_id']   ?? 0);
    $tmdbType= $_GET['tmdb_type']       ?? 'movie';
    $season  = (int)($_GET['s']         ?? 0);
    $episode = (int)($_GET['e']         ?? 0);

    if ($action === 'search') {
        $catSlugs = type_to_categories($type);
        $items    = zt_search($title);
        $items    = filter_by_category($items, $catSlugs);
        $tmdbSt   = tmdb_search_type($type);
        $supportsTmdb = is_tmdb_type($type);
        $results  = group_results($items, $supportsTmdb, $tmdbSt);

        // Enrichissement systématique : on récupère les méta-données ZT
        // (Origine, Réalisation, Acteurs, Genre, Note, Durée, Date…) pour
        // tous les types. TMDB reste prioritaire pour poster/synopsis/année.
        $results = enrich_non_tmdb_cards($results, 12, 3);

        echo json_encode([
            'results'   => $results,
            'total'     => count($results),
            'sourceUrl' => zt_search_url($title),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'detail' && $urls) {
        $urlList = array_slice(array_filter(array_map('trim', explode(',', $urls))), 0, 10);
        $cat     = category_from_url($urlList[0] ?? '');
        $isSerie = (strpos($cat, 'serie') !== false) || (strpos($cat, 'anime') !== false);
        $merged  = merge_qualities($urlList, '', $isSerie);
        $mm      = $merged['meta'];

        // Tentative d'enrichissement TMDB
        $td = null;
        if ($isSerie || strpos($cat, 'film') !== false || strpos($cat, 'anime') !== false) {
            $tmdbSt = (strpos($cat, 'serie') !== false || strpos($cat, 'anime') !== false) ? 'tv' : 'movie';
            $td = tmdb_search(clean_title($mm['title'] ?? ''), $tmdbSt);
        }
        echo json_encode(['result' => [
            'title'         => $td ? $td['title'] : ($mm['title'] ?? ''),
            'originalTitle' => $td ? $td['original_title'] : ($mm['original_title'] ?? null),
            'poster'        => $mm['poster'] ?? null,
            'tmdbPoster'    => $td && $td['poster_path']
                ? 'https://image.tmdb.org/t/p/w500' . $td['poster_path']
                : ($mm['poster'] ?? null),
            'tmdbId'        => $td ? $td['id'] : null,
            'year'          => $td ? substr($td['release_date'], 0, 4) : ($mm['release_date'] ?? null),
            'synopsis'      => $td ? $td['overview'] : ($mm['synopsis'] ?? null),
            'actors'        => $mm['actors']   ?? null,
            'director'      => $mm['director'] ?? null,
            'duration'      => $mm['duration'] ?? null,
            'genres'        => $mm['genres']   ?? null,
            'origin'        => $mm['origin']   ?? null,
            'rating'        => $mm['rating']   ?? null,
            'qualities'     => $merged['qualities'],
        ]], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'tmdb_search' && $tmdbId) {
        $tmdbSt   = ($tmdbType === 'tv') ? 'tv' : 'movie';
        $isSerie  = ($tmdbSt === 'tv');
        $tmdbData = tmdb_get($tmdbId, $tmdbSt);
        if (!$tmdbData) { echo json_encode(['error' => 'TMDB ID introuvable']); exit; }
        $catSlugs = ($tmdbType === 'tv') ? type_to_categories('tv') : type_to_categories('movie');
        $tmdbYear = substr($tmdbData['release_date'], 0, 4);

        $cands    = find_candidates_for_tmdb($tmdbData, $tmdbType, $catSlugs, $season, $tmdbYear);
        $pageUrls = array_column(array_slice($cands, 0, 8), 'pageUrl');
        $merged   = merge_qualities($pageUrls, $tmdbYear, $isSerie, $season, $episode);
        echo json_encode(
            build_result_base($tmdbData, $tmdbType, $season, $episode, $merged, count($pageUrls)),
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    echo json_encode(['error' => 'Action inconnue']);
    exit;
}

// ═════════════════════════════════════════════════════════════
// HTML UI
// ═════════════════════════════════════════════════════════════
if ($ZT_LIB) return;  // library mode: skip HTML rendering
$showApiDoc = isset($_GET['_route']) && $_GET['_route'] === 'api-doc';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $showApiDoc ? 'API Doc — ZT Search' : 'ZT Search — zone-telechargement.org' ?></title>
<style>
* { box-sizing: border-box; }
:root {
  --bg: #0f1419;
  --bg2: #1a2027;
  --card: #1e2530;
  --card2: #262e3a;
  --border: #2f3845;
  --txt: #e6e9ef;
  --muted: #8a93a3;
  --accent: #ff6b35;
  --accent2: #ff8f6b;
  --green: #4caf7c;
  --blue: #4d9eff;
  --yellow: #f5c451;
}
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--txt);
  font-size: 14px;
  line-height: 1.5;
}
header {
  background: linear-gradient(180deg, #181f29 0%, #0f1419 100%);
  border-bottom: 1px solid var(--border);
  padding: 18px 24px;
}
header .container { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 20px; }
header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
header h1 .v { color: var(--accent); font-size: 14px; margin-left: 8px; }
header nav { margin-left: auto; display: flex; gap: 14px; }
header nav a { color: var(--muted); text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
header nav a:hover, header nav a.active { color: var(--txt); background: var(--card); }

.container { max-width: 1280px; margin: 0 auto; padding: 24px; }

.search-bar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.search-bar select, .search-bar input, .search-bar button {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--txt);
  padding: 11px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.search-bar input { flex: 1; min-width: 220px; }
.search-bar input:focus, .search-bar select:focus { border-color: var(--accent); }
.search-bar button {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  padding: 11px 24px;
  transition: background 0.15s;
}
.search-bar button:hover { background: var(--accent2); }

.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 12px; flex-wrap: wrap; }
.tab {
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--txt); }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }

.subtabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.subtabs:empty { display: none; }
.subtab {
  padding: 5px 11px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.subtab:hover { color: var(--txt); border-color: var(--accent); }
.subtab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}
.empty-state .icon { font-size: 56px; margin-bottom: 14px; opacity: 0.5; }
.empty-state h2 { margin: 0 0 6px; color: var(--txt); font-weight: 600; font-size: 18px; }
.empty-state p { margin: 0; }

.loader {
  text-align: center;
  padding: 40px;
  color: var(--muted);
}
.loader-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  margin: 0 3px;
  animation: bounce 1.4s infinite ease-in-out;
}
.loader-dot:nth-child(2) { animation-delay: 0.15s; }
.loader-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.result-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
}
.result-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 8px 20px rgba(255, 107, 53, 0.18);
}
.result-card .poster {
  width: 100%;
  aspect-ratio: 2/3;
  background: var(--bg2);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 36px;
}
.result-card .info { padding: 10px 12px; }
.result-card .info .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.35; height: 36px; overflow: hidden; }
.result-card .info .meta  { color: var(--muted); font-size: 11px; display: flex; justify-content: space-between; align-items: center; }
.result-card .info .meta .year { color: var(--yellow); }
.result-card .info .meta .count { background: var(--accent); color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 600; font-size: 10px; }

.detail-back { background: transparent; color: var(--muted); border: none; cursor: pointer; padding: 6px 0; margin-bottom: 14px; font-size: 13px; }
.detail-back:hover { color: var(--accent); }

.detail-header { display: grid; grid-template-columns: 200px 1fr; gap: 24px; margin-bottom: 28px; }
.detail-poster { width: 100%; aspect-ratio: 2/3; background: var(--bg2); border-radius: 8px; background-size: cover; background-position: center; border: 1px solid var(--border); }
.detail-info h2 { margin: 0 0 6px; font-size: 26px; font-weight: 700; }
.detail-info .original { color: var(--muted); font-style: italic; font-size: 14px; margin-bottom: 12px; }
.detail-info .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.badge { background: var(--card2); border: 1px solid var(--border); border-radius: 4px; padding: 4px 10px; font-size: 12px; }
.badge.year { color: var(--yellow); }
.badge.rating { color: var(--green); }
.detail-info .meta-grid { display: grid; grid-template-columns: 80px 1fr; gap: 6px 14px; margin-bottom: 14px; font-size: 13px; }
.detail-info .meta-grid .label { color: var(--muted); }
.detail-info .synopsis { color: #c8cdd6; font-size: 13.5px; line-height: 1.6; }

.quality-block {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}
.quality-header {
  background: linear-gradient(180deg, #232b37 0%, #1e2530 100%);
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.quality-header .q-name { font-size: 15px; font-weight: 700; color: var(--accent); }
.quality-header .q-lang { background: var(--blue); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.quality-header .q-size { color: var(--muted); font-size: 12px; margin-left: auto; }

.links-section { padding: 14px 18px; }
.links-section h4 { margin: 0 0 10px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.links-section.stream h4 { color: var(--green); }
.links-section.download h4 { color: var(--blue); }

.link-row {
  display: grid;
  grid-template-columns: 1fr 110px 90px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 4px;
  background: var(--bg2);
  border-radius: 6px;
  font-size: 12.5px;
  transition: background 0.15s;
}
.link-row:hover { background: #232b37; }
.link-row .lr-name { font-weight: 600; }
.link-row .lr-host { background: var(--card2); padding: 3px 9px; border-radius: 4px; text-align: center; font-size: 11px; }
.link-row .lr-protection { color: var(--yellow); font-size: 10px; text-align: center; }
.link-row .lr-protection.empty { color: var(--green); }
.link-row .lr-actions { display: flex; gap: 6px; }
.link-row .lr-actions a {
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  transition: background 0.15s;
}
.link-row .lr-actions a:hover { background: var(--accent2); }
.link-row .lr-actions a.direct { background: var(--green); }
.link-row .lr-actions a.direct:hover { background: #6fc294; }

/* API DOC page */
.api-section { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 16px; }
.api-section h3 { margin: 0 0 12px; color: var(--accent); }
.api-section code, .api-section pre {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 2px 6px;
  color: var(--green);
  font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace;
  font-size: 12.5px;
}
.api-section pre { padding: 12px; overflow-x: auto; white-space: pre-wrap; }
.endpoint {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.endpoint .ep-method { display: inline-block; background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 8px; }
.endpoint .ep-url { color: var(--green); font-family: 'JetBrains Mono', Menlo, monospace; font-size: 13px; }
.endpoint .ep-desc { color: var(--muted); margin-top: 6px; font-size: 12.5px; }
.test-row { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.test-row input, .test-row select { background: var(--card2); border: 1px solid var(--border); color: var(--txt); padding: 6px 10px; border-radius: 5px; font-size: 12px; }
.test-row button { background: var(--accent); color: #fff; border: none; padding: 6px 14px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px; }
.test-row button:hover { background: var(--accent2); }

@media (max-width: 768px) {
  .detail-header { grid-template-columns: 1fr; }
  .detail-poster { max-width: 220px; margin: 0 auto; }
  .link-row { grid-template-columns: 1fr; gap: 6px; }
  .link-row .lr-host, .link-row .lr-protection { text-align: left; }
}
</style>
</head>
<body>

<header>
  <div class="container">
    <h1>ZT Search<span class="v">v1.0</span></h1>
    <nav>
      <a href="?" class="<?= !$showApiDoc ? 'active' : '' ?>">Recherche</a>
      <a href="?_route=api-doc" class="<?= $showApiDoc ? 'active' : '' ?>">API</a>
    </nav>
  </div>
</header>

<?php if ($showApiDoc): ?>
<!-- ════════ API DOC PAGE ════════ -->
<div class="container">
  <div class="api-section">
    <h3>📡 Base URL & .htaccess</h3>
    <pre>GET /api/v1/liens?type=movie&id=27205
GET /zt.php?_route=api&type=movie&id=27205</pre>
    <p style="color: var(--muted); margin: 14px 0 6px;">Pour activer l'URL courte (Apache) :</p>
    <pre>RewriteEngine On
RewriteRule ^api/v1/liens$ /zt.php?_route=api [L,QSA]</pre>
    <p style="color: var(--muted); margin-top: 14px; font-size: 12.5px;">
      ✓ CORS activé · JSON UTF-8 · GET only · No auth
    </p>
  </div>

  <div class="api-section">
    <h3>🎬 Endpoints</h3>

    <div class="endpoint">
      <div><span class="ep-method">GET</span><span class="ep-url">/api/v1/liens?type=movie&amp;id={tmdb_id}</span></div>
      <div class="ep-desc">Film par TMDB ID — récupère les liens DDL/streaming groupés par qualité</div>
      <div class="test-row">
        <input type="number" id="t1-id" placeholder="TMDB ID" value="27205" style="width: 120px;">
        <button onclick="runTest('movie-id', document.getElementById('t1-id').value)">⚡ Tester</button>
      </div>
    </div>

    <div class="endpoint">
      <div><span class="ep-method">GET</span><span class="ep-url">/api/v1/liens?type=tv&amp;id={tmdb_id}&amp;s={saison}&amp;e={episode}</span></div>
      <div class="ep-desc">Série par TMDB ID — filtre saison/épisode optionnels</div>
      <div class="test-row">
        <input type="number" id="t2-id" placeholder="TMDB ID" value="1396" style="width: 120px;">
        <input type="number" id="t2-s"  placeholder="Saison"   value="2"    style="width: 90px;">
        <input type="number" id="t2-e"  placeholder="Episode"  value="5"    style="width: 90px;">
        <button onclick="runTest('tv-id')">⚡ Tester</button>
      </div>
    </div>

    <div class="endpoint">
      <div><span class="ep-method">GET</span><span class="ep-url">/api/v1/liens?type={type}&amp;q={titre}</span></div>
      <div class="ep-desc">Recherche libre par titre dans une catégorie</div>
      <div class="test-row">
        <select id="t3-type">
          <option value="movie">movie</option>
          <option value="tv">tv</option>
          <option value="anime">anime</option>
          <option value="jeux">jeux</option>
          <option value="musique">musique</option>
          <option value="ebook">ebook</option>
          <option value="logiciel">logiciel</option>
        </select>
        <input type="text" id="t3-q" placeholder="Titre" value="inception" style="width: 240px;">
        <button onclick="runTest('search')">⚡ Tester</button>
      </div>
    </div>
  </div>

  <div class="api-section">
    <h3>🎴 Schéma de réponse (carte)</h3>
    <pre>{
  "id":          "avatar",
  "title":       "Avatar",
  "cleanTitle":  "Avatar",
  "tmdbId":      19995,                          // null si non-TMDB
  "poster":      "https://image.tmdb.org/t/p/w500/...jpg",
  "year":        "2009",
  "synopsis":    "Sur la planète Pandora...",
  "originalTitle": "Avatar",

  // Méta-données scrapées sur la page ZT (films/séries/animes)
  "origin":      "United States of America",
  "director":    "James Cameron",
  "actors":      "Sam Worthington, Zoe Saldaña, ...",
  "genres":      "Action, Aventure, Science-Fiction",
  "duration":    "162 min",
  "rating":      "7.594/10",
  "release_date":"2009-12-15",

  // Champs spécifiques aux jeux / musiques / ebooks / logiciels
  "developer":   "Electronic Arts",
  "publisher":   "EA Sports",
  "platform":    "PC",
  "modes":       "Jouable en solo",
  "artist":      "Drake",
  "album":       "ICEMAN",
  "author":      "Douglas Kennedy",
  "lang_meta":   "Multi (Fr inclus)",
  "format_meta": "ISO",
  "size_meta":   "44 GB",

  "details":     { ... },                         // copie rétro-compat
  "pageUrls":    [ "https://...", "https://..." ],
  "pageUrl":     "https://...",
  "qualities":   [ { quality, lang, size, downloadLinks[], streamLinks[], pageUrl } ],
  "totalLinks":  42
}</pre>
  </div>

  <div class="api-section">
    <h3>📦 Schéma de réponse (lien individuel)</h3>
    <pre>{
  "host":       "Turbobit",             // hébergeur déduit
  "protection": "zoneurs",              // "zoneurs" si lien protégé, "" sinon
  "filename":   "Épisode 3 - Saison 2", // pour les séries
  "size":       "350 Mo",
  "url":        "https://trbt.cc/xxxxx.html",  // URL directe vers l'hébergeur (décodée)
  "season":     2,
  "episode":    3
}</pre>
  </div>

  <div class="api-section">
    <h3>🔧 Catégories supportées (paramètre <code>type</code>)</h3>
    <p style="margin-bottom:8px;color:var(--muted);font-size:13px;">
      Vous pouvez utiliser l'alias principal (ex: <code>jeux</code>) pour cibler tout
      le groupe, ou un slug précis (ex: <code>jeux-pc</code>) pour filtrer finement.
      L'endpoint <code>?_route=api&list=categories</code> renvoie l'arborescence
      complète au format JSON.
    </p>
    <?php
      $reg = zt_category_registry();
      foreach ($reg as $key => $info) {
        echo '<div style="margin:14px 0;padding:10px 12px;background:var(--bg2);border-radius:8px;">';
        echo '<div style="font-weight:700;color:var(--accent);margin-bottom:6px;">';
        echo htmlspecialchars($info['label']) . ' <span class="badge">' . htmlspecialchars($key) . '</span>';
        if (!empty($info['tmdb'])) echo ' <span class="badge" style="background:var(--green);color:#000">TMDB</span>';
        echo '</div>';
        echo '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        foreach ($info['subs'] as $slug => $label) {
          echo '<span class="badge" title="' . htmlspecialchars($label) . '" style="cursor:help">'
             . htmlspecialchars($slug) . '</span>';
        }
        echo '</div>';
        echo '</div>';
      }
    ?>
  </div>
</div>

<script>
const API_BASE = window.location.pathname;
function runTest(kind, ...args) {
  let url = API_BASE + '?_route=api&';
  if (kind === 'movie-id') {
    url += 'type=movie&id=' + encodeURIComponent(args[0]);
  } else if (kind === 'tv-id') {
    const id = document.getElementById('t2-id').value;
    const s = document.getElementById('t2-s').value;
    const e = document.getElementById('t2-e').value;
    url += 'type=tv&id=' + encodeURIComponent(id);
    if (s) url += '&s=' + encodeURIComponent(s);
    if (e) url += '&e=' + encodeURIComponent(e);
  } else if (kind === 'search') {
    const type = document.getElementById('t3-type').value;
    const q = document.getElementById('t3-q').value;
    url += 'type=' + encodeURIComponent(type) + '&q=' + encodeURIComponent(q);
  }
  window.open(url, '_blank');
}
</script>

<?php else: ?>
<!-- ════════ MAIN UI ════════ -->
<div class="container">

  <div class="tabs" id="tabs"></div>
  <div class="subtabs" id="subtabs"></div>

  <div class="search-bar">
    <input type="text" id="search-input" placeholder="Tapez un titre, un acteur, un film, une série…" autofocus>
    <button onclick="doSearch()">Rechercher</button>
  </div>

  <div id="content">
    <div class="empty-state">
      <div class="icon">🎬</div>
      <h2>Recherchez sur zone-telechargement.org</h2>
      <p>Sélectionnez une catégorie et lancez une recherche pour afficher les résultats enrichis (TMDB, qualités, hébergeurs)</p>
    </div>
  </div>

</div>

<script>
const API = window.location.pathname;
const CATEGORY_REGISTRY = <?= json_encode(zt_category_registry(), JSON_UNESCAPED_UNICODE) ?>;
const TABS = [
  { id: 'movie',         label: '🎬 Films' },
  { id: 'tv',            label: '📺 Séries' },
  { id: 'anime',         label: '⛩️ Animes' },
  { id: 'jeux',          label: '🎮 Jeux' },
  { id: 'musique',       label: '🎵 Musiques' },
  { id: 'ebook',         label: '📚 Ebooks' },
  { id: 'logiciel',      label: '💾 Logiciels' },
  { id: 'documentaire',  label: '🎞️ Documentaires' },
  { id: 'emission',      label: '📡 Emissions TV' },
  { id: 'spectacle',     label: '🎭 Spectacles' },
  { id: 'concert',       label: '🎤 Concerts' },
  { id: 'sport',         label: '🏆 Sport' },
];

// `currentMain` = clé du groupe principal (movie, tv, jeux…)
// `currentSub`  = slug précis (ex: jeux-pc) ou null pour "tout le groupe"
let currentMain = 'movie';
let currentSub  = null;
function effectiveType() { return currentSub || currentMain; }

const tabsEl    = document.getElementById('tabs');
const subtabsEl = document.getElementById('subtabs');

TABS.forEach(t => {
  const b = document.createElement('button');
  b.className = 'tab' + (t.id === currentMain ? ' active' : '');
  b.textContent = t.label;
  b.dataset.id = t.id;
  b.onclick = () => {
    currentMain = t.id;
    currentSub  = null;
    [...tabsEl.children].forEach(c => c.classList.toggle('active', c.dataset.id === t.id));
    renderSubtabs();
  };
  tabsEl.appendChild(b);
});

function renderSubtabs() {
  subtabsEl.innerHTML = '';
  const info = CATEGORY_REGISTRY[currentMain];
  if (!info || !info.subs) return;
  const subs = Object.entries(info.subs);
  if (subs.length <= 1) return; // pas la peine d'afficher s'il n'y a qu'une sous-cat

  // Chip "Tous"
  const all = document.createElement('button');
  all.className = 'subtab' + (currentSub === null ? ' active' : '');
  all.textContent = '✦ Tous';
  all.onclick = () => { currentSub = null; renderSubtabs(); };
  subtabsEl.appendChild(all);

  subs.forEach(([slug, label]) => {
    const b = document.createElement('button');
    b.className = 'subtab' + (currentSub === slug ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { currentSub = slug; renderSubtabs(); };
    subtabsEl.appendChild(b);
  });
}
renderSubtabs();

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

function loader(text = 'Recherche en cours') {
  return `<div class="loader">${text}
    <span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span>
  </div>`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const content = document.getElementById('content');
  content.innerHTML = loader('Recherche en cours');

  try {
    const res = await fetch(`${API}?ajax=search&type=${encodeURIComponent(effectiveType())}&title=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      content.innerHTML = `<div class="empty-state">
        <div class="icon">🔍</div>
        <h2>Aucun résultat</h2>
        <p>Aucun titre trouvé pour « ${escapeHtml(q)} » dans ${effectiveType()}</p>
      </div>`;
      return;
    }
    renderResults(data.results);
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h2>Erreur</h2><p>${escapeHtml(e.message)}</p></div>`;
  }
}

function renderResults(results) {
  const grid = document.createElement('div');
  grid.className = 'results-grid';
  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'result-card';
    const posterStyle = r.poster ? `background-image:url('${escapeHtml(r.poster)}');` : '';
    card.innerHTML = `
      <div class="poster" style="${posterStyle}">${r.poster ? '' : '🎬'}</div>
      <div class="info">
        <div class="title">${escapeHtml(r.title)}</div>
        <div class="meta">
          <span class="year">${escapeHtml(r.year || '')}</span>
          <span class="count">${r.pageUrls.length}×</span>
        </div>
      </div>`;
    card.onclick = () => openDetail(r);
    grid.appendChild(card);
  });
  const content = document.getElementById('content');
  content.innerHTML = '';
  content.appendChild(grid);
}

async function openDetail(r) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <button class="detail-back" onclick="doSearch()">← Retour aux résultats</button>
    ${loader('Récupération des liens')}
  `;
  try {
    const urls = r.pageUrls.join(',');
    const res = await fetch(`${API}?ajax=detail&urls=${encodeURIComponent(urls)}`);
    const data = await res.json();
    if (!data.result) {
      content.innerHTML += `<div class="empty-state"><div class="icon">⚠️</div><p>Aucun lien trouvé</p></div>`;
      return;
    }
    renderDetail(data.result, r);
  } catch (e) {
    content.innerHTML += `<div class="empty-state"><div class="icon">⚠️</div><p>${escapeHtml(e.message)}</p></div>`;
  }
}

function renderDetail(res, ref) {
  const content = document.getElementById('content');
  const poster = res.tmdbPoster || res.poster || ref.poster;
  const posterStyle = poster ? `background-image:url('${escapeHtml(poster)}');` : '';

  let metaRows = '';
  const d = res.details || {};
  const metaFields = {
    'Origine':       res.origin       || d.origin,
    'Réalisation':   res.director     || d.director,
    'Acteur(s)':     res.actors       || d.actors,
    'Genre':         res.genres       || d.genres,
    'Durée':         res.duration     || d.duration,
    'Date':          res.release_date || d.release_date || res.year,
    'Note':          res.rating       || d.rating,
    'Développeur':   res.developer    || d.developer,
    'Éditeur':       res.publisher    || d.publisher,
    'Plateforme':    res.platform     || d.platform,
    'Mode(s)':       res.modes        || d.modes,
    'Artiste':       res.artist       || d.artist,
    'Album':         res.album        || d.album,
    'Auteur':        res.author       || d.author,
    'Langue':        res.lang_meta    || d.lang_meta,
    'Format':        res.format_meta  || d.format_meta,
    'Taille':        res.size_meta    || d.size_meta,
  };
  for (const [label, val] of Object.entries(metaFields)) {
    if (val) metaRows += `<div class="label">${label}</div><div>${escapeHtml(val)}</div>`;
  }

  let qualitiesHtml = '';
  if (!res.qualities || res.qualities.length === 0) {
    qualitiesHtml = `<div class="empty-state"><div class="icon">📭</div><p>Aucun lien extrait</p></div>`;
  } else {
    qualitiesHtml = res.qualities.map(q => renderQuality(q)).join('');
  }

  content.innerHTML = `
    <button class="detail-back" onclick="doSearch()">← Retour aux résultats</button>
    <div class="detail-header">
      <div class="detail-poster" style="${posterStyle}"></div>
      <div class="detail-info">
        <h2>${escapeHtml(res.title || ref.title)}</h2>
        ${res.originalTitle && res.originalTitle !== res.title ? `<div class="original">${escapeHtml(res.originalTitle)}</div>` : ''}
        <div class="badges">
          ${res.year ? `<span class="badge year">${escapeHtml(res.year)}</span>` : ''}
          ${res.rating ? `<span class="badge rating">⭐ ${escapeHtml(res.rating)}</span>` : ''}
          ${res.tmdbId ? `<span class="badge">TMDB ${escapeHtml(res.tmdbId)}</span>` : ''}
        </div>
        ${metaRows ? `<div class="meta-grid">${metaRows}</div>` : ''}
        ${res.synopsis ? `<div class="synopsis">${escapeHtml(res.synopsis)}</div>` : ''}
      </div>
    </div>
    <div>${qualitiesHtml}</div>
  `;
}

function renderQuality(q) {
  const ddl = q.downloadLinks || [];
  const stream = q.streamLinks || [];
  return `
    <div class="quality-block">
      <div class="quality-header">
        <span class="q-name">${escapeHtml(q.quality)}</span>
        ${q.lang ? `<span class="q-lang">${escapeHtml(q.lang)}</span>` : ''}
        ${q.size ? `<span class="q-size">📦 ${escapeHtml(q.size)}</span>` : ''}
      </div>
      ${ddl.length ? `
        <div class="links-section download">
          <h4>📥 Téléchargement (${ddl.length})</h4>
          ${ddl.map(renderLinkRow).join('')}
        </div>` : ''}
      ${stream.length ? `
        <div class="links-section stream">
          <h4>▶ Streaming (${stream.length})</h4>
          ${stream.map(renderLinkRow).join('')}
        </div>` : ''}
    </div>`;
}

function renderLinkRow(lk) {
  return `
    <div class="link-row">
      <div class="lr-name">${escapeHtml(lk.filename || '—')}</div>
      <div class="lr-host">${escapeHtml(lk.host || '?')}</div>
      <div class="lr-protection ${lk.protection ? '' : 'empty'}">${escapeHtml(lk.protection || '✓ direct')}</div>
      <div style="color:var(--muted);font-size:11px;">${escapeHtml(lk.size || '')}</div>
      <div class="lr-actions">
        <a class="direct" href="${escapeHtml(lk.url)}" target="_blank" rel="noopener">Ouvrir</a>
      </div>
    </div>`;
}
</script>
<?php endif; ?>

</body>
</html>