<?php
/**
 * ════════════════════════════════════════════════════════════════
 *  darkst.php — API REST de sources de streaming pour movix.tax
 *
 *  Aggrège en parallèle les providers de streaming exposés par
 *  api.movix.tax :
 *    - purstream    (m3u8 direct)
 *    - links        (embeds génériques)
 *    - fstream      (movies uniquement)
 *    - wiflix       (movies uniquement)
 *    - cpasmal      (movies uniquement)
 *
 *  Routes :
 *    /darkst.php?type=movie&id={tmdb_id}
 *    /darkst.php?type=tv&id={tmdb_id}&s={saison}&e={episode}
 *
 *  Filtres optionnels :
 *    &providers=purstream,wiflix     → ne fetche que ces providers
 *    &lang=vf|vo|vostfr              → filtre la langue (case-insensitive)
 *
 *  Format JSON :
 *  {
 *    "tmdbId": 1226863,
 *    "type":   "movie",
 *    "title":  "...",
 *    "year":   "2026",
 *    "season": null,
 *    "episode": null,
 *    "sources": [
 *      {
 *        "provider": "purstream", "player": "pulse", "host": "senpai-stream",
 *        "url": "https://.../master.m3u8",
 *        "format": "m3u8", "lang": "MULTI", "quality": "1080p", "type": "direct"
 *      },
 *      {
 *        "provider": "fstream", "player": "Uqload", "host": "uqload.is",
 *        "url": "https://uqload.is/embed-xxx.html",
 *        "format": "embed", "lang": "VFQ", "quality": "HD", "type": "embed"
 *      }
 *    ],
 *    "byProvider": {
 *      "purstream": {"ok":true, "count": 2},
 *      "fstream":   {"ok":true, "count": 12},
 *      "wiflix":    {"ok":true, "count": 8},
 *      "cpasmal":   {"ok":true, "count": 10},
 *      "links":     {"ok":true, "count": 4}
 *    },
 *    "totalSources": 36
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

const MOVIX_API     = 'https://api.movix.tax/api';
const TMDB_API_KEY  = 'd4b8332681051181b69c8a6c9ba1a70a';
const TMDB_BASE     = 'https://api.themoviedb.org/3';
const FETCH_TIMEOUT = 15;
const USER_AGENT    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const ORIGIN        = 'https://movix.tax';

// Providers + qui supporte TV
const PROVIDERS = [
    'purstream' => ['movie' => true,  'tv' => true],
    'fstream'   => ['movie' => true,  'tv' => false],
    'wiflix'    => ['movie' => true,  'tv' => false],
    'cpasmal'   => ['movie' => true,  'tv' => false],
    'links'     => ['movie' => true,  'tv' => true],
];

// ═════════════════════════════════════════════════════════════
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
        $results[$url] = ($code >= 200 && $code < 400 && is_string($body) && $body !== '') ? $body : null;
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $results;
}

function http_fetch(string $url, int $timeout = FETCH_TIMEOUT): ?string {
    $r = http_fetch_multi([$url], $timeout);
    return $r[$url] ?? null;
}

// ═════════════════════════════════════════════════════════════
// TMDB
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

// ═════════════════════════════════════════════════════════════
// Build provider URLs
// ═════════════════════════════════════════════════════════════
function build_provider_urls(int $tmdbId, string $type, int $season, int $episode, array $only): array {
    $isTv = ($type === 'tv');
    $route = $isTv ? 'tv' : 'movie';
    $urls = [];
    foreach (PROVIDERS as $p => $cfg) {
        if (!$cfg[$type]) continue;
        if ($only && !in_array($p, $only, true)) continue;
        switch ($p) {
            case 'purstream':
                $u = MOVIX_API . '/purstream/' . $route . '/' . $tmdbId . '/stream';
                if ($isTv) $u .= '?season=' . max(1, $season) . '&episode=' . max(1, $episode);
                $urls[$p] = $u;
                break;
            case 'links':
                $urls[$p] = MOVIX_API . '/links/' . $route . '/' . $tmdbId;
                break;
            case 'fstream':
            case 'wiflix':
            case 'cpasmal':
                $urls[$p] = MOVIX_API . '/' . $p . '/' . $route . '/' . $tmdbId;
                break;
        }
    }
    return $urls;
}

// ═════════════════════════════════════════════════════════════
// Normalize each provider's response
// ═════════════════════════════════════════════════════════════
function host_from_url(string $url): string {
    $p = parse_url($url);
    if (empty($p['host'])) return '';
    return preg_replace('/^(?:www\d*|cdn\d*|dl\d*)\./', '', strtolower($p['host']));
}

function detect_lang(string $s): string {
    $u = strtoupper($s);
    if (strpos($u, 'VOSTFR') !== false) return 'VOSTFR';
    if (strpos($u, 'VFQ')    !== false) return 'VFQ';
    if (strpos($u, 'VF')     !== false) return 'VF';
    if (strpos($u, 'VO')     !== false) return 'VO';
    if (strpos($u, 'MULTI')  !== false) return 'MULTI';
    if (strpos($u, 'TRUEFRENCH') !== false) return 'TRUEFRENCH';
    return '';
}

function detect_quality(string $s): string {
    $u = strtoupper($s);
    if (strpos($u, '2160') !== false || strpos($u, '4K')   !== false) return '4K';
    if (strpos($u, '1080') !== false)                                  return '1080p';
    if (strpos($u, '720')  !== false)                                  return '720p';
    if (strpos($u, '480')  !== false)                                  return '480p';
    if (strpos($u, 'HD')   !== false)                                  return 'HD';
    return '';
}

function normalize_provider_data(string $provider, ?array $data, int $season = 0, int $episode = 0): array {
    if (!$data) return [];
    $out = [];

    switch ($provider) {
        case 'purstream':
            foreach ($data['sources'] ?? [] as $s) {
                $name = (string)($s['name'] ?? '');
                $parts = array_map('trim', explode('|', $name));
                $player  = $parts[0] ?? '';
                $quality = isset($parts[1]) ? detect_quality($parts[1]) : '';
                $lang    = isset($parts[2]) ? detect_lang($parts[2])    : '';
                $url     = (string)($s['url'] ?? '');
                $fmt     = (string)($s['format'] ?? '');
                $out[] = [
                    'provider' => 'purstream',
                    'player'   => $player ?: 'pulse',
                    'host'     => host_from_url($url),
                    'url'      => $url,
                    'format'   => $fmt ?: 'm3u8',
                    'lang'     => $lang,
                    'quality'  => $quality ?: '1080p',
                    'type'     => 'direct',  // lecture native via player m3u8
                ];
            }
            break;

        case 'links':
            // Format movie : {data: {links: [url,...]}}
            // Format tv    : {data: [{season_number, episode_number, links:[]}]}
            $items = [];
            if (is_array($data['data'] ?? null)) {
                if (isset($data['data']['links']) && is_array($data['data']['links'])) {
                    $items = [['links' => $data['data']['links']]];
                } else {
                    $items = $data['data'];
                }
            }
            foreach ($items as $it) {
                if ($season  > 0 && isset($it['season_number'])  && (int)$it['season_number']  !== $season)  continue;
                if ($episode > 0 && isset($it['episode_number']) && (int)$it['episode_number'] !== $episode) continue;
                foreach (($it['links'] ?? []) as $u) {
                    if (!is_string($u) || !$u) continue;
                    $h = host_from_url($u);
                    $out[] = [
                        'provider' => 'links',
                        'player'   => ucfirst(explode('.', $h)[0] ?: ''),
                        'host'     => $h,
                        'url'      => $u,
                        'format'   => 'embed',
                        'lang'     => '',
                        'quality'  => '',
                        'type'     => 'embed',
                    ];
                }
            }
            break;

        case 'fstream':
            foreach ($data['players'] ?? [] as $langKey => $list) {
                foreach ((array)$list as $p) {
                    $url = (string)($p['url'] ?? '');
                    if (!$url) continue;
                    $out[] = [
                        'provider' => 'fstream',
                        'player'   => (string)($p['player'] ?? ''),
                        'host'     => host_from_url($url),
                        'url'      => $url,
                        'format'   => (string)($p['type'] ?? 'embed'),
                        'lang'     => detect_lang((string)$langKey),
                        'quality'  => detect_quality((string)($p['quality'] ?? '')),
                        'type'     => 'embed',
                    ];
                }
            }
            break;

        case 'wiflix':
            foreach ($data['players'] ?? [] as $langKey => $list) {
                foreach ((array)$list as $p) {
                    $url = (string)($p['url'] ?? '');
                    if (!$url) continue;
                    $name = (string)($p['name'] ?? '');
                    $out[] = [
                        'provider' => 'wiflix',
                        'player'   => preg_replace('/\.[a-z]{2,4}.*$/', '', $name) ?: '',
                        'host'     => host_from_url($url) ?: $name,
                        'url'      => $url,
                        'format'   => 'embed',
                        'lang'     => detect_lang((string)($p['type'] ?? $langKey)),
                        'quality'  => '',
                        'type'     => 'embed',
                    ];
                }
            }
            break;

        case 'cpasmal':
            foreach ($data['links'] ?? [] as $langKey => $list) {
                foreach ((array)$list as $p) {
                    $url = (string)($p['url'] ?? '');
                    if (!$url) continue;
                    $out[] = [
                        'provider' => 'cpasmal',
                        'player'   => ucfirst((string)($p['server'] ?? '')),
                        'host'     => host_from_url($url),
                        'url'      => $url,
                        'format'   => 'embed',
                        'lang'     => detect_lang((string)$langKey),
                        'quality'  => '',
                        'type'     => 'embed',
                    ];
                }
            }
            break;
    }
    return $out;
}

// ═════════════════════════════════════════════════════════════
// ROUTING
// ═════════════════════════════════════════════════════════════
$type    = strtolower(trim((string)($_GET['type'] ?? 'movie')));
$tmdbId  = (int)($_GET['id'] ?? 0);
$season  = (int)($_GET['s']  ?? 0);
$episode = (int)($_GET['e']  ?? 0);
$onlyRaw = trim((string)($_GET['providers'] ?? ''));
$only    = $onlyRaw ? array_filter(array_map('trim', explode(',', strtolower($onlyRaw)))) : [];
$langF   = strtoupper(trim((string)($_GET['lang'] ?? '')));

if (!in_array($type, ['movie','film','tv','serie','series','anime'], true)) {
    http_response_code(400);
    echo json_encode(['error' => "type invalide (movie, tv)"]);
    exit;
}
$normType = in_array($type, ['tv','serie','series'], true) ? 'tv' : 'movie';
if ($tmdbId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => "Le paramètre 'id' (tmdb_id) est requis"]);
    exit;
}
if ($normType === 'tv' && ($season <= 0 || $episode <= 0)) {
    http_response_code(400);
    echo json_encode(['error' => "Pour les séries, 's' (saison) et 'e' (épisode) sont requis"]);
    exit;
}

// 1) TMDB metadata (en parallèle des providers)
$tmdb = tmdb_get($tmdbId, $normType);

// 2) Fetch tous les providers en parallèle
$urls = build_provider_urls($tmdbId, $normType, $season, $episode, $only);
$raws = http_fetch_multi(array_values($urls), FETCH_TIMEOUT);

$allSources = [];
$byProvider = [];
foreach ($urls as $p => $url) {
    $raw = $raws[$url] ?? null;
    if ($raw === null) {
        $byProvider[$p] = ['ok' => false, 'count' => 0];
        continue;
    }
    $data = json_decode($raw, true);
    $items = normalize_provider_data($p, $data, $season, $episode);
    // Filtre langue si demandé
    if ($langF) {
        $items = array_values(array_filter($items, fn($it) => $it['lang'] === $langF));
    }
    $byProvider[$p] = ['ok' => true, 'count' => count($items)];
    foreach ($items as $it) $allSources[] = $it;
}

// 3) Tri par priorité : direct (m3u8) → embeds par player connu
$playerRank = function (array $s): int {
    if ($s['type'] === 'direct') return 0;
    $known = ['Vidzy','Uqload','Voe','Dood','Filemoon','Premium','vidsonic','vidara'];
    foreach ($known as $i => $kn) {
        if (stripos($s['player'], $kn) !== false) return 1 + $i;
    }
    return 99;
};
usort($allSources, fn($a, $b) => $playerRank($a) - $playerRank($b));

echo json_encode([
    'tmdbId'        => $tmdbId,
    'type'          => $normType,
    'title'         => $tmdb['title'] ?? null,
    'originalTitle' => $tmdb['original_title'] ?? null,
    'poster'        => !empty($tmdb['poster_path'])
                        ? 'https://image.tmdb.org/t/p/w500' . $tmdb['poster_path']
                        : null,
    'year'          => $tmdb ? substr($tmdb['release_date'], 0, 4) : null,
    'season'        => $season  ?: null,
    'episode'       => $episode ?: null,
    'sources'       => array_values($allSources),
    'byProvider'    => $byProvider,
    'totalSources'  => count($allSources),
], JSON_UNESCAPED_UNICODE);
