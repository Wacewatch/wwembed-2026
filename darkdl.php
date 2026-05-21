<?php
/**
 * ════════════════════════════════════════════════════════════════
 *  darkdl.php — Scraper & API REST de liens de téléchargement
 *  pour movix.tax / darkiworld (api.movix.tax).
 *
 *  Routes :
 *    /darkdl.php?type=movie&id={tmdb_id}
 *    /darkdl.php?type=tv&id={tmdb_id}&s={saison}&e={episode}
 *    /darkdl.php?type=movie&q={titre}
 *
 *  Optionnel :
 *    &decode=1   → résout chaque lien en URL directe (1fichier, send.now, …)
 *                  (1 fetch par lien — légère pénalité de latence)
 *    &decode=0   → renvoie juste les méta + l'id à décoder côté front
 *
 *  Exemple JSON renvoyé :
 *  {
 *    "tmdbId": 1226863,
 *    "type": "movie",
 *    "titleId": 1341635,
 *    "title": "Super Mario Galaxy, le film",
 *    "originalTitle": "The Super Mario Galaxy Movie",
 *    "poster": "https://image.tmdb.org/t/p/w500/...jpg",
 *    "year": "2026",
 *    "season": null,
 *    "episode": null,
 *    "qualities": [
 *      {
 *        "quality": "ULTRA HD (x265)", "lang": "English, French (Canada)",
 *        "downloadLinks": [
 *          {"host":"1Fichier","host_icon":"...","quality":"ULTRA HD (x265)",
 *           "lang":"English, French (Canada)","sub":"French",
 *           "size":"17.3 GB","upload_date":"2026-05-05","view":970,
 *           "id":19134765,"url":"https://1fichier.com/?yiob02kxtv5d45ulab95&af=5010551"}
 *        ]
 *      }
 *    ],
 *    "totalLinks": 13,
 *    "movixCount": 0,
 *    "message": null
 *  }
 * ════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

// ─── Config ────────────────────────────────────────────────────
const MOVIX_API     = 'https://api.movix.tax/api';
const TMDB_API_KEY  = 'd4b8332681051181b69c8a6c9ba1a70a';
const TMDB_BASE     = 'https://api.themoviedb.org/3';
const FETCH_TIMEOUT = 15;
const USER_AGENT    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const ORIGIN        = 'https://movix.tax';

// ═════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═════════════════════════════════════════════════════════════
function http_fetch(string $url, int $timeout = FETCH_TIMEOUT): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_USERAGENT      => USER_AGENT,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json, text/plain, */*',
            'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
            'Origin: '  . ORIGIN,
            'Referer: ' . ORIGIN . '/',
        ],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code >= 400) return null;
    return is_string($body) ? $body : null;
}

