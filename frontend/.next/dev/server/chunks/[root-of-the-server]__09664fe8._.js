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
    await safeTtl(db, "embed_views", 180);
    await safeTtl(db, "link_clicks", 180);
    await safeTtl(db, "ad_clicks", 180);
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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[project]/lib/mongo/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * JWT auth helpers (server-side only).
 * Uses bcryptjs + jsonwebtoken with httpOnly cookies.
 */ __turbopack_context__.s([
    "COOKIES",
    ()=>COOKIES,
    "clearAuthCookies",
    ()=>clearAuthCookies,
    "createAccessToken",
    ()=>createAccessToken,
    "createRefreshToken",
    ()=>createRefreshToken,
    "getCurrentUser",
    ()=>getCurrentUser,
    "hashPassword",
    ()=>hashPassword,
    "requireAdmin",
    ()=>requireAdmin,
    "requireUser",
    ()=>requireUser,
    "setAuthCookies",
    ()=>setAuthCookies,
    "verifyAccessToken",
    ()=>verifyAccessToken,
    "verifyPassword",
    ()=>verifyPassword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jsonwebtoken/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
;
;
;
const JWT_SECRET = (()=>{
    const v = process.env.JWT_SECRET;
    if (!v || v === "change-me-in-prod") {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // Dev fallback — never reachable in prod thanks to the guard above.
        console.warn("[auth] JWT_SECRET not set, using dev-only fallback. DO NOT deploy without setting it.");
        return "dev-only-insecure-secret-do-not-use-in-prod";
    }
    if (v.length < 32) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        console.warn("[auth] JWT_SECRET is shorter than 32 chars — unsafe in prod.");
    }
    return v;
})();
const ACCESS_COOKIE = "ww_access";
const REFRESH_COOKIE = "ww_refresh";
async function hashPassword(plain) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(plain, 10);
}
async function verifyPassword(plain, hash) {
    if (!hash) return false;
    try {
        return await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(plain, hash);
    } catch  {
        return false;
    }
}
function createAccessToken(userId, email) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].sign({
        sub: userId,
        email,
        type: "access"
    }, JWT_SECRET, {
        expiresIn: "12h"
    });
}
function createRefreshToken(userId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].sign({
        sub: userId,
        type: "refresh"
    }, JWT_SECRET, {
        expiresIn: "30d"
    });
}
function verifyAccessToken(token) {
    try {
        const decoded = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].verify(token, JWT_SECRET);
        if (decoded.type !== "access") return null;
        return {
            sub: decoded.sub,
            email: decoded.email
        };
    } catch  {
        return null;
    }
}
function setAuthCookies(res, accessToken, refreshToken) {
    res.headers.append("Set-Cookie", `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);
    res.headers.append("Set-Cookie", `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
}
function clearAuthCookies(res) {
    res.headers.append("Set-Cookie", `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.headers.append("Set-Cookie", `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
async function getCurrentUser(req) {
    let token;
    if (req) {
        token = req.cookies.get(ACCESS_COOKIE)?.value;
    } else {
        const c = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        token = c.get(ACCESS_COOKIE)?.value;
    }
    if (!token) return null;
    const payload = verifyAccessToken(token);
    if (!payload) return null;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    let userDoc = null;
    if (/^[a-f0-9]{24}$/i.test(payload.sub)) {
        userDoc = await db.collection("users").findOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](payload.sub)
        });
    } else {
        userDoc = await db.collection("users").findOne({
            id: payload.sub
        });
    }
    if (!userDoc) return null;
    return {
        // Prefer legacy_uuid (original Supabase UUID) so that joins with foreign-key
        // fields stored as the old UUID (e.g. streaming_links.submitted_by from the
        // Supabase→Mongo migration) keep working. Fallback to the Mongo ObjectId hex
        // for post-migration users that don't have a legacy UUID.
        id: userDoc.legacy_uuid || userDoc._id?.toString() || userDoc.id,
        email: userDoc.email,
        username: userDoc.username || null,
        role: userDoc.role || "member",
        created_at: userDoc.created_at,
        needs_password_reset: userDoc.needs_password_reset || false
    };
}
async function requireUser(req) {
    const u = await getCurrentUser(req);
    if (!u) throw new Error("Unauthorized");
    return u;
}
async function requireAdmin(req) {
    const u = await requireUser(req);
    if (u.role !== "admin") throw new Error("Forbidden");
    return u;
}
const COOKIES = {
    ACCESS_COOKIE,
    REFRESH_COOKIE
};
}),
"[project]/lib/geo.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Country lookup helper using ip-api.com (free, no key, 45 req/min).
 *
 * Stores results in `geo_ip_cache` collection so we never re-query.
 * Returns ISO-2 country code (e.g. "FR") or null when lookup fails.
 *
 * NOTE: only call this in low-frequency paths (admin stats, lazy enrichment).
 * The free tier is HTTP-only and rate-limited, so we batch with bounded
 * concurrency and an in-memory cache for the current process.
 */ __turbopack_context__.s([
    "attachCountries",
    ()=>attachCountries,
    "countryForIp",
    ()=>countryForIp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
const memCache = new Map();
const CONCURRENCY = 5;
let inflight = 0;
const waiters = [];
async function gate() {
    while(inflight >= CONCURRENCY){
        await new Promise((r)=>waiters.push(r));
    }
    inflight++;
}
function release() {
    inflight--;
    const n = waiters.shift();
    if (n) n();
}
async function countryForIp(ip) {
    if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
        return null;
    }
    if (memCache.has(ip)) return memCache.get(ip);
    // Mongo cache (180 days TTL via _ttl Date)
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const cached = await db.collection("geo_ip_cache").findOne({
        ip
    });
    if (cached) {
        memCache.set(ip, cached.country || null);
        return cached.country || null;
    }
    await gate();
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), 4000);
        let country = null;
        try {
            const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`, {
                signal: ctrl.signal
            });
            if (r.ok) {
                const j = await r.json();
                if (j.status === "success" && j.countryCode) country = j.countryCode;
            }
        } catch  {
            country = null;
        } finally{
            clearTimeout(timer);
        }
        memCache.set(ip, country);
        try {
            await db.collection("geo_ip_cache").updateOne({
                ip
            }, {
                $set: {
                    ip,
                    country,
                    _ttl: new Date()
                }
            }, {
                upsert: true
            });
        } catch  {}
        return country;
    } finally{
        release();
    }
}
async function attachCountries(ipList) {
    const out = {};
    await Promise.all(ipList.map(async (ip)=>{
        out[ip] = await countryForIp(ip);
    }));
    return out;
}
}),
"[project]/lib/link-checker.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Download / streaming link health checker.
 *
 * Goals:
 *  • Reliable verdict: a link is only flagged DEAD after `DEAD_THRESHOLD`
 *    consecutive failures (anti-flap, avoids false negatives caused by
 *    one-off 5xx, captcha, regional blocks, network blips).
 *  • Host-aware: we never hit the same hoster more than `HOST_CONCURRENCY`
 *    times in parallel — many file hosts ban abusive IPs.
 *  • Browser-like requests: realistic User-Agent + Accept-Language headers
 *    so HEAD/GET don't get a 403 from anti-bot WAFs.
 *  • HEAD-first, GET-fallback: many hosters refuse HEAD; we then issue a
 *    small Range GET and abort.
 *  • Pattern-aware: even an HTTP 200 can host a "File not found" page; we
 *    scan the first few KB for common dead-link error patterns.
 *  • Idempotent storage: writes a `link_status` doc + updates the parent
 *    link with `is_valid`, `last_checked`, `consecutive_failures`,
 *    `dead_since`, `last_error`.
 *
 * Storage shape (collection: `link_status`, one doc per linkId):
 *   {
 *     link_id, collection, source_url, host,
 *     status: "alive" | "dead" | "unknown",
 *     consecutive_failures, last_checked_at, dead_since, last_error,
 *     last_http_status, response_ms, last_alive_at
 *   }
 */ __turbopack_context__.s([
    "DEAD_THRESHOLD",
    ()=>DEAD_THRESHOLD,
    "LINK_COLLECTIONS",
    ()=>LINK_COLLECTIONS,
    "checkAndRecord",
    ()=>checkAndRecord,
    "checkLinkOnce",
    ()=>checkLinkOnce,
    "recordCheckResult",
    ()=>recordCheckResult
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
const TIMEOUT_MS = 12_000;
const PATTERN_SCAN_BYTES = 16 * 1024 // peek 16 KB max
;
const DEAD_THRESHOLD = 3 // consecutive failures before flagging dead
;
const HOST_CONCURRENCY = 3;
const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8"
};
const DEAD_PATTERNS = [
    {
        name: "file_not_found",
        re: /file\s*(?:was\s+)?not\s+found/i
    },
    {
        name: "file_deleted",
        re: /file\s+(?:has\s+been\s+)?deleted/i
    },
    {
        name: "file_removed",
        re: /file\s+(?:has\s+been\s+)?removed/i
    },
    {
        name: "file_expired",
        re: /file\s+(?:has\s+)?expired/i
    },
    {
        name: "dmca",
        re: /(dmca|copyright\s+(?:infringement|claim)|takedown)/i
    },
    {
        name: "abuse_removed",
        re: /removed\s+(?:due\s+to|for)\s+(?:abuse|tos|terms)/i
    },
    {
        name: "not_exist",
        re: /does\s+not\s+exist|no\s+such\s+file/i
    },
    {
        name: "invalid_link",
        re: /invalid\s+(?:link|file|url|download)/i
    },
    {
        name: "unavailable",
        re: /(?:file|content)\s+(?:is\s+)?(?:currently\s+)?unavailable/i
    },
    {
        name: "page_404",
        re: /\b(?:page|file)\s+not\s+found\b|404\s+not\s+found/i
    }
];
// ───── host throttling ─────
const hostInFlight = new Map();
const hostWaiters = new Map();
async function acquireHostSlot(host) {
    while((hostInFlight.get(host) || 0) >= HOST_CONCURRENCY){
        await new Promise((resolve)=>{
            const list = hostWaiters.get(host) || [];
            list.push(resolve);
            hostWaiters.set(host, list);
        });
    }
    hostInFlight.set(host, (hostInFlight.get(host) || 0) + 1);
}
function releaseHostSlot(host) {
    const cur = hostInFlight.get(host) || 1;
    hostInFlight.set(host, cur - 1);
    const list = hostWaiters.get(host) || [];
    const next = list.shift();
    if (next) {
        hostWaiters.set(host, list);
        next();
    }
}
// ───── core check ─────
function hostnameOf(url) {
    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch  {
        return null;
    }
}
async function fetchWithTimeout(url, init, ms = TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), ms);
    try {
        return await fetch(url, {
            ...init,
            signal: ctrl.signal,
            redirect: "follow"
        });
    } finally{
        clearTimeout(timer);
    }
}
async function readSomeText(res, maxBytes = PATTERN_SCAN_BYTES) {
    if (!res.body) return "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let out = "";
    try {
        while(received < maxBytes){
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                received += value.byteLength;
                out += decoder.decode(value, {
                    stream: true
                });
            }
        }
    } finally{
        try {
            reader.cancel();
        } catch  {}
    }
    return out;
}
async function checkLinkOnce(rawUrl) {
    const started = Date.now();
    const host = hostnameOf(rawUrl);
    if (!host) {
        return {
            status: "unknown",
            httpStatus: null,
            responseMs: 0,
            reason: "invalid_url",
            patternMatched: null
        };
    }
    await acquireHostSlot(host);
    try {
        // 1) HEAD first
        let resp = null;
        let used = "HEAD";
        try {
            resp = await fetchWithTimeout(rawUrl, {
                method: "HEAD",
                headers: BROWSER_HEADERS
            });
        } catch (e) {
            // network error → try GET range
            resp = null;
        }
        // Some hosts disable HEAD or return wrong codes — fallback to GET range
        if (!resp || resp.status === 405 || resp.status === 501 || resp.status >= 500 && resp.status < 600) {
            used = "GET";
            try {
                resp = await fetchWithTimeout(rawUrl, {
                    method: "GET",
                    headers: {
                        ...BROWSER_HEADERS,
                        Range: "bytes=0-32768"
                    }
                });
            } catch (e) {
                return {
                    status: "unknown",
                    httpStatus: null,
                    responseMs: Date.now() - started,
                    reason: e?.name === "AbortError" ? "timeout" : e?.message || "network_error",
                    patternMatched: null
                };
            }
        }
        const http = resp.status;
        // 2xx + 3xx considered alive at HTTP level
        if (http >= 400 && http !== 401 && http !== 403 && http !== 429) {
            // 4xx other than auth/forbidden/rate-limit are usually dead (404, 410, 451 …)
            return {
                status: "dead",
                httpStatus: http,
                responseMs: Date.now() - started,
                reason: `http_${http}`,
                patternMatched: null
            };
        }
        // 401/403/429 → inconclusive (likely captcha / geo-block / rate-limit). Treat as unknown.
        if (http === 401 || http === 403 || http === 429) {
            try {
                resp.body?.cancel?.();
            } catch  {}
            return {
                status: "unknown",
                httpStatus: http,
                responseMs: Date.now() - started,
                reason: `http_${http}`,
                patternMatched: null
            };
        }
        // 200/206 → scan body for dead-link patterns (if HTML)
        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const looksHtml = ct.includes("text/html") || ct === "" && used === "GET";
        let matched = null;
        if (looksHtml) {
            try {
                const text = await readSomeText(resp);
                for (const p of DEAD_PATTERNS){
                    if (p.re.test(text)) {
                        matched = p.name;
                        break;
                    }
                }
            } catch  {
            // ignore
            }
        } else {
            try {
                resp.body?.cancel?.();
            } catch  {}
        }
        if (matched) {
            return {
                status: "dead",
                httpStatus: http,
                responseMs: Date.now() - started,
                reason: `pattern:${matched}`,
                patternMatched: matched
            };
        }
        return {
            status: "alive",
            httpStatus: http,
            responseMs: Date.now() - started,
            reason: null,
            patternMatched: null
        };
    } finally{
        releaseHostSlot(host);
    }
}
const LINK_COLLECTIONS = {
    download: "download_links",
    digital: "digital_download_links",
    streaming: "streaming_links"
};
async function recordCheckResult(args) {
    const { linkId, linkType, url, result } = args;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const now = new Date().toISOString();
    const statusColl = db.collection("link_status");
    const host = hostnameOf(url);
    const prev = await statusColl.findOne({
        link_id: linkId
    });
    const prevFails = prev?.consecutive_failures || 0;
    let nextFails = prevFails;
    let effective = prev?.status || "unknown";
    let deadSince = prev?.dead_since || null;
    let lastAliveAt = prev?.last_alive_at || null;
    if (result.status === "alive") {
        nextFails = 0;
        effective = "alive";
        deadSince = null;
        lastAliveAt = now;
    } else if (result.status === "dead") {
        nextFails = prevFails + 1;
        if (nextFails >= DEAD_THRESHOLD) {
            effective = "dead";
            if (!deadSince) deadSince = now;
        } else {
            effective = "unknown"; // not yet enough confidence
        }
    } else {
        // "unknown" — inconclusive; don't bump the failure counter aggressively
        // but if we already had failures, keep them as-is (no decay either).
        effective = prev?.status === "dead" ? "dead" : "unknown";
    }
    await statusColl.updateOne({
        link_id: linkId
    }, {
        $set: {
            link_id: linkId,
            link_type: linkType,
            collection: LINK_COLLECTIONS[linkType],
            source_url: url,
            host,
            status: effective,
            consecutive_failures: nextFails,
            last_checked_at: now,
            last_http_status: result.httpStatus,
            last_error: result.reason,
            response_ms: result.responseMs,
            dead_since: deadSince,
            last_alive_at: lastAliveAt
        }
    }, {
        upsert: true
    });
    // Mirror to the parent link record (so existing UI/queries see is_valid quickly).
    const parentColl = db.collection(LINK_COLLECTIONS[linkType]);
    await parentColl.updateOne({
        $or: [
            {
                legacy_uuid: linkId
            },
            {
                id: linkId
            }
        ]
    }, {
        $set: {
            is_valid: effective === "alive",
            link_status: effective,
            last_checked: now
        }
    });
    return effective;
}
async function checkAndRecord(args) {
    const result = await checkLinkOnce(args.url);
    const effective = await recordCheckResult({
        ...args,
        result
    });
    return {
        effective,
        result
    };
}
}),
"[project]/lib/link-checker-runner.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Background link-health runner — no external cron needed.
 *
 * Design:
 *  • A single process-wide promise (`runningPromise`) acts as a mutex so we
 *    never have two scans in parallel.
 *  • A MongoDB lock doc (`runtime_locks.link_check`) acts as a multi-instance
 *    mutex so two server replicas don't both scan at once.
 *  • Trigger by simply calling `triggerLinkCheckBackground()` — it returns
 *    immediately. The actual work runs in a `Promise` we don't await.
 *  • Picks the LRU 60 links (least recently checked) split across the
 *    download / digital / streaming collections. Skips any link checked in
 *    the last 12 h (configurable) to stay polite with hosters.
 *
 * Call sites:
 *  • At the top of admin endpoints that already serve admin traffic, so a
 *    real user visit "pays" for the scan rather than dedicating a cron.
 *  • Manually via `/api/admin/check-link/run` (admin auth required).
 */ __turbopack_context__.s([
    "readLastScan",
    ()=>readLastScan,
    "runLinkCheckNow",
    ()=>runLinkCheckNow,
    "triggerLinkCheckBackground",
    ()=>triggerLinkCheckBackground
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/link-checker.ts [app-route] (ecmascript)");
;
;
const COOLDOWN_SEC = 12 * 60 * 60 // re-check every 12h max
;
const LOCK_TTL_SEC = 5 * 60 // lock expires after 5 min so a crash doesn't deadlock
;
const MIN_INTERVAL_SEC = 5 * 60 // don't start a scan more than once per 5 min globally
;
const BATCH_PER_COLL = 20;
let runningPromise = null;
let lastStartedAt = 0;
async function tryAcquireDbLock() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection("runtime_locks");
    try {
        await coll.createIndex({
            key: 1
        }, {
            unique: true
        });
        await coll.createIndex({
            expires_at: 1
        }, {
            expireAfterSeconds: 0
        });
    } catch  {}
    const now = new Date();
    const expires = new Date(now.getTime() + LOCK_TTL_SEC * 1000);
    // First clear any expired previous lock.
    await coll.deleteOne({
        key: "link_check",
        expires_at: {
            $lt: now
        }
    });
    try {
        await coll.insertOne({
            key: "link_check",
            acquired_at: now,
            expires_at: expires
        });
        return true;
    } catch  {
        return false;
    }
}
async function releaseDbLock() {
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        await db.collection("runtime_locks").deleteOne({
            key: "link_check"
        });
    } catch  {}
}
async function pickBatch(linkType, limit) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LINK_COLLECTIONS"][linkType]);
    const cutoff = new Date(Date.now() - COOLDOWN_SEC * 1000).toISOString();
    // We sort by last_checked ascending (nulls first), then take `limit`.
    const rows = await coll.find({
        $and: [
            {
                $or: [
                    {
                        source_url: {
                            $exists: true,
                            $ne: ""
                        }
                    },
                    {
                        url: {
                            $exists: true,
                            $ne: ""
                        }
                    }
                ]
            },
            {
                $or: [
                    {
                        last_checked: {
                            $exists: false
                        }
                    },
                    {
                        last_checked: {
                            $lt: cutoff
                        }
                    }
                ]
            }
        ]
    }, {
        projection: {
            legacy_uuid: 1,
            source_url: 1,
            url: 1,
            last_checked: 1
        }
    }).sort({
        last_checked: 1
    }).limit(limit).toArray();
    return rows.map((r)=>({
            linkId: r.legacy_uuid || (r._id?.toString ? r._id.toString() : String(r._id)),
            url: r.source_url || r.url
        }));
}
async function scanOnce() {
    const startedAt = new Date().toISOString();
    const report = {
        started_at: startedAt,
        ended_at: "",
        scanned: 0,
        alive: 0,
        dead: 0,
        unknown: 0,
        per_collection: {
            download: 0,
            digital: 0,
            streaming: 0
        }
    };
    for (const type of [
        "download",
        "digital",
        "streaming"
    ]){
        const batch = await pickBatch(type, BATCH_PER_COLL);
        report.per_collection[type] = batch.length;
        // Run checks in parallel; link-checker.ts enforces per-host throttling.
        await Promise.all(batch.map(async (item)=>{
            if (!item.url) return;
            try {
                const { effective } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkAndRecord"])({
                    linkId: item.linkId,
                    linkType: type,
                    url: item.url
                });
                report.scanned += 1;
                if (effective === "alive") report.alive += 1;
                else if (effective === "dead") report.dead += 1;
                else report.unknown += 1;
            } catch (err) {
                console.error("[link-runner] check failed:", item.url, err);
                report.scanned += 1;
                report.unknown += 1;
            }
        }));
    }
    report.ended_at = new Date().toISOString();
    // Persist the last report so admin can show it.
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        await db.collection("runtime_status").updateOne({
            key: "link_check_last_run"
        }, {
            $set: {
                key: "link_check_last_run",
                report,
                updated_at: report.ended_at
            }
        }, {
            upsert: true
        });
    } catch  {}
    return report;
}
function triggerLinkCheckBackground(opts = {}) {
    const now = Date.now();
    if (!opts.force && now - lastStartedAt < MIN_INTERVAL_SEC * 1000) return;
    if (runningPromise) return;
    lastStartedAt = now;
    runningPromise = (async ()=>{
        const got = await tryAcquireDbLock();
        if (!got) return;
        try {
            await scanOnce();
        } catch (err) {
            console.error("[link-runner] scan failed:", err);
        } finally{
            await releaseDbLock();
            runningPromise = null;
        }
    })();
}
async function runLinkCheckNow() {
    if (runningPromise) {
        await runningPromise;
        return {
            skipped: true
        };
    }
    const got = await tryAcquireDbLock();
    if (!got) return {
        skipped: true
    };
    lastStartedAt = Date.now();
    try {
        return await scanOnce();
    } finally{
        await releaseDbLock();
    }
}
async function readLastScan() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const doc = await db.collection("runtime_status").findOne({
        key: "link_check_last_run"
    });
    if (!doc) return null;
    return {
        ...doc.report,
        updated_at: doc.updated_at
    };
}
}),
"[project]/lib/tmdb-cache.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * MongoDB-backed TMDB cache.
 *
 * Replaces the per-process in-memory `Map` cache that used to live in
 * `app/api/admin/stats/route.ts`. On serverless / multi-instance hosting
 * the in-memory cache hit-rate is near zero (every cold start refetches
 * everything from TMDB). The Mongo cache is shared across instances,
 * survives restarts, and gets auto-purged after 7 days by the TTL index
 * declared in `lib/mongo/db.ts`.
 *
 * Usage:
 *   const hit = await getTmdbCached("movie", 12345)
 *   if (!hit) { ... call TMDB ... await putTmdbCached("movie", 12345, payload) }
 */ __turbopack_context__.s([
    "fetchTmdbCached",
    ()=>fetchTmdbCached
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const TMDB_IMG = "https://image.tmdb.org/t/p/w92";
async function fetchTmdbCached(type, id) {
    if (!id || type !== "movie" && type !== "tv") {
        return {
            title: `#${id}`,
            poster: null
        };
    }
    const key = `${type}/${id}`;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection("tmdb_cache");
    const hit = await coll.findOne({
        key
    });
    if (hit && hit.title) {
        return {
            title: hit.title,
            poster: hit.poster ?? null
        };
    }
    try {
        const r = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=fr-FR`, {
            next: {
                revalidate: 21600
            }
        });
        if (!r.ok) throw new Error(`tmdb ${r.status}`);
        const j = await r.json();
        const entry = {
            title: j.title || j.name || `#${id}`,
            poster: j.poster_path ? `${TMDB_IMG}${j.poster_path}` : null
        };
        // Upsert with a fresh _ttl (Date) so the TTL index keeps the row alive.
        await coll.updateOne({
            key
        }, {
            $set: {
                ...entry,
                key,
                _ttl: new Date()
            }
        }, {
            upsert: true
        });
        return entry;
    } catch  {
        // Cache the negative result for a short time so we don't hammer TMDB.
        const fallback = {
            title: `#${id}`,
            poster: null
        };
        await coll.updateOne({
            key
        }, {
            $set: {
                ...fallback,
                key,
                _ttl: new Date(Date.now() - 6 * 86400 * 1000)
            }
        }, {
            upsert: true
        }).catch(()=>{});
        return fallback;
    }
}
}),
"[project]/app/api/admin/stats/advanced/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/admin/stats/advanced
 *
 * Advanced analytics for the admin dashboard:
 *   • Comparatif: current period vs previous period (delta %) for views,
 *     clicks, ad clicks, unique visitors.
 *   • Heatmap 24×7: total views by (day of week, hour of day) — UTC.
 *   • Geoloc: top countries derived from ip_prefix via ip-api (cached).
 *   • Funnel: impressions → load → source click → external click.
 *   • Bandwidth proxy: top consuming contents (views × file_size when known).
 *
 * Heavy endpoint — admin-only. Cached for 60s in the Response cache header
 * so the admin UI can poll freely.
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/geo.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/link-checker-runner.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tmdb-cache.ts [app-route] (ecmascript)");
;
;
;
;
;
;
function dayBucket(field) {
    return {
        $cond: [
            {
                $eq: [
                    {
                        $type: field
                    },
                    "string"
                ]
            },
            {
                $substrCP: [
                    field,
                    0,
                    10
                ]
            },
            {
                $cond: [
                    {
                        $eq: [
                            {
                                $type: field
                            },
                            "date"
                        ]
                    },
                    {
                        $dateToString: {
                            date: field,
                            format: "%Y-%m-%d"
                        }
                    },
                    null
                ]
            }
        ]
    };
}
// Build a heatmap expression: for ISO strings we can pull HH from substring;
// for Date we use $dayOfWeek/$hour.
function hourField(field) {
    return {
        $cond: [
            {
                $eq: [
                    {
                        $type: field
                    },
                    "string"
                ]
            },
            {
                $toInt: {
                    $substrCP: [
                        field,
                        11,
                        2
                    ]
                }
            },
            {
                $cond: [
                    {
                        $eq: [
                            {
                                $type: field
                            },
                            "date"
                        ]
                    },
                    {
                        $hour: field
                    },
                    0
                ]
            }
        ]
    };
}
function dowField(field) {
    // Returns 1..7, 1 = Sunday in Mongo. We'll re-map client-side.
    return {
        $cond: [
            {
                $eq: [
                    {
                        $type: field
                    },
                    "string"
                ]
            },
            // $dayOfWeek requires a Date — convert the ISO string first.
            {
                $dayOfWeek: {
                    $toDate: field
                }
            },
            {
                $cond: [
                    {
                        $eq: [
                            {
                                $type: field
                            },
                            "date"
                        ]
                    },
                    {
                        $dayOfWeek: field
                    },
                    1
                ]
            }
        ]
    };
}
async function GET(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])(req);
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    // Take the opportunity to kick a background link-health scan. This keeps
    // the link_status collection fresh without needing any external cron.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["triggerLinkCheckBackground"])();
    const period = parseInt(req.nextUrl.searchParams.get("period") || "7", 10) || 7;
    const now = Date.now();
    const start = new Date(now - period * 86_400_000).toISOString();
    const prevStart = new Date(now - 2 * period * 86_400_000).toISOString();
    const prevEnd = start;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const aggOpts = {
        allowDiskUse: true,
        maxTimeMS: 20_000
    };
    // ───── Comparatif period vs prev period
    const [viewsCur, viewsPrev, clicksCur, clicksPrev, adClicksCur, adClicksPrev, uniqueCur, uniquePrev] = await Promise.all([
        db.collection("embed_views").countDocuments({
            viewed_at: {
                $gte: start
            }
        }),
        db.collection("embed_views").countDocuments({
            viewed_at: {
                $gte: prevStart,
                $lt: prevEnd
            }
        }),
        db.collection("link_clicks").countDocuments({
            clicked_at: {
                $gte: start
            }
        }),
        db.collection("link_clicks").countDocuments({
            clicked_at: {
                $gte: prevStart,
                $lt: prevEnd
            }
        }),
        db.collection("ad_clicks").countDocuments({
            clicked_at: {
                $gte: start
            }
        }),
        db.collection("ad_clicks").countDocuments({
            clicked_at: {
                $gte: prevStart,
                $lt: prevEnd
            }
        }),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: start
                    }
                }
            },
            {
                $group: {
                    _id: {
                        i: "$ip_hash",
                        u: "$user_agent"
                    }
                }
            },
            {
                $count: "n"
            }
        ], aggOpts).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: prevStart,
                        $lt: prevEnd
                    }
                }
            },
            {
                $group: {
                    _id: {
                        i: "$ip_hash",
                        u: "$user_agent"
                    }
                }
            },
            {
                $count: "n"
            }
        ], aggOpts).toArray()
    ]);
    const pctDelta = (cur, prev)=>prev > 0 ? Math.round((cur - prev) / prev * 100) : cur > 0 ? 100 : 0;
    const uniqueCurN = uniqueCur[0]?.n || 0;
    const uniquePrevN = uniquePrev[0]?.n || 0;
    // ───── Heatmap 7d (force a smaller period for cost)
    const heatmapStart = new Date(now - 7 * 86_400_000).toISOString();
    const heatmapAgg = await db.collection("embed_views").aggregate([
        {
            $match: {
                viewed_at: {
                    $gte: heatmapStart
                }
            }
        },
        {
            $group: {
                _id: {
                    dow: dowField("$viewed_at"),
                    hour: hourField("$viewed_at")
                },
                n: {
                    $sum: 1
                }
            }
        }
    ], aggOpts).toArray();
    // Build dense 7×24 grid; index [dow0=Sun..dow6=Sat][hour0..23]
    const heatmap = Array.from({
        length: 7
    }, ()=>Array.from({
            length: 24
        }, ()=>0));
    for (const row of heatmapAgg){
        const dow = (row._id?.dow || 1) - 1 // 1-based → 0-based
        ;
        const hr = row._id?.hour ?? 0;
        if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) heatmap[dow][hr] = row.n;
    }
    // ───── Top countries via ip_prefix (limited to 200 most active prefixes)
    const topPrefixes = await db.collection("embed_views").aggregate([
        {
            $match: {
                viewed_at: {
                    $gte: start
                },
                ip_prefix: {
                    $exists: true,
                    $ne: null
                }
            }
        },
        {
            $group: {
                _id: "$ip_prefix",
                n: {
                    $sum: 1
                }
            }
        },
        {
            $sort: {
                n: -1
            }
        },
        {
            $limit: 200
        }
    ], aggOpts).toArray();
    const countryCounts = new Map();
    await Promise.all(topPrefixes.map(async (row)=>{
        // Reconstruct a routable IP for geo (use .1 for IPv4 /24)
        const probe = row._id?.includes(":") ? row._id.replace(/::$/, "::1") : row._id?.replace(/\.0$/, ".1");
        if (!probe) return;
        const c = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["countryForIp"])(probe);
        if (c) countryCounts.set(c, (countryCounts.get(c) || 0) + row.n);
    }));
    const top_countries = Array.from(countryCounts.entries()).map(([country, count])=>({
            country,
            count
        })).sort((a, b)=>b.count - a.count).slice(0, 15);
    // ───── Funnel: embed view (impression) → click on source link
    const distinctSessionsCur = uniqueCurN;
    const funnel = {
        impressions: viewsCur,
        unique_sessions: distinctSessionsCur,
        source_clicks: clicksCur,
        ad_clicks: adClicksCur,
        view_to_click_pct: viewsCur > 0 ? Math.round(clicksCur / viewsCur * 10000) / 100 : 0,
        view_to_ad_pct: viewsCur > 0 ? Math.round(adClicksCur / viewsCur * 10000) / 100 : 0
    };
    // ───── Bandwidth proxy: top consuming contents over period
    // Sum views per ww_id, then enrich with average file_size from download_links.
    const topByViews = await db.collection("embed_views").aggregate([
        {
            $match: {
                viewed_at: {
                    $gte: start
                }
            }
        },
        {
            $group: {
                _id: "$ww_id",
                views: {
                    $sum: 1
                },
                media_type: {
                    $first: "$media_type"
                },
                tmdb_id: {
                    $first: "$tmdb_id"
                }
            }
        },
        {
            $sort: {
                views: -1
            }
        },
        {
            $limit: 25
        }
    ], aggOpts).toArray();
    const sizeByWw = new Map();
    if (topByViews.length) {
        const sizeAgg = await db.collection("download_links").aggregate([
            {
                $match: {
                    ww_id: {
                        $in: topByViews.map((c)=>c._id)
                    }
                }
            },
            {
                $group: {
                    _id: "$ww_id",
                    avg_bytes: {
                        $avg: {
                            $convert: {
                                input: "$file_size_bytes",
                                to: "long",
                                onError: null,
                                onNull: null
                            }
                        }
                    }
                }
            }
        ]).toArray();
        for (const row of sizeAgg){
            if (row._id && row.avg_bytes) sizeByWw.set(row._id, row.avg_bytes);
        }
    }
    const top_bandwidth = await Promise.all(topByViews.slice(0, 15).map(async (c)=>{
        let title = `${c._id}`;
        let poster = null;
        if (c.media_type && c.tmdb_id && (c.media_type === "movie" || c.media_type === "tv")) {
            const tm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchTmdbCached"])(c.media_type, c.tmdb_id);
            title = tm.title;
            poster = tm.poster;
        }
        const bytes = sizeByWw.get(c._id) || null;
        return {
            ww_id: c._id,
            title,
            poster,
            media_type: c.media_type,
            views: c.views,
            avg_bytes: bytes,
            estimated_bandwidth_bytes: bytes ? Math.round(bytes * c.views) : null
        };
    }));
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        period_days: period,
        comparative: {
            views: {
                current: viewsCur,
                previous: viewsPrev,
                delta_pct: pctDelta(viewsCur, viewsPrev)
            },
            clicks: {
                current: clicksCur,
                previous: clicksPrev,
                delta_pct: pctDelta(clicksCur, clicksPrev)
            },
            ad_clicks: {
                current: adClicksCur,
                previous: adClicksPrev,
                delta_pct: pctDelta(adClicksCur, adClicksPrev)
            },
            unique: {
                current: uniqueCurN,
                previous: uniquePrevN,
                delta_pct: pctDelta(uniqueCurN, uniquePrevN)
            }
        },
        heatmap_7d: heatmap,
        top_countries,
        funnel,
        top_bandwidth,
        generated_at: new Date().toISOString()
    }, {
        headers: {
            "Cache-Control": "private, max-age=60"
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__09664fe8._.js.map