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
"[project]/app/api/leaderboard/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/leaderboard?period=7d|30d|all
 *
 * Public ranking of uploaders by total views generated across their
 * approved content over the requested period. Returns the top 50 by
 * default (override with `?limit=N`).
 *
 * Pure aggregation — no auth required so the leaderboard widget can be
 * displayed on the home page / docs / etc.
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
function sinceFor(period) {
    if (period === "all") return null;
    const days = period === "7d" ? 7 : 30;
    return new Date(Date.now() - days * 86_400_000).toISOString();
}
async function GET(req) {
    const period = req.nextUrl.searchParams.get("period") || "7d";
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50);
    const since = sinceFor(period);
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    // Build a map of ww_id → submitted_by (one query per link collection).
    // We use a single aggregation that $unionWith the three sources so the
    // ww_id → user lookup happens once.
    const ownership = await db.collection("streaming_links").aggregate([
        {
            $project: {
                ww_id: 1,
                submitted_by: 1
            }
        },
        {
            $unionWith: {
                coll: "download_links",
                pipeline: [
                    {
                        $project: {
                            ww_id: 1,
                            submitted_by: 1
                        }
                    }
                ]
            }
        },
        {
            $unionWith: {
                coll: "live_tv_channels",
                pipeline: [
                    {
                        $project: {
                            ww_id: 1,
                            submitted_by: 1
                        }
                    }
                ]
            }
        },
        {
            $unionWith: {
                coll: "digital_content",
                pipeline: [
                    {
                        $project: {
                            ww_id: 1,
                            submitted_by: 1
                        }
                    }
                ]
            }
        },
        {
            $match: {
                ww_id: {
                    $ne: null
                },
                submitted_by: {
                    $ne: null
                }
            }
        },
        {
            $group: {
                _id: "$ww_id",
                uploader_id: {
                    $first: "$submitted_by"
                }
            }
        }
    ]).toArray();
    const ownerByWw = new Map();
    for (const row of ownership){
        if (row._id) ownerByWw.set(row._id, row.uploader_id);
    }
    if (!ownerByWw.size) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            period,
            leaderboard: []
        });
    }
    // Count embed_views per ww_id over the period.
    const match = {
        ww_id: {
            $in: Array.from(ownerByWw.keys())
        }
    };
    if (since) match.viewed_at = {
        $gte: since
    };
    const viewsAgg = await db.collection("embed_views").aggregate([
        {
            $match: match
        },
        {
            $group: {
                _id: "$ww_id",
                views: {
                    $sum: 1
                }
            }
        }
    ], {
        allowDiskUse: true
    }).toArray();
    // Sum by uploader
    const byUploader = new Map();
    for (const row of viewsAgg){
        const uploaderId = ownerByWw.get(row._id);
        if (!uploaderId) continue;
        const cur = byUploader.get(uploaderId) || {
            views: 0,
            ww_ids: 0
        };
        cur.views += row.views;
        cur.ww_ids += 1;
        byUploader.set(uploaderId, cur);
    }
    // Sort + resolve usernames
    const sorted = Array.from(byUploader.entries()).sort((a, b)=>b[1].views - a[1].views).slice(0, limit);
    if (!sorted.length) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        period,
        leaderboard: []
    });
    const users = await db.collection("users").find({
        $or: [
            {
                legacy_uuid: {
                    $in: sorted.map(([id])=>id)
                }
            },
            {
                _id: {
                    $in: sorted.map(([id])=>id).filter((s)=>/^[0-9a-f]{24}$/.test(s)).map((s)=>s)
                }
            }
        ]
    }, {
        projection: {
            username: 1,
            legacy_uuid: 1,
            role: 1
        }
    }).toArray();
    const userBy = new Map();
    for (const u of users){
        const id = u.legacy_uuid || (u._id?.toString ? u._id.toString() : String(u._id));
        userBy.set(id, u);
    }
    const leaderboard = sorted.map(([uploaderId, stats], i)=>{
        const u = userBy.get(uploaderId);
        return {
            rank: i + 1,
            uploader_id: uploaderId,
            username: u?.username || "anonyme",
            role: u?.role || "uploader",
            views: stats.views,
            contents: stats.ww_ids
        };
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        period,
        leaderboard,
        total_uploaders: byUploader.size
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__34a7b6f9._.js.map