function http_fetch_multi(array $urls, int $timeout = FETCH_TIMEOUT): array {
    $mh = curl_multi_init();
    $handles = [];
    $results = array_fill_keys($urls, null);
    foreach ($urls as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_USERAGENT      => USER_AGENT,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json, text/plain, */*',
                'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
                'Origin: '  . ORIGIN,
                'Referer: ' . ORIGIN . '/',
            ],
        ]);
        curl_multi_add_handle($mh, $ch);
        $handles[$url] = $ch;
    }
    $active = null;
    do {
        $status = curl_multi_exec($mh, $active);
        if ($active) curl_multi_select($mh, 1.0);
    } while ($active && $status === CURLM_OK);
    foreach ($handles as $url => $ch) {
        $body = curl_multi_getcontent($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $results[$url] = ($code < 400 && is_string($body) && $body !== '') ? $body : null;
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $results;
}

// ═════════════════════════════════════════════════════════════
// TMDB & SEARCH
// ═════════════════════════════════════════════════════════════
function tmdb_get(int $id, string $type): ?array {
    $url = TMDB_BASE . '/' . $type . '/' . $id
         . '?api_key=' . TMDB_API_KEY . '&language=fr-FR';
    $raw = http_fetch($url, 8);
    if (!$raw) return null;
    $d = json_decode($raw, true);
    if (empty($d['id'])) return null;
    return [
        'id'             => (int)$d['id'],
        'title'          => $d['title']         ?? $d['name']          ?? '',
        'original_title' => $d['original_title']?? $d['original_name'] ?? '',
        'release_date'   => $d['release_date']  ?? $d['first_air_date']?? '',
        'poster_path'    => $d['poster_path']   ?? '',
        'imdb_id'        => $d['imdb_id']       ?? '',
    ];
}

/**
 * Cherche dans movix par titre et trouve l'entrée dont le tmdb_id correspond.
 * Renvoie null si rien trouvé.
 */
function movix_find_by_tmdb(int $tmdbId, string $type, string $title, string $origTitle = ''): ?array {
    $queries = array_values(array_unique(array_filter([$title, $origTitle])));
    if (empty($queries)) return null;
    $expectType = ($type === 'tv') ? ['series','tv','animes_series'] : ['movies','movie','animes'];

    foreach ($queries as $q) {
        $raw = http_fetch(MOVIX_API . '/search?title=' . rawurlencode($q));
        if (!$raw) continue;
        $d = json_decode($raw, true);
        $results = $d['results'] ?? (is_array($d) ? $d : []);
        if (!$results) continue;
        // 1) match exact tmdb_id
        foreach ($results as $r) {
            if ((int)($r['tmdb_id'] ?? 0) === $tmdbId) return $r;
        }
        // 2) match imdb_id si dispo
        // 3) défaut : premier résultat du bon type (mais on garde tmdb_id en priorité)
    }
    return null;
}

function movix_download_list(int $titleId, int $tmdbId, string $type, int $season = 0, int $episode = 0): ?array {
    $route = ($type === 'tv') ? 'tv' : 'movie';
    $url = MOVIX_API . '/darkiworld/download/' . $route . '/' . $titleId
         . '?tmdbId=' . $tmdbId;
    if ($route === 'tv') {
        // movix.tax exige season + episode pour les séries
        if ($season  <= 0) $season  = 1;
        if ($episode <= 0) $episode = 1;
        $url .= '&season=' . $season . '&episode=' . $episode;
    }
    $raw = http_fetch($url, 20);
    if (!$raw) return null;
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function movix_decode_links_batch(array $linkIds, int $titleId): array {
    if (empty($linkIds)) return [];
    $urls = [];
    foreach ($linkIds as $lid) {
        $urls[] = MOVIX_API . '/darkiworld/decode/' . $lid . '?title_id=' . $titleId;
    }
    $raws = http_fetch_multi($urls, 12);
    $byId = [];
    foreach ($linkIds as $i => $lid) {
        $body = $raws[$urls[$i]] ?? null;
        if (!$body) continue;
        $d = json_decode($body, true);
        if (!$d || empty($d['success'])) continue;
        $url = '';
        if (isset($d['embed_url']['lien']) && is_string($d['embed_url']['lien'])) {
            $url = $d['embed_url']['lien'];
        } elseif (isset($d['url']) && is_string($d['url'])) {
            $url = $d['url'];
        } elseif (isset($d['link']) && is_string($d['link'])) {
            $url = $d['link'];
        }
        if ($url) $byId[$lid] = $url;
    }
    return $byId;
}

// ═════════════════════════════════════════════════════════════
// FORMAT
// ═════════════════════════════════════════════════════════════
function human_size(int $bytes): string {
    if ($bytes <= 0) return '';
    $units = ['B','KB','MB','GB','TB'];
    $i = (int)floor(log($bytes, 1024));
    $i = min($i, count($units) - 1);
    $v = $bytes / pow(1024, $i);
    return ($v >= 100 ? sprintf('%d', $v) : sprintf('%.1f', $v)) . ' ' . $units[$i];
}

function format_qualities(array $items): array {
    // Groupe par quality+lang
    $groups = [];
    foreach ($items as $it) {
        $q = trim($it['quality'] ?? 'Inconnu');
        $l = trim($it['language'] ?? '');
        $key = $q . '||' . $l;
        if (!isset($groups[$key])) {
            $groups[$key] = ['quality' => $q, 'lang' => $l, 'downloadLinks' => []];
        }
        $rawId = $it['id'] ?? '';
        $source = $it['source'] ?? 'darkiworld';
        $directUrl = '';
        $numericId = 0;
        // Source "movix" : id est du type "movix:https://send.now/d/XYZ" → URL déjà inline
        if (is_string($rawId) && strpos($rawId, 'movix:') === 0) {
            $directUrl = substr($rawId, 6);
            $numericId = 0;
        } else {
            $numericId = (int)$rawId;
        }
        $groups[$key]['downloadLinks'][] = [
            'id'          => $numericId,
            'host'        => $it['host_name']  ?? ($it['provider'] ?? ''),
            'host_icon'   => $it['host_icon']  ?? '',
            'quality'     => $q,
            'lang'        => $l,
            'sub'         => $it['sub']        ?? '',
            'size_bytes'  => (int)($it['size'] ?? 0),
            'size'        => human_size((int)($it['size'] ?? 0)),
            'upload_date' => $it['upload_date']?? '',
            'view'        => (int)($it['view'] ?? 0),
            'source'      => $source,
            'url'         => $directUrl,  // rempli ici pour source=movix, sinon par décodage batch
        ];
    }
    // Trie par qualité (4K > 1080 > 720 > …)
    $rank = function (string $q): int {
        $u = strtoupper($q);
        if (strpos($u, '2160') !== false || strpos($u, '4K') !== false || strpos($u, 'ULTRA HD') !== false) return 0;
        if (strpos($u, '1080') !== false) return 1;
        if (strpos($u, '720')  !== false) return 2;
        if (strpos($u, 'HDLIGHT') !== false || strpos($u, 'HDLight') !== false) return 3;
        if (strpos($u, 'WEB')  !== false) return 4;
        return 5;
    };
    uasort($groups, fn($a, $b) => $rank($a['quality']) - $rank($b['quality']));
    return array_values($groups);
}

// ═════════════════════════════════════════════════════════════
// ROUTING
// ═════════════════════════════════════════════════════════════
$type   = strtolower(trim((string)($_GET['type'] ?? 'movie')));
$tmdbId = (int)($_GET['id'] ?? 0);
$query  = trim((string)($_GET['q'] ?? ''));
$season = (int)($_GET['s'] ?? 0);
$episode= (int)($_GET['e'] ?? 0);
$decode = (int)($_GET['decode'] ?? 1) === 1;

if (!in_array($type, ['movie','film','tv','serie','series','anime','animes'], true)) {
    http_response_code(400);
    echo json_encode(['error' => "type invalide (attendu : movie, tv, anime)"]);
    exit;
}
$normType = in_array($type, ['tv','serie','series'], true) ? 'tv' : 'movie';

if ($tmdbId <= 0 && $query === '') {
    http_response_code(400);
    echo json_encode(['error' => "Soit 'id' (tmdb_id) soit 'q' (titre) est requis"]);
    exit;
}

// 1) Récupère métadonnées TMDB
$tmdbData = null;
if ($tmdbId > 0) {
    $tmdbData = tmdb_get($tmdbId, $normType);
    if (!$tmdbData) {
        http_response_code(404);
        echo json_encode(['error' => "TMDB ID {$tmdbId} introuvable pour type {$normType}"]);
        exit;
    }
}
$searchTitle = $query ?: ($tmdbData['title'] ?? '');
$origTitle   = $tmdbData['original_title'] ?? '';

// 2) Cherche le titre côté movix → titleId
$movixEntry = movix_find_by_tmdb($tmdbId ?: 0, $normType, $searchTitle, $origTitle);
if (!$movixEntry || empty($movixEntry['id'])) {
    echo json_encode([
        'tmdbId'        => $tmdbId ?: null,
        'type'          => $normType,
        'titleId'       => null,
        'title'         => $tmdbData['title'] ?? $searchTitle,
        'originalTitle' => $origTitle ?: null,
        'poster'        => !empty($tmdbData['poster_path'])
                            ? 'https://image.tmdb.org/t/p/w500' . $tmdbData['poster_path']
                            : null,
        'year'          => $tmdbData ? substr($tmdbData['release_date'], 0, 4) : null,
        'season'        => $season  ?: null,
        'episode'       => $episode ?: null,
        'qualities'     => [],
        'totalLinks'    => 0,
        'movixCount'    => 0,
        'message'       => 'Aucune correspondance movix.tax pour ce titre',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$titleId = (int)$movixEntry['id'];

// 3) Liste des liens de téléchargement
$dl = movix_download_list($titleId, $tmdbId ?: (int)($movixEntry['tmdb_id'] ?? 0), $normType, $season, $episode);
if (!$dl || empty($dl['success'])) {
    echo json_encode([
        'tmdbId'        => $tmdbId ?: null,
        'type'          => $normType,
        'titleId'       => $titleId,
        'title'         => $movixEntry['name'] ?? ($tmdbData['title'] ?? ''),
        'originalTitle' => $movixEntry['original_title'] ?? $origTitle,
        'poster'        => $movixEntry['poster'] ?? null,
        'year'          => substr((string)($movixEntry['release_date'] ?? ''), 0, 4),
        'season'        => $season  ?: null,
        'episode'       => $episode ?: null,
        'qualities'     => [],
        'totalLinks'    => 0,
        'movixCount'    => 0,
        'message'       => 'Aucun lien retourné par movix/darkiworld',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawLinks = $dl['all'] ?? [];

// 3bis) Filtre saison/épisode si série (movix renvoie déjà filtré par s/e côté API,
//       on garde le filtre client pour sécurité si une réponse mélange).
if ($normType === 'tv' && ($season > 0 || $episode > 0)) {
    $rawLinks = array_values(array_filter($rawLinks, function ($l) use ($season, $episode) {
        if ($season  > 0 && (int)($l['saison']  ?? $l['season']  ?? 0) !== $season  && isset($l['saison']))  return false;
        if ($episode > 0 && (int)($l['episode'] ?? 0) !== $episode && isset($l['episode'])) return false;
        return true;
    }));
}

// 4) Formate par qualité
$qualities = format_qualities($rawLinks);

// 5) Décode chaque lien (optionnel — par défaut activé)
if ($decode) {
    $allIds = [];
    foreach ($qualities as $q) {
        foreach ($q['downloadLinks'] as $lk) {
            // On décode seulement les liens darkiworld à id numérique sans URL déjà résolue
            if (!empty($lk['id']) && empty($lk['url'])) $allIds[] = (int)$lk['id'];
        }
    }
    $byId = movix_decode_links_batch($allIds, $titleId);
    foreach ($qualities as &$q) {
        foreach ($q['downloadLinks'] as &$lk) {
            $id = (int)($lk['id'] ?? 0);
            if ($id && empty($lk['url']) && isset($byId[$id])) $lk['url'] = $byId[$id];
            $lk['available'] = $lk['url'] !== '';
        }
        unset($lk);
    }
    unset($q);
} else {
    // Pas de décodage : seuls les liens à URL déjà connue sont disponibles
    foreach ($qualities as &$q) {
        foreach ($q['downloadLinks'] as &$lk) {
            $lk['available'] = $lk['url'] !== '';
        }
        unset($lk);
    }
    unset($q);
}

$totalLinks = array_sum(array_map(fn($q) => count($q['downloadLinks']), $qualities));

echo json_encode([
    'tmdbId'        => $tmdbId ?: (int)($movixEntry['tmdb_id'] ?? 0),
    'type'          => $normType,
    'titleId'       => $titleId,
    'title'         => $movixEntry['name'] ?? ($tmdbData['title'] ?? ''),
    'originalTitle' => $movixEntry['original_title'] ?? $origTitle,
    'poster'        => $movixEntry['poster'] ?? (
        !empty($tmdbData['poster_path'])
            ? 'https://image.tmdb.org/t/p/w500' . $tmdbData['poster_path']
            : null
    ),
    'year'          => substr((string)($movixEntry['release_date'] ?? ($tmdbData['release_date'] ?? '')), 0, 4) ?: null,
    'season'        => $season  ?: null,
    'episode'       => $episode ?: null,
    'qualities'     => $qualities,
    'totalLinks'    => $totalLinks,
    'movixCount'    => (int)($dl['movixCount'] ?? 0),
    'message'       => $totalLinks === 0 ? 'Aucun lien disponible' : null,
], JSON_UNESCAPED_UNICODE);
