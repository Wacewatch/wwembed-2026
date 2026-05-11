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
    await db.collection("download_links").createIndex({
        tmdb_id: 1,
        media_type: 1
    });
    await db.collection("download_links").createIndex({
        ww_id: 1
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
    // live tv
    await db.collection("live_tv_channels").createIndex({
        status: 1,
        is_active: 1
    });
    await db.collection("live_tv_sources").createIndex({
        channel_id: 1
    });
    // stats
    await db.collection("embed_views").createIndex({
        ww_id: 1
    });
    await db.collection("embed_views").createIndex({
        viewed_at: -1
    });
    await db.collection("link_clicks").createIndex({
        clicked_at: -1
    });
    await db.collection("api_usage").createIndex({
        created_at: -1
    });
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
}
async function getCollection(name) {
    const db = await getDb();
    return db.collection(name);
}
}),
"[project]/lib/wavewatch-api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Shared helpers for the public WaveWatch consumer API (/api/v1/download_links/*).
 *
 * - `requireApiKey()` enforces the X-API-Key header against WAVEWATCH_API_KEY (.env).
 * - `BASE_FILTER` is the implicit filter applied on every list/query endpoint
 *    (except /stats): only active, approved and not-explicitly-invalid links.
 * - `normalizeLink()` shapes a Mongo doc into the public response item shape
 *    documented for WaveWatch.
 * - `fetchUploaderMap()` resolves `submitted_by` ids to { username, role }.
 * - `QUALITY_RANK` and `compareQuality()` give a stable numeric ordering for
 *    string qualities like "4k", "1080p", etc.
 */ __turbopack_context__.s([
    "BASE_FILTER",
    ()=>BASE_FILTER,
    "QUALITY_RANK",
    ()=>QUALITY_RANK,
    "compareQuality",
    ()=>compareQuality,
    "fetchUploaderMap",
    ()=>fetchUploaderMap,
    "normalizeLink",
    ()=>normalizeLink,
    "qualityRank",
    ()=>qualityRank,
    "queryDownloadLinks",
    ()=>queryDownloadLinks,
    "requireApiKey",
    ()=>requireApiKey,
    "unauthorized",
    ()=>unauthorized
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
;
const BASE_FILTER = {
    // is_active: legacy data sometimes has the field missing → treat missing as true.
    is_active: {
        $ne: false
    },
    status: "approved",
    // is_valid is tri-state (true/false/null). Spec says "true"; we accept
    // also `null` (not yet checked) so freshly imported links aren't hidden.
    is_valid: {
        $ne: false
    }
};
function unauthorized(reason = "Invalid or missing X-API-Key") {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "Unauthorized",
        reason
    }, {
        status: 401,
        headers: {
            "WWW-Authenticate": 'ApiKey realm="wwembed"'
        }
    });
}
function requireApiKey(req) {
    const expected = process.env.WAVEWATCH_API_KEY;
    if (!expected) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Server misconfigured",
            reason: "WAVEWATCH_API_KEY not set"
        }, {
            status: 500
        });
    }
    const headerKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key") || "";
    const authz = req.headers.get("authorization") || "";
    let bearerKey = "";
    if (authz) {
        const m = authz.match(/^\s*(Bearer|ApiKey)\s+(.+)\s*$/i);
        if (m) bearerKey = m[2].trim();
    }
    const queryKey = req.nextUrl.searchParams.get("api_key") || "";
    const provided = headerKey || bearerKey || queryKey;
    if (!provided || provided !== expected) return unauthorized();
    return null;
}
const QUALITY_RANK = {
    "8k": 8,
    "4320p": 8,
    "4k": 7,
    "2160p": 7,
    "1440p": 6,
    "2k": 6,
    "1080p": 5,
    "fhd": 5,
    "720p": 4,
    "hd": 4,
    "576p": 3,
    "480p": 2,
    "sd": 2,
    "360p": 1,
    "240p": 0
};
function qualityRank(q) {
    if (!q || typeof q !== "string") return -1;
    return QUALITY_RANK[q.toLowerCase().trim()] ?? -1;
}
function compareQuality(a, b) {
    return qualityRank(a?.quality) - qualityRank(b?.quality);
}
function normalizeLink(doc, uploaderMap) {
    if (!doc) return doc;
    const id = doc._id?.toString?.() || doc.id || null;
    const submittedBy = doc.submitted_by ? String(doc.submitted_by) : null;
    const uploader = submittedBy ? uploaderMap.get(submittedBy) : null;
    return {
        id,
        tmdb_id: doc.tmdb_id ?? null,
        media_type: doc.media_type ?? null,
        ww_id: doc.ww_id ?? null,
        source_name: doc.source_name ?? null,
        source_url: doc.source_url ?? null,
        quality: doc.quality ?? null,
        resolution: doc.resolution ?? null,
        language: doc.language ?? null,
        release_name: doc.release_name ?? null,
        season_number: doc.season_number ?? null,
        episode_number: doc.episode_number ?? null,
        codec_video: doc.codec_video ?? null,
        codec_audio: doc.codec_audio ?? null,
        subtitle: doc.subtitle ?? null,
        file_size: doc.file_size ?? null,
        is_verified: doc.is_verified === true,
        created_at: doc.created_at ?? null,
        submitted_by: submittedBy,
        uploader_username: uploader?.username ?? null,
        uploader_role: uploader?.role ?? null
    };
}
async function fetchUploaderMap(submittedBys) {
    const ids = Array.from(new Set(submittedBys.filter(Boolean).map(String)));
    if (ids.length === 0) return new Map();
    const objectIds = [];
    const otherIds = [];
    for (const id of ids){
        if (/^[a-f0-9]{24}$/i.test(id)) {
            try {
                objectIds.push(new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](id));
            } catch  {
                otherIds.push(id);
            }
        } else {
            otherIds.push(id);
        }
    }
    const ors = [];
    if (objectIds.length) ors.push({
        _id: {
            $in: objectIds
        }
    });
    if (otherIds.length) {
        ors.push({
            legacy_uuid: {
                $in: otherIds
            }
        });
        ors.push({
            _id: {
                $in: otherIds
            }
        });
    }
    const filter = ors.length ? {
        $or: ors
    } : {};
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const docs = await db.collection("profiles").find(filter, {
        projection: {
            username: 1,
            role: 1,
            legacy_uuid: 1
        }
    }).toArray();
    const map = new Map();
    for (const d of docs){
        const entry = {
            username: d.username ?? null,
            role: d.role ?? null
        };
        const oid = d._id?.toString?.();
        if (oid) map.set(oid, entry);
        if (d.legacy_uuid) map.set(d.legacy_uuid, entry);
    }
    return map;
}
async function queryDownloadLinks(opts) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection("download_links");
    const total = await coll.countDocuments(opts.filter);
    let cursor = coll.find(opts.filter);
    if (opts.sort && Object.keys(opts.sort).length) cursor = cursor.sort(opts.sort);
    if (opts.skip) cursor = cursor.skip(opts.skip);
    if (opts.limit) cursor = cursor.limit(opts.limit);
    let docs = await cursor.toArray();
    if (opts.sortByQuality) {
        const dir = opts.sortByQuality === "asc" ? 1 : -1;
        docs = docs.slice().sort((a, b)=>dir * compareQuality(a, b));
    }
    const submittedBys = docs.map((d)=>d.submitted_by);
    const uploaderMap = await fetchUploaderMap(submittedBys);
    const items = docs.map((d)=>normalizeLink(d, uploaderMap));
    return {
        items,
        total
    };
}
}),
"[project]/app/api/v1/stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/v1/stats
 *
 * Aggregate stats for the WaveWatch admin "Téléchargements" tab.
 * NOTE: as per the WaveWatch spec, /stats is the *only* endpoint that does
 * NOT apply the implicit (is_active, status, is_valid) filter — it counts the
 * full corpus.
 *
 * Response: { total, last_24h }
 */ __turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wavewatch$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/wavewatch-api.ts [app-route] (ecmascript)");
;
;
;
const dynamic = "force-dynamic";
async function GET(req) {
    const denied = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wavewatch$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireApiKey"])(req);
    if (denied) return denied;
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const coll = db.collection("download_links");
        const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [total, last24h] = await Promise.all([
            coll.countDocuments({}),
            coll.countDocuments({
                created_at: {
                    $gte: dayAgoIso
                }
            })
        ]);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            total,
            last_24h: last24h
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal error",
            reason: e?.message || "unknown"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__dca8c724._.js.map