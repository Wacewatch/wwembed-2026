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
    // pre-aggregated stats (see lib/stats-rollup.ts)
    await db.collection("stats_daily_rollup").createIndex({
        date: -1
    }, {
        unique: true
    });
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
"[project]/lib/stats-rollup.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Daily stats rollup.
 *
 * Each row in `stats_daily_rollup` aggregates all stats for one day:
 *   { date: "2026-05-14", views, streamingViews, downloadClicks, adClicks,
 *     uniqueVisitors, viewsByType: {movie,tv,live,ebook,music,soft,game} }
 *
 * Built by `rebuildDay(date)` (idempotent) and a single helper
 * `rebuildSince(daysBack)` that the cron endpoint calls. Admin/stats reads
 * this collection instead of scanning embed_views directly — turns a 30-day
 * stats query from ~3-10 s (full scan over millions of docs) into ~50 ms.
 */ __turbopack_context__.s([
    "dayBucket",
    ()=>dayBucket,
    "isoDay",
    ()=>isoDay,
    "readRollups",
    ()=>readRollups,
    "rebuildDay",
    ()=>rebuildDay,
    "rebuildSince",
    ()=>rebuildSince
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
function startOfDay(d) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
}
function isoDay(d) {
    return startOfDay(d).toISOString().slice(0, 10);
}
/**
 * Day bucket expression that works for both ISO-string and Date BSON
 * `viewed_at` / `clicked_at` values (legacy migrated rows may be one or
 * the other).
 */ function dayBucket(field) {
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
async function rebuildDay(date) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const start = new Date(date + "T00:00:00.000Z").toISOString();
    const end = new Date(new Date(date + "T00:00:00.000Z").getTime() + 86400000).toISOString();
    const matchViews = {
        viewed_at: {
            $gte: start,
            $lt: end
        }
    };
    const matchClicks = {
        clicked_at: {
            $gte: start,
            $lt: end
        }
    };
    const [viewsTotal, streamingViews, downloadClicks, adClicks, uniqueAgg, byType] = await Promise.all([
        db.collection("embed_views").countDocuments(matchViews),
        db.collection("embed_views").countDocuments({
            ...matchViews,
            embed_type: "streaming"
        }),
        db.collection("link_clicks").countDocuments(matchClicks),
        db.collection("ad_clicks").countDocuments(matchClicks),
        db.collection("embed_views").aggregate([
            {
                $match: matchViews
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
        ], {
            allowDiskUse: true
        }).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: matchViews
            },
            {
                $group: {
                    _id: "$media_type",
                    n: {
                        $sum: 1
                    }
                }
            }
        ], {
            allowDiskUse: true
        }).toArray()
    ]);
    const viewsByType = {};
    for (const row of byType){
        if (row._id) viewsByType[row._id] = row.n;
    }
    const rollup = {
        date,
        views: viewsTotal,
        streamingViews,
        downloadClicks,
        adClicks,
        uniqueVisitors: uniqueAgg[0]?.n || 0,
        viewsByType,
        generated_at: new Date().toISOString()
    };
    await db.collection("stats_daily_rollup").updateOne({
        date
    }, {
        $set: rollup
    }, {
        upsert: true
    });
    return rollup;
}
async function rebuildSince(daysBack = 2) {
    const out = [];
    const today = new Date();
    for(let i = 0; i < daysBack; i++){
        const d = new Date(today.getTime() - i * 86400000);
        const r = await rebuildDay(isoDay(d));
        out.push(r);
    }
    return out;
}
async function readRollups(days = 30) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const start = isoDay(new Date(Date.now() - (days - 1) * 86400000));
    const rows = await db.collection("stats_daily_rollup").find({
        date: {
            $gte: start
        }
    }).sort({
        date: -1
    }).toArray();
    return rows.map((r)=>({
            ...r,
            _id: undefined
        }));
}
;
}),
"[project]/app/api/admin/stats-rollup/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Cron endpoint: rebuild the daily stats rollup.
 *
 * Call this every 15-30 min (or hourly) from your favorite cron service:
 *   curl -fsS "https://your-domain.tld/api/admin/stats-rollup?secret=$CRON_SECRET"
 *
 * It rebuilds today + yesterday by default (idempotent). Pass `?days=N` to
 * backfill more days (used once after deploy to populate history).
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stats$2d$rollup$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/stats-rollup.ts [app-route] (ecmascript)");
;
;
async function GET(req) {
    const secret = req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (!expected || expected.length < 16) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Cron endpoint disabled (CRON_SECRET missing)"
        }, {
            status: 503
        });
    }
    if (secret !== expected) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("days") || "2", 10)));
    try {
        const rollups = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stats$2d$rollup$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rebuildSince"])(days);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            days_built: rollups.length,
            latest: rollups[0] || null
        });
    } catch (e) {
        console.error("[stats-rollup cron] failed:", e);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message || "Internal error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3cc70737._.js.map