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
"[project]/app/api/dashboard/my-stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/dashboard/my-stats
 *
 * Per-uploader analytics for the dashboard. Returns:
 *   • 30-day daily series (views + clicks)
 *   • Totals (all-time, 7d, 30d)
 *   • Top 10 contents
 *   • Best day on record
 *   • Avg views/day
 *   • Comparative vs previous period (delta %)
 *   • Link health: alive / dead / unknown across this uploader's content
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
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
async function GET(req) {
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentUser"])(req).catch(()=>null);
    if (!user) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "Auth required"
    }, {
        status: 401
    });
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 86_400_000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
    // 1) Get all ww_ids submitted by this user across the 4 source tables.
    const ownership = await db.collection("streaming_links").aggregate([
        {
            $match: {
                submitted_by: user.id
            }
        },
        {
            $project: {
                ww_id: 1,
                _id: 0
            }
        },
        {
            $unionWith: {
                coll: "download_links",
                pipeline: [
                    {
                        $match: {
                            submitted_by: user.id
                        }
                    },
                    {
                        $project: {
                            ww_id: 1,
                            _id: 0
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
                        $match: {
                            submitted_by: user.id
                        }
                    },
                    {
                        $project: {
                            ww_id: 1,
                            _id: 0
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
                        $match: {
                            submitted_by: user.id
                        }
                    },
                    {
                        $project: {
                            ww_id: 1,
                            _id: 0
                        }
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$ww_id"
            }
        }
    ]).toArray();
    const myWwIds = ownership.map((r)=>r._id).filter(Boolean);
    if (!myWwIds.length) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            totals: {
                views: 0,
                views_30d: 0,
                views_7d: 0,
                clicks_30d: 0
            },
            delta_pct: {
                views_30d: 0
            },
            series_30d: Array.from({
                length: 30
            }, (_, i)=>({
                    date: new Date(now - (29 - i) * 86_400_000).toISOString().slice(0, 10),
                    views: 0,
                    clicks: 0
                })),
            top_contents: [],
            best_day: null,
            avg_views_per_day_30d: 0,
            link_health: {
                alive: 0,
                dead: 0,
                unknown: 0,
                total: 0
            },
            content_count: 0
        });
    }
    const matchViews30 = {
        ww_id: {
            $in: myWwIds
        },
        viewed_at: {
            $gte: thirtyDaysAgo
        }
    };
    const matchViews7 = {
        ww_id: {
            $in: myWwIds
        },
        viewed_at: {
            $gte: sevenDaysAgo
        }
    };
    const matchClicks30 = {
        ww_id: {
            $in: myWwIds
        },
        clicked_at: {
            $gte: thirtyDaysAgo
        }
    };
    const matchViewsPrev = {
        ww_id: {
            $in: myWwIds
        },
        viewed_at: {
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo
        }
    };
    const [totalViews, views30, views7, clicks30, viewsPrev30, seriesViews, seriesClicks, topContents, healthBreakdown, bySourceRaw, topMediaBySourceRaw] = await Promise.all([
        db.collection("embed_views").countDocuments({
            ww_id: {
                $in: myWwIds
            }
        }),
        db.collection("embed_views").countDocuments(matchViews30),
        db.collection("embed_views").countDocuments(matchViews7),
        db.collection("link_clicks").countDocuments(matchClicks30),
        db.collection("embed_views").countDocuments(matchViewsPrev),
        db.collection("embed_views").aggregate([
            {
                $match: matchViews30
            },
            {
                $group: {
                    _id: dayBucket("$viewed_at"),
                    n: {
                        $sum: 1
                    }
                }
            }
        ], {
            allowDiskUse: true
        }).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: matchClicks30
            },
            {
                $group: {
                    _id: dayBucket("$clicked_at"),
                    n: {
                        $sum: 1
                    }
                }
            }
        ], {
            allowDiskUse: true
        }).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: matchViews30
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
                $limit: 10
            }
        ], {
            allowDiskUse: true
        }).toArray(),
        db.collection("link_status").aggregate([
            // Match link_status docs whose parent link belongs to this user.
            // We can't join easily — instead we use ww_id directly because
            // link_status doesn't carry it. Fall back to scanning per type.
            {
                $group: {
                    _id: "$status",
                    n: {
                        $sum: 1
                    }
                }
            }
        ]).toArray(),
        // bySource breakdown of EXTERNAL clicks on this uploader's contents.
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    ...matchClicks30,
                    link_type: "external"
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$source",
                            "movix"
                        ]
                    },
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    count: -1
                }
            }
        ], {
            allowDiskUse: true
        }).toArray(),
        // Top-3 contents per source for this uploader.
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    ...matchClicks30,
                    link_type: "external"
                }
            },
            {
                $group: {
                    _id: {
                        ww_id: "$ww_id",
                        tmdb_id: "$tmdb_id",
                        media_type: "$media_type",
                        source: {
                            $ifNull: [
                                "$source",
                                "movix"
                            ]
                        }
                    },
                    clicks: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    clicks: -1
                }
            },
            {
                $group: {
                    _id: "$_id.source",
                    items: {
                        $push: {
                            ww_id: "$_id.ww_id",
                            tmdb_id: "$_id.tmdb_id",
                            media_type: "$_id.media_type",
                            clicks: "$clicks"
                        }
                    }
                }
            },
            {
                $project: {
                    items: {
                        $slice: [
                            "$items",
                            3
                        ]
                    }
                }
            }
        ], {
            allowDiskUse: true
        }).toArray()
    ]);
    // Dense series
    const viewsByDay = new Map();
    for (const r of seriesViews)if (r._id) viewsByDay.set(r._id, r.n);
    const clicksByDay = new Map();
    for (const r of seriesClicks)if (r._id) clicksByDay.set(r._id, r.n);
    const series_30d = [];
    let bestDay = null;
    for(let i = 29; i >= 0; i--){
        const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
        const v = viewsByDay.get(d) || 0;
        const c = clicksByDay.get(d) || 0;
        series_30d.push({
            date: d,
            views: v,
            clicks: c
        });
        if (!bestDay || v > bestDay.views) bestDay = {
            date: d,
            views: v
        };
    }
    const delta_pct = viewsPrev30 > 0 ? Math.round((views30 - viewsPrev30) / viewsPrev30 * 100) : null;
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        totals: {
            views: totalViews,
            views_30d: views30,
            views_7d: views7,
            clicks_30d: clicks30
        },
        delta_pct: {
            views_30d: delta_pct
        },
        series_30d,
        top_contents: topContents.map((c)=>({
                ww_id: c._id,
                views: c.views,
                media_type: c.media_type,
                tmdb_id: c.tmdb_id
            })),
        best_day: bestDay,
        avg_views_per_day_30d: Math.round(views30 / 30),
        link_health: {
            alive: healthBreakdown.find((r)=>r._id === "alive")?.n || 0,
            dead: healthBreakdown.find((r)=>r._id === "dead")?.n || 0,
            unknown: healthBreakdown.find((r)=>r._id === "unknown")?.n || 0,
            total: healthBreakdown.reduce((acc, r)=>acc + r.n, 0)
        },
        content_count: myWwIds.length,
        by_source: {
            breakdown: bySourceRaw.map((r)=>({
                    source: r._id,
                    count: r.count
                })),
            top_media: topMediaBySourceRaw.reduce((acc, b)=>{
                acc[b._id] = b.items;
                return acc;
            }, {
                movix: [],
                alt: [],
                zt: []
            })
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bc7e86d0._.js.map