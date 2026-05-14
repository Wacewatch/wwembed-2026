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
"[project]/app/api/admin/check-link/run/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Admin endpoints for the link-health subsystem.
 *
 * GET  → returns aggregate health (alive/dead/unknown counts per collection)
 *        + last scan report + most recent dead links.
 * POST → kicks a scan in background and returns immediately.
 *        Pass `?wait=1` to block until the scan finishes (useful for
 *        manual "Run now" button feedback).
 */ __turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/link-checker-runner.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/link-checker.ts [app-route] (ecmascript)");
;
;
;
;
;
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
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const params = req.nextUrl.searchParams;
    const onlyDead = params.get("only_dead") === "1";
    const limit = Math.min(200, parseInt(params.get("limit") || "50", 10) || 50);
    const [statusBreakdown, lastScan, deadList] = await Promise.all([
        db.collection("link_status").aggregate([
            {
                $group: {
                    _id: {
                        coll: "$link_type",
                        status: "$status"
                    },
                    n: {
                        $sum: 1
                    }
                }
            }
        ]).toArray(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["readLastScan"])(),
        db.collection("link_status").find(onlyDead ? {
            status: "dead"
        } : {
            status: {
                $in: [
                    "dead",
                    "unknown"
                ]
            }
        }).sort({
            dead_since: -1,
            last_checked_at: -1
        }).limit(limit).toArray()
    ]);
    // Pivot breakdown → { download: {alive,dead,unknown}, ... }
    const breakdown = {
        download: {
            alive: 0,
            dead: 0,
            unknown: 0
        },
        digital: {
            alive: 0,
            dead: 0,
            unknown: 0
        },
        streaming: {
            alive: 0,
            dead: 0,
            unknown: 0
        }
    };
    for (const row of statusBreakdown){
        const c = row._id?.coll;
        const s = row._id?.status;
        if (c && s && breakdown[c]) breakdown[c][s] = (breakdown[c][s] || 0) + row.n;
    }
    // Cleanup _id from dead list rows.
    const sanitized = deadList.map((d)=>({
            ...d,
            _id: undefined
        }));
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        breakdown,
        last_scan: lastScan,
        dead_links: sanitized
    });
}
async function POST(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])(req);
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    const wait = req.nextUrl.searchParams.get("wait") === "1";
    const linkId = req.nextUrl.searchParams.get("link_id");
    const linkType = req.nextUrl.searchParams.get("link_type");
    // Single-link recheck mode.
    if (linkId && linkType && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LINK_COLLECTIONS"][linkType]) {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const coll = db.collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LINK_COLLECTIONS"][linkType]);
        const row = await coll.findOne({
            $or: [
                {
                    legacy_uuid: linkId
                },
                {
                    id: linkId
                }
            ]
        }, {
            projection: {
                source_url: 1,
                url: 1
            }
        });
        const url = row?.source_url || row?.url;
        if (!url) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "link not found"
        }, {
            status: 404
        });
        const { effective, result } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkAndRecord"])({
            linkId,
            linkType,
            url
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            effective,
            result
        });
    }
    if (wait) {
        const report = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runLinkCheckNow"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            report
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$link$2d$checker$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["triggerLinkCheckBackground"])({
        force: true
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: true,
        background: true
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4f187afe._.js.map