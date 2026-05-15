module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/mongodb [external] (mongodb, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("mongodb", () => require("mongodb"));

module.exports = mod;
}),
"[project]/lib/mongo/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * MongoDB connection helper.
 * Single, cached MongoClient + Db across the Next.js dev/prod runtimes.
 */ __turbopack_context__.s([
    "getCollection",
    ()=>getCollection,
    "getDb",
    ()=>getDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "wwembed";
async function getDb() {
    if (global.__mongoDb) return global.__mongoDb;
    const client = global.__mongoClient ?? new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["MongoClient"](MONGO_URL);
    if (!global.__mongoClient) {
        await client.connect();
        global.__mongoClient = client;
    }
    const db = client.db(DB_NAME);
    global.__mongoDb = db;
    if (!global.__mongoIndexed) {
        global.__mongoIndexed = true;
        await ensureIndexes(db).catch((e)=>console.error("Index creation failed:", e));
    }
    return db;
}
async function ensureIndexes(db) {
    // users (auth)
    await db.collection("users").createIndex({
        email: 1
    }, {
        unique: true
    });
    await db.collection("users").createIndex({
        username: 1
    }, {
        unique: true,
        sparse: true
    });
    // streaming/download links
    await db.collection("streaming_links").createIndex({
        tmdb_id: 1,
        media_type: 1
    });
    await db.collection("streaming_links").createIndex({
        ww_id: 1
    });
    await db.collection("streaming_links").createIndex({
        legacy_uuid: 1
    });
    await db.collection("download_links").createIndex({
        tmdb_id: 1,
        media_type: 1
    });
    await db.collection("download_links").createIndex({
        ww_id: 1
    });
    await db.collection("download_links").createIndex({
        legacy_uuid: 1
    });
    // digital
    await db.collection("digital_content").createIndex({
        ww_id: 1
    }, {
        unique: true
    });
    await db.collection("digital_content").createIndex({
        content_type: 1
    });
    await db.collection("digital_download_links").createIndex({
        content_id: 1
    });
    await db.collection("digital_download_links").createIndex({
        ww_id: 1
    });
    await db.collection("digital_download_links").createIndex({
        legacy_uuid: 1
    });
    // live tv
    await db.collection("live_tv_channels").createIndex({
        status: 1,
        is_active: 1
    });
    await db.collection("live_tv_sources").createIndex({
        channel_id: 1
    });
    // stats — primary lookup indexes
    await db.collection("embed_views").createIndex({
        ww_id: 1
    });
    await db.collection("embed_views").createIndex({
        viewed_at: -1
    });
    await db.collection("embed_views").createIndex({
        embed_type: 1,
        viewed_at: -1
    });
    await db.collection("link_clicks").createIndex({
        clicked_at: -1
    });
    await db.collection("link_clicks").createIndex({
        link_id: 1,
        clicked_at: -1
    });
    await db.collection("api_usage").createIndex({
        created_at: -1
    });
    // stats — TTL (auto-purge raw events older than 180 days). We use the
    // dedicated `_ttl` Date field populated at insert (see shim.ts) because
    // Mongo TTL indexes only work on Date BSON, not on ISO strings.
    const TTL_180_DAYS = 180 * 86400;
    await safeTtl(db, "embed_views", TTL_180_DAYS);
    await safeTtl(db, "link_clicks", TTL_180_DAYS);
    await safeTtl(db, "ad_clicks", TTL_180_DAYS);
    // login_attempts has its own short TTL (24h) created on first rate-limit hit.
    // ads
    await db.collection("ads").createIndex({
        slot_number: 1
    }, {
        unique: true,
        sparse: true
    });
    // bug reports
    await db.collection("bug_reports").createIndex({
        created_at: -1
    });
    // login attempts
    await db.collection("login_attempts").createIndex({
        identifier: 1
    });
    // tmdb cache (used by lib/tmdb-cache.ts)
    await db.collection("tmdb_cache").createIndex({
        key: 1
    }, {
        unique: true
    });
    await safeTtl(db, "tmdb_cache", 7 * 86400); // 7 days
}
async function safeTtl(db, coll, seconds) {
    try {
        await db.collection(coll).createIndex({
            _ttl: 1
        }, {
            expireAfterSeconds: seconds,
            name: "_ttl_auto_purge"
        });
    } catch (e) {
    // Index may exist with different opts — fine.
    }
}
async function getCollection(name) {
    const db = await getDb();
    return db.collection(name);
}
}),
"[project]/app/api/v1/zt-proxy/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/v1/zt-proxy
 *
 * Server-side cache proxy for the ZT external API
 * (https://apis.wavewatch.top/zt.php). Saves a Mongo-backed copy of every
 * upstream response for 1 hour (configurable via ZT_CACHE_TTL_MS env var).
 *
 * The upstream API for TV searches can take ~15s — caching brings repeat
 * visits down to ~30ms. Same query signature → same cached payload.
 *
 * Query params (forwarded verbatim to ZT):
 *   - type   (movie | tv | anime | jeux | musique | ebook | logiciel)
 *   - id     (TMDB id, for movie/tv)
 *   - s, e   (season + episode, for tv)
 *   - q      (search text, used by digital types)
 *
 * Cache collection: `zt_cache`
 *   _id: deterministic SHA-256 hex of the query string
 *   data: JSON response
 *   cached_at: ISO string
 *   expires_at: Date (TTL index purges after expiry)
 */ __turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
;
const ZT_UPSTREAM = "https://apis.wavewatch.top/zt.php";
const TTL_MS = Number(process.env.ZT_CACHE_TTL_MS) || 60 * 60_000 // 1 hour
;
const ALLOWED_TYPES = new Set([
    "movie",
    "tv",
    "anime",
    "jeux",
    "musique",
    "ebook",
    "logiciel",
    "documentaire",
    "emission",
    "spectacle",
    "concert",
    "sport",
    "auto",
    "formation"
]);
let cacheIndexEnsured = false;
async function ensureCacheIndex() {
    if (cacheIndexEnsured) return;
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        await db.collection("zt_cache").createIndex({
            expires_at: 1
        }, {
            expireAfterSeconds: 0,
            name: "_zt_cache_ttl"
        });
    } catch  {
    /* ignore (index may exist already) */ }
    cacheIndexEnsured = true;
}
function buildCacheKey(params) {
    const ordered = Object.keys(params).sort().map((k)=>`${k}=${params[k]}`).join("&");
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(ordered).digest("hex");
}
async function GET(req) {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "").toLowerCase().trim();
    const id = (url.searchParams.get("id") || "").trim();
    const s = (url.searchParams.get("s") || "").trim();
    const e = (url.searchParams.get("e") || "").trim();
    const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
    if (!type || !ALLOWED_TYPES.has(type)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid or missing 'type'"
        }, {
            status: 400
        });
    }
    if (!id && !q) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Either 'id' or 'q' is required"
        }, {
            status: 400
        });
    }
    await ensureCacheIndex();
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const params = {
        _route: "api",
        type
    };
    if (id) params.id = id;
    if (s) params.s = s;
    if (e) params.e = e;
    if (q) params.q = q;
    const cacheKey = buildCacheKey(params);
    // 1) Try cache
    const cached = await db.collection("zt_cache").findOne({
        _id: cacheKey
    });
    const now = Date.now();
    if (cached && cached.expires_at && new Date(cached.expires_at).getTime() > now) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(cached.data, {
            headers: {
                "X-ZT-Cache": "HIT",
                "Cache-Control": "public, max-age=60"
            }
        });
    }
    // 2) Fetch upstream
    const upstreamQs = new URLSearchParams(params).toString();
    const upstreamUrl = `${ZT_UPSTREAM}?${upstreamQs}`;
    try {
        const ctrl = new AbortController();
        const tm = setTimeout(()=>ctrl.abort(), 25_000);
        const res = await fetch(upstreamUrl, {
            signal: ctrl.signal,
            headers: {
                "User-Agent": "WWEmbed-ZT-Proxy/1.0"
            }
        });
        clearTimeout(tm);
        if (!res.ok) {
            // Serve stale cache if we have one, otherwise propagate error.
            if (cached) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(cached.data, {
                    headers: {
                        "X-ZT-Cache": "STALE"
                    }
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Upstream " + res.status
            }, {
                status: 502
            });
        }
        const data = await res.json();
        const expires_at = new Date(now + TTL_MS);
        await db.collection("zt_cache").updateOne({
            _id: cacheKey
        }, {
            $set: {
                _id: cacheKey,
                data,
                cached_at: new Date(now).toISOString(),
                expires_at
            }
        }, {
            upsert: true
        }).catch(()=>{});
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data, {
            headers: {
                "X-ZT-Cache": "MISS",
                "Cache-Control": "public, max-age=60"
            }
        });
    } catch (err) {
        if (cached) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(cached.data, {
                headers: {
                    "X-ZT-Cache": "STALE-ERR"
                }
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Upstream failed",
            detail: String(err?.message || err)
        }, {
            status: 502
        });
    }
}
const dynamic = "force-dynamic";
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7850f666._.js.map