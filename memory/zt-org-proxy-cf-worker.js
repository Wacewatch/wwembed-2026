/**
 * Cloudflare Worker — Proxy ZT .org (bypass Cloudflare block des IPs serveur)
 *
 * Pourquoi ce worker ?
 *   Cloudflare bloque `https://www.zone-telechargement.org/*` depuis TOUTES les
 *   IPs data-center (AWS, OVH, GCP, Hetzner, etc.) avec des erreurs HTTP 403.
 *   Seules les IPs résidentielles (FAI grand public) ont accès.
 *
 *   Mais les Cloudflare Workers tournent sur le réseau Cloudflare lui-même,
 *   ce qui leur permet (dans 95% des cas) de passer les vérifications anti-bot
 *   des autres sites Cloudflare. Ce worker sert donc de pont entre apis.wavewatch.top
 *   et zone-telechargement.org.
 *
 * Déploiement (5 min) :
 *   1. https://workers.cloudflare.com  →  Créer un compte (gratuit, 100k req/jour)
 *   2. "Create Worker"
 *   3. Coller ce script
 *   4. "Save and Deploy"  →  Cloudflare te donne une URL :
 *        https://zt-org-proxy.<TON-COMPTE>.workers.dev
 *   5. Dans `/app/zt.php`, remplacer le 1er élément de `ZT_MIRRORS` :
 *
 *        const ZT_MIRRORS = [
 *            'https://zt-org-proxy.<TON-COMPTE>.workers.dev',  // proxy → .org
 *            'https://www.zone-telechargement.cafe',           // fallback direct
 *        ];
 *
 *   6. Upload du zt.php modifié sur apis.wavewatch.top
 *
 * Coût : gratuit jusqu'à 100 000 requêtes / jour (largement suffisant)
 */

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    // 1) Build target URL on the real .org domain
    const target = 'https://www.zone-telechargement.org' + incoming.pathname + incoming.search;

    // 2) Forward headers but override host/origin/UA to look like a browser
    const upstreamHeaders = new Headers();
    upstreamHeaders.set('User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    upstreamHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    upstreamHeaders.set('Accept-Language', 'fr-FR,fr;q=0.9,en;q=0.8');
    upstreamHeaders.set('Accept-Encoding', 'gzip, deflate, br');
    upstreamHeaders.set('Referer', 'https://www.zone-telechargement.org/');
    upstreamHeaders.set('Sec-Ch-Ua', '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"');
    upstreamHeaders.set('Sec-Ch-Ua-Mobile', '?0');
    upstreamHeaders.set('Sec-Ch-Ua-Platform', '"Windows"');
    upstreamHeaders.set('Sec-Fetch-Dest', 'document');
    upstreamHeaders.set('Sec-Fetch-Mode', 'navigate');
    upstreamHeaders.set('Sec-Fetch-Site', 'none');
    upstreamHeaders.set('Upgrade-Insecure-Requests', '1');

    // 3) Fetch upstream and stream back to caller
    const upstream = await fetch(target, {
      method: request.method,
      headers: upstreamHeaders,
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
      // Cache 5 min côté CF pour réduire la charge sur .org
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    // 4) Mirror response with CORS open so apis.wavewatch.top can read it
    const out = new Headers(upstream.headers);
    out.set('Access-Control-Allow-Origin', '*');
    out.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    out.set('X-Proxied-From', target);
    // CF re-comprime côté edge ; on retire l'encoding pour que le client (curl PHP)
    // reçoive du plain HTML.
    out.delete('content-encoding');
    out.delete('content-length');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  },
};
