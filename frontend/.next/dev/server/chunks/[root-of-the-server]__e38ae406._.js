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
"[project]/lib/url-utils.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * URL helpers shared by checker, probe and stats normalisation.
 */ __turbopack_context__.s([
    "hostnameOf",
    ()=>hostnameOf
]);
function hostnameOf(url) {
    if (!url) return null;
    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch  {
        // Fallback: strip scheme + path
        const s = String(url).trim().replace(/^[a-z][a-z0-9+.\-]*:\/\//i, "").split(/[\/?#]/)[0].toLowerCase();
        return s || null;
    }
}
}),
"[project]/lib/url-probe.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Auto-fill helper: probe a hosting URL and infer
 *   { provider, quality, language, fileSize, hostName }.
 *
 * Uses:
 *  • Regex on the hostname to map → known provider.
 *  • Regex on the path / filename for resolution / language tags.
 *  • HEAD then GET-Range as a fallback to pull Content-Length & filename
 *    from Content-Disposition (when the hoster exposes them publicly).
 *
 * Designed to be called from the uploader form: paste URL → press Tester →
 * fields auto-populate; user can still override.
 */ __turbopack_context__.s([
    "probeUrl",
    ()=>probeUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$url$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/url-utils.ts [app-route] (ecmascript)");
;
// Hostname → canonical provider label
const PROVIDER_MAP = [
    {
        match: /(^|\.)1fichier\.com$/,
        provider: "1fichier"
    },
    {
        match: /(^|\.)uptobox\.com$/,
        provider: "Uptobox"
    },
    {
        match: /(^|\.)rapidgator\.net$/,
        provider: "Rapidgator"
    },
    {
        match: /(^|\.)nitroflare\.com$/,
        provider: "Nitroflare"
    },
    {
        match: /(^|\.)turbobit\.net$/,
        provider: "Turbobit"
    },
    {
        match: /(^|\.)mega\.nz$/,
        provider: "Mega"
    },
    {
        match: /(^|\.)mediafire\.com$/,
        provider: "MediaFire"
    },
    {
        match: /(^|\.)pixeldrain\.com$/,
        provider: "Pixeldrain"
    },
    {
        match: /(^|\.)gofile\.io$/,
        provider: "GoFile"
    },
    {
        match: /(^|\.)krakenfiles\.com$/,
        provider: "KrakenFiles"
    },
    {
        match: /(^|\.)clicknupload\.click$/,
        provider: "ClicknUpload"
    },
    {
        match: /(^|\.)ddownload\.com$/,
        provider: "DDownload"
    },
    {
        match: /(^|\.)katfile\.com$/,
        provider: "Katfile"
    },
    {
        match: /(^|\.)hexupload\.net$/,
        provider: "Hexupload"
    },
    {
        match: /(^|\.)sendcm\.com$/,
        provider: "SendCM"
    },
    {
        match: /(^|\.)zippyshare\.com$/,
        provider: "Zippyshare"
    },
    {
        match: /(^|\.)dl\.free\.fr$/,
        provider: "FreeDL"
    },
    {
        match: /(^|\.)uploaded\.net$/,
        provider: "Uploaded"
    },
    {
        match: /(^|\.)dood\..+$/,
        provider: "DoodStream"
    },
    {
        match: /(^|\.)mixdrop\..+$/,
        provider: "Mixdrop"
    },
    {
        match: /(^|\.)streamtape\..+$/,
        provider: "Streamtape"
    },
    {
        match: /(^|\.)vidoza\.net$/,
        provider: "Vidoza"
    },
    {
        match: /(^|\.)voe\.sx$/,
        provider: "VOE"
    },
    {
        match: /(^|\.)upstream\.to$/,
        provider: "Upstream"
    },
    {
        match: /(^|\.)filemoon\..+$/,
        provider: "FileMoon"
    }
];
const QUALITY_PATTERNS = [
    {
        match: /\b(4k|2160p|uhd)\b/i,
        quality: "4K"
    },
    {
        match: /\b(2160[ip])\b/i,
        quality: "4K"
    },
    {
        match: /\b1440p\b/i,
        quality: "1440p"
    },
    {
        match: /\b1080p\b/i,
        quality: "1080p"
    },
    {
        match: /\b720p\b/i,
        quality: "720p"
    },
    {
        match: /\b480p\b/i,
        quality: "480p"
    },
    {
        match: /\b360p\b/i,
        quality: "360p"
    },
    {
        match: /\b240p\b/i,
        quality: "240p"
    },
    {
        match: /\b(bluray|brrip|bdrip|bdremux)\b/i,
        quality: "BluRay"
    },
    {
        match: /\b(web[-.]?dl|webrip)\b/i,
        quality: "WEB-DL"
    },
    {
        match: /\b(hdtv|dvbrip)\b/i,
        quality: "HDTV"
    },
    {
        match: /\bhdcam\b/i,
        quality: "HDCAM"
    },
    {
        match: /\b(dvdrip|dvdscr|r5)\b/i,
        quality: "DVDRip"
    }
];
const LANGUAGE_PATTERNS = [
    {
        match: /\bmulti(?:i|lang|s)?\b/i,
        language: "MULTI"
    },
    {
        match: /\bvostfr\b/i,
        language: "VOSTFR"
    },
    {
        match: /\bvff\b|\btrueFrench\b|\btruefr\b/i,
        language: "TRUEFRENCH"
    },
    {
        match: /\bvfq\b/i,
        language: "VFQ"
    },
    {
        match: /\bvf2?\b|\bfrench\b/i,
        language: "FRENCH"
    },
    {
        match: /\bsubfr\b/i,
        language: "SUBFR"
    },
    {
        match: /\bvostang?\b|\bsubeng\b/i,
        language: "VOSTANG"
    },
    {
        match: /\bengl?ish\b|\benglish\b|\beng\b/i,
        language: "ENGLISH"
    }
];
const VIDEO_EXTS = [
    ".mkv",
    ".mp4",
    ".avi",
    ".m4v",
    ".mov",
    ".wmv",
    ".webm",
    ".ts"
];
const EBOOK_EXTS = [
    ".epub",
    ".pdf",
    ".mobi",
    ".azw3",
    ".cbz",
    ".cbr"
];
const ARCHIVE_EXTS = [
    ".zip",
    ".rar",
    ".7z",
    ".tar.gz",
    ".tar.bz2"
];
function pickFirstMatch(haystack, list) {
    for (const item of list){
        if (item.match.test(haystack)) return item;
    }
    return null;
}
function humanSize(bytes) {
    if (!bytes || !Number.isFinite(bytes) || bytes < 0) return null;
    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];
    let v = bytes;
    let i = 0;
    while(v >= 1024 && i < units.length - 1){
        v /= 1024;
        i++;
    }
    return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)} ${units[i]}`;
}
function filenameFromContentDisposition(cd) {
    if (!cd) return null;
    // RFC 6266: filename*=UTF-8''foo  or  filename="foo"
    const star = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(cd);
    if (star) {
        try {
            return decodeURIComponent(star[1].trim().replace(/"/g, ""));
        } catch  {
            return star[1];
        }
    }
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
    return plain ? plain[1] : null;
}
function filenameFromUrl(url) {
    try {
        const u = new URL(url);
        const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
        return last || null;
    } catch  {
        return null;
    }
}
function guessMediaType(filename, ct) {
    const name = (filename || "").toLowerCase();
    if (VIDEO_EXTS.some((e)=>name.endsWith(e))) return "video";
    if (EBOOK_EXTS.some((e)=>name.endsWith(e))) return "ebook";
    if (ARCHIVE_EXTS.some((e)=>name.endsWith(e))) return "archive";
    if (ct) {
        if (ct.startsWith("video/")) return "video";
        if (ct === "application/pdf" || ct === "application/epub+zip") return "ebook";
        if (ct.includes("zip") || ct.includes("rar") || ct.includes("7z")) return "archive";
    }
    return name ? "other" : null;
}
async function probeUrl(rawUrl) {
    const host = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$url$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hostnameOf"])(rawUrl);
    const provider = host ? PROVIDER_MAP.find((p)=>p.match.test(host))?.provider || null : null;
    const result = {
        ok: false,
        url: rawUrl,
        host,
        provider,
        filename: null,
        fileSize: null,
        fileSizeHuman: null,
        contentType: null,
        quality: null,
        language: null,
        guessedMediaType: null,
        reachable: false,
        httpStatus: null,
        reason: null
    };
    if (!host) {
        result.reason = "invalid_url";
        return result;
    }
    // Pull tags from URL filename first (works even if hoster blocks HEAD)
    const urlFilename = filenameFromUrl(rawUrl);
    const tagSource = `${urlFilename || ""} ${rawUrl}`;
    result.filename = urlFilename;
    result.quality = pickFirstMatch(tagSource, QUALITY_PATTERNS)?.quality || null;
    result.language = pickFirstMatch(tagSource, LANGUAGE_PATTERNS)?.language || null;
    const BROWSER = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "*/*"
    };
    const fetchWithTimeout = async (init, ms = 10_000)=>{
        const ctrl = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), ms);
        try {
            return await fetch(rawUrl, {
                ...init,
                signal: ctrl.signal,
                redirect: "follow"
            });
        } finally{
            clearTimeout(timer);
        }
    };
    let resp = null;
    try {
        resp = await fetchWithTimeout({
            method: "HEAD",
            headers: BROWSER
        });
    } catch  {
        resp = null;
    }
    if (!resp || resp.status === 405 || resp.status === 501 || resp.status >= 500) {
        try {
            resp = await fetchWithTimeout({
                method: "GET",
                headers: {
                    ...BROWSER,
                    Range: "bytes=0-0"
                }
            });
            try {
                resp.body?.cancel?.();
            } catch  {}
        } catch (e) {
            result.reason = e?.name === "AbortError" ? "timeout" : e?.message || "network_error";
            return result;
        }
    }
    result.reachable = resp.ok || resp.status === 206 || resp.status === 401 || resp.status === 403;
    result.httpStatus = resp.status;
    result.contentType = resp.headers.get("content-type");
    // Content-Length: HEAD or 206 Content-Range total
    const lenHeader = resp.headers.get("content-length");
    let size = lenHeader ? parseInt(lenHeader, 10) : null;
    const cr = resp.headers.get("content-range") // e.g. bytes 0-0/12345
    ;
    if (cr) {
        const m = /\/(\d+)$/.exec(cr);
        if (m) size = parseInt(m[1], 10);
    }
    if (size && size > 0) {
        result.fileSize = size;
        result.fileSizeHuman = humanSize(size);
    }
    const cdFilename = filenameFromContentDisposition(resp.headers.get("content-disposition"));
    if (cdFilename) {
        result.filename = cdFilename;
        // re-run tag extraction with the better filename
        const ts = `${cdFilename} ${rawUrl}`;
        result.quality = result.quality || pickFirstMatch(ts, QUALITY_PATTERNS)?.quality || null;
        result.language = result.language || pickFirstMatch(ts, LANGUAGE_PATTERNS)?.language || null;
    }
    result.guessedMediaType = guessMediaType(result.filename, result.contentType);
    result.ok = true;
    return result;
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
"[project]/lib/mongo/rate-limit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sliding-window rate limiter backed by MongoDB.
 *
 * Uses the existing `login_attempts` collection (already indexed on identifier)
 * so we don't need a Redis dependency. Each call records the attempt and checks
 * how many attempts were made by the same identifier inside the window.
 *
 * Identifier should be stable per (route, ip) or (route, ip, email) tuple —
 * the caller decides. Returns { allowed, retryAfterSec, count }.
 */ __turbopack_context__.s([
    "getClientIp",
    ()=>getClientIp,
    "rateLimit",
    ()=>rateLimit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
let indexEnsured = false;
async function ensureIndex(coll) {
    if (indexEnsured) return;
    indexEnsured = true;
    try {
        // 24h TTL on attempts so the collection doesn't grow forever.
        await coll.createIndex({
            created_at: 1
        }, {
            expireAfterSeconds: 86400
        });
        await coll.createIndex({
            identifier: 1,
            created_at: -1
        });
    } catch  {
    // index may already exist with different opts — fine.
    }
}
async function rateLimit(opts) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection("login_attempts");
    await ensureIndex(coll);
    const now = new Date();
    const windowStart = new Date(now.getTime() - opts.windowSec * 1000);
    const count = await coll.countDocuments({
        identifier: opts.identifier,
        created_at: {
            $gte: windowStart
        }
    });
    if (count >= opts.max) {
        // Find oldest attempt in window → compute retry-after
        const oldest = await coll.find({
            identifier: opts.identifier,
            created_at: {
                $gte: windowStart
            }
        }).sort({
            created_at: 1
        }).limit(1).toArray();
        const oldestTs = oldest[0]?.created_at?.getTime?.() || now.getTime();
        const retryAfterSec = Math.max(1, Math.ceil((oldestTs + opts.windowSec * 1000 - now.getTime()) / 1000));
        return {
            allowed: false,
            retryAfterSec,
            count
        };
    }
    if (opts.record !== false) {
        await coll.insertOne({
            identifier: opts.identifier,
            created_at: now
        });
    }
    return {
        allowed: true,
        retryAfterSec: 0,
        count: count + 1
    };
}
function getClientIp(req) {
    const fwd = req.headers.get("x-forwarded-for");
    const real = req.headers.get("x-real-ip");
    const cf = req.headers.get("cf-connecting-ip");
    const ip = (fwd?.split(",")[0] || real || cf || "unknown").trim();
    return ip || "unknown";
}
}),
"[project]/app/api/upload/probe/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * POST /api/upload/probe
 * Body: { url: string }
 * Auth: any logged-in user (so uploaders can use it from the dashboard).
 *
 * Returns the inferred provider/quality/language/file_size + reachability.
 * The user can still override every field before submitting.
 */ __turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$url$2d$probe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/url-probe.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/rate-limit.ts [app-route] (ecmascript)");
;
;
;
;
async function POST(req) {
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentUser"])(req).catch(()=>null);
    if (!user) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "Auth required"
    }, {
        status: 401
    });
    // 20 probes / min / user so an uploader can't grief the rate-limited
    // public hosters (some banlist on too many HEAD requests).
    const rl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])({
        identifier: `probe:${user.id || user.email || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getClientIp"])(req)}`,
        windowSec: 60,
        max: 20
    });
    if (!rl.allowed) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `Trop de requêtes. Réessaye dans ${rl.retryAfterSec}s.`
        }, {
            status: 429,
            headers: {
                "Retry-After": String(rl.retryAfterSec)
            }
        });
    }
    const { url } = await req.json().catch(()=>({}));
    if (!url || typeof url !== "string") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "url required"
        }, {
            status: 400
        });
    }
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$url$2d$probe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["probeUrl"])(url);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e38ae406._.js.map