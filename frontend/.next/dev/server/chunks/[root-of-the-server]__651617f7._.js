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
    // sessions for password reset / login attempts
    await db.collection("password_reset_tokens").createIndex({
        expires_at: 1
    }, {
        expireAfterSeconds: 0
    });
    await db.collection("login_attempts").createIndex({
        identifier: 1
    });
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
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";
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
        id: userDoc._id?.toString() || userDoc.id,
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
"[project]/app/api/admin/stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Single fast endpoint that returns everything the Admin > Stats tab needs.
 * Uses MongoDB aggregation pipelines instead of paginated client fetches.
 * Typical response time: ~100-300ms vs 5-15s previously.
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
;
;
;
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const TMDB_IMG = "https://image.tmdb.org/t/p/w92";
// In-memory TMDB cache (per server instance)
const tmdbCache = new Map();
const TMDB_TTL = 6 * 60 * 60 * 1000 // 6h
;
async function fetchTmdb(type, id) {
    const key = `${type}/${id}`;
    const cached = tmdbCache.get(key);
    if (cached && Date.now() - cached.t < TMDB_TTL) return cached;
    if (type !== "movie" && type !== "tv") {
        const v = {
            title: `#${id}`,
            poster: null,
            t: Date.now()
        };
        tmdbCache.set(key, v);
        return v;
    }
    try {
        const r = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=fr-FR`, {
            next: {
                revalidate: 21600
            }
        });
        if (!r.ok) throw new Error("tmdb");
        const j = await r.json();
        const v = {
            title: j.title || j.name || `#${id}`,
            poster: j.poster_path ? `${TMDB_IMG}${j.poster_path}` : null,
            t: Date.now()
        };
        tmdbCache.set(key, v);
        return v;
    } catch  {
        const v = {
            title: `#${id}`,
            poster: null,
            t: Date.now()
        };
        tmdbCache.set(key, v);
        return v;
    }
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
    const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") || "7", 10)));
    const now = new Date();
    const startDate = new Date(now.getTime() - period * 86400000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 86400000).toISOString();
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    // Run main aggregations in parallel
    const [viewsByDay, totalViews, totalStreamingViews, totalLinkClicks, totalAdClicks, uniqueIpsAgg, viewsByType, topMediaRaw, topDownloadRaw, topRefererRaw, online5, online15, online1h, online24h, activePagesRaw, recentVisitorsRaw, externalClicksRaw, externalByDayRaw, externalProvidersRaw, externalHostsRaw, externalQualityRaw, externalMediaTypeRaw, externalTopRaw, totalExternalClicks] = await Promise.all([
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $substrCP: [
                            "$viewed_at",
                            0,
                            10
                        ]
                    },
                    total: {
                        $sum: 1
                    },
                    streaming: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        {
                                            $eq: [
                                                "$embed_type",
                                                "streaming"
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]).toArray(),
        db.collection("embed_views").countDocuments({
            viewed_at: {
                $gte: startDate
            }
        }),
        db.collection("embed_views").countDocuments({
            viewed_at: {
                $gte: startDate
            },
            embed_type: "streaming"
        }),
        db.collection("link_clicks").countDocuments({
            clicked_at: {
                $gte: startDate
            }
        }),
        db.collection("ad_clicks").countDocuments({
            clicked_at: {
                $gte: startDate
            }
        }),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: startDate
                    },
                    ip_hash: {
                        $ne: null
                    }
                }
            },
            {
                $group: {
                    _id: "$ip_hash"
                }
            },
            {
                $count: "n"
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: "$media_type",
                    count: {
                        $sum: 1
                    }
                }
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        ww_id: "$ww_id",
                        media_type: "$media_type",
                        tmdb_id: "$tmdb_id"
                    },
                    views: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    views: -1
                }
            },
            {
                $limit: 50
            }
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        ww_id: "$ww_id",
                        media_type: "$media_type",
                        tmdb_id: "$tmdb_id"
                    },
                    downloads: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    downloads: -1
                }
            },
            {
                $limit: 50
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$referrer",
                            "Direct"
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
            },
            {
                $limit: 50
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: fiveMinAgo
                    },
                    ip_hash: {
                        $ne: null
                    }
                }
            },
            {
                $group: {
                    _id: "$ip_hash"
                }
            },
            {
                $count: "n"
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: fifteenMinAgo
                    },
                    ip_hash: {
                        $ne: null
                    }
                }
            },
            {
                $group: {
                    _id: "$ip_hash"
                }
            },
            {
                $count: "n"
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: oneHourAgo
                    },
                    ip_hash: {
                        $ne: null
                    }
                }
            },
            {
                $group: {
                    _id: "$ip_hash"
                }
            },
            {
                $count: "n"
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: twentyFourHoursAgo
                    },
                    ip_hash: {
                        $ne: null
                    }
                }
            },
            {
                $group: {
                    _id: "$ip_hash"
                }
            },
            {
                $count: "n"
            }
        ]).toArray(),
        db.collection("embed_views").aggregate([
            {
                $match: {
                    viewed_at: {
                        $gte: fifteenMinAgo
                    }
                }
            },
            {
                $group: {
                    _id: "$ww_id",
                    count: {
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
                    count: -1
                }
            },
            {
                $limit: 10
            }
        ]).toArray(),
        db.collection("embed_views").find({
            viewed_at: {
                $gte: oneHourAgo
            }
        }).sort({
            viewed_at: -1
        }).limit(40).toArray(),
        // External clicks — count ALL link_clicks (every click on a download/streaming
        // external link counts; the Supabase `is_external` flag was inconsistent
        // historically so we treat any link_click as a 3rd-party exit click).
        db.collection("link_clicks").countDocuments({
            clicked_at: {
                $gte: startDate
            }
        }),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $substrCP: [
                            "$clicked_at",
                            0,
                            10
                        ]
                    },
                    count: {
                        $sum: 1
                    }
                }
            }
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$provider",
                            "Inconnu"
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
            },
            {
                $limit: 12
            }
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$host_name",
                            "?"
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
            },
            {
                $limit: 15
            }
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$quality",
                            "N/A"
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
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$media_type",
                            "?"
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
        ]).toArray(),
        db.collection("link_clicks").aggregate([
            {
                $match: {
                    clicked_at: {
                        $gte: startDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        ww_id: "$ww_id",
                        media_type: "$media_type",
                        tmdb_id: "$tmdb_id"
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
                $limit: 20
            }
        ]).toArray(),
        db.collection("link_clicks").countDocuments({})
    ]);
    // Build day buckets
    const byDayMap = new Map();
    for(let i = period - 1; i >= 0; i--){
        const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0];
        byDayMap.set(d, {
            total: 0,
            streaming: 0,
            download: 0
        });
    }
    for (const row of viewsByDay){
        if (byDayMap.has(row._id)) {
            byDayMap.get(row._id).total = row.total;
            byDayMap.get(row._id).streaming = row.streaming;
        }
    }
    // Add downloads per day
    const linkClicksDay = await db.collection("link_clicks").aggregate([
        {
            $match: {
                clicked_at: {
                    $gte: startDate
                }
            }
        },
        {
            $group: {
                _id: {
                    $substrCP: [
                        "$clicked_at",
                        0,
                        10
                    ]
                },
                count: {
                    $sum: 1
                }
            }
        }
    ]).toArray();
    for (const row of linkClicksDay){
        if (byDayMap.has(row._id)) byDayMap.get(row._id).download = row.count;
    }
    const viewsByDayFinal = Array.from(byDayMap.entries()).map(([date, v])=>({
            date,
            count: v.total,
            streamingCount: v.streaming,
            downloadCount: v.download,
            formattedDate: new Date(date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit"
            })
        }));
    // Enrich top media (parallel TMDB + Live TV lookups)
    const channelIds = new Set();
    for (const m of topMediaRaw){
        if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length));
    }
    for (const m of topDownloadRaw){
        if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length));
    }
    for (const m of activePagesRaw){
        if (m._id?.startsWith?.("ww-live-")) channelIds.add(m._id.slice("ww-live-".length));
    }
    for (const v of recentVisitorsRaw){
        if (v.ww_id?.startsWith?.("ww-live-")) channelIds.add(v.ww_id.slice("ww-live-".length));
    }
    const ObjectIdLib = (await __turbopack_context__.A("[externals]/mongodb [external] (mongodb, cjs, async loader)")).ObjectId;
    const channelMap = new Map();
    if (channelIds.size > 0) {
        const ids = Array.from(channelIds).flatMap((cid)=>{
            const arr = [
                cid
            ];
            if (/^[a-f0-9]{24}$/i.test(cid)) {
                try {
                    arr.push(new ObjectIdLib(cid));
                } catch  {}
            }
            return arr;
        });
        const channels = await db.collection("live_tv_channels").find({
            $or: [
                {
                    _id: {
                        $in: ids
                    }
                },
                {
                    id: {
                        $in: ids
                    }
                }
            ]
        }).project({
            channel_name: 1,
            channel_logo: 1
        }).toArray();
        for (const c of channels)channelMap.set(c._id?.toString(), {
            title: c.channel_name,
            poster: c.channel_logo
        });
    }
    // Digital lookups
    const digitalIds = new Set();
    for (const m of topDownloadRaw){
        if (m._id?.ww_id && /^ww-(ebook|music|software|game)-/.test(m._id.ww_id)) {
            digitalIds.add(m._id.ww_id);
        }
    }
    const digitalMap = new Map();
    if (digitalIds.size > 0) {
        const digitals = await db.collection("digital_content").find({
            ww_id: {
                $in: Array.from(digitalIds)
            }
        }).project({
            ww_id: 1,
            title: 1,
            cover_url: 1
        }).toArray();
        for (const d of digitals)digitalMap.set(d.ww_id, {
            title: d.title,
            poster: d.cover_url
        });
    }
    const enrich = async (item, kind)=>{
        const wwId = item._id?.ww_id;
        const mediaType = item._id?.media_type;
        const tmdbId = item._id?.tmdb_id;
        let title = wwId || "?";
        let poster = null;
        if (wwId?.startsWith?.("ww-live-")) {
            const cid = wwId.slice("ww-live-".length);
            const ch = channelMap.get(cid) || channelMap.get(cid);
            title = ch?.title || "Chaîne TV";
            poster = ch?.poster || null;
        } else if (wwId && /^ww-(ebook|music|software|game)-/.test(wwId)) {
            const dg = digitalMap.get(wwId);
            title = dg?.title || "Contenu Digital";
            poster = dg?.poster || null;
        } else if (tmdbId && (mediaType === "movie" || mediaType === "tv")) {
            const tm = await fetchTmdb(mediaType, tmdbId);
            title = tm.title;
            poster = tm.poster;
        }
        return {
            tmdb_id: tmdbId,
            media_type: wwId?.startsWith?.("ww-live-") ? "live" : wwId && /^ww-(ebook|music|software|game)-/.test(wwId) ? "digital" : mediaType,
            ww_id: wwId,
            title,
            poster,
            ...kind === "view" ? {
                views: item.views
            } : {
                downloads: item.downloads
            }
        };
    };
    const topMedia = await Promise.all(topMediaRaw.slice(0, 30).map((m)=>enrich(m, "view")));
    const topMediaDownload = await Promise.all(topDownloadRaw.slice(0, 30).map((m)=>enrich(m, "download")));
    // Active pages enrichment (similar but flatter)
    const activePages = await Promise.all(activePagesRaw.map(async (p)=>{
        const wwId = p._id;
        let title = wwId;
        let poster = null;
        if (wwId?.startsWith?.("ww-live-")) {
            const ch = channelMap.get(wwId.slice("ww-live-".length));
            title = ch?.title || wwId;
            poster = ch?.poster || null;
        } else if (p.tmdb_id && (p.media_type === "movie" || p.media_type === "tv")) {
            const tm = await fetchTmdb(p.media_type, p.tmdb_id);
            title = tm.title;
            poster = tm.poster;
        }
        return {
            ww_id: wwId,
            count: p.count,
            media_type: p.media_type,
            title,
            poster
        };
    }));
    const recentVisitorsSeen = new Set();
    const recentVisitors = await Promise.all(recentVisitorsRaw.filter((v)=>{
        const k = v.ww_id || v.viewed_at;
        if (recentVisitorsSeen.has(k)) return false;
        recentVisitorsSeen.add(k);
        return true;
    }).slice(0, 12).map(async (v)=>{
        let title = v.ww_id || "N/A";
        let poster = null;
        if (v.ww_id?.startsWith?.("ww-live-")) {
            const ch = channelMap.get(v.ww_id.slice("ww-live-".length));
            title = ch?.title || v.ww_id;
            poster = ch?.poster || null;
        } else if (v.tmdb_id && (v.media_type === "movie" || v.media_type === "tv")) {
            const tm = await fetchTmdb(v.media_type, v.tmdb_id);
            title = tm.title;
            poster = tm.poster;
        }
        return {
            ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "…" : "Anonyme",
            viewed_at: v.viewed_at,
            ww_id: v.ww_id || "N/A",
            media_type: v.media_type || "?",
            title,
            poster
        };
    }));
    // Format top referers
    const topReferers = topRefererRaw.map((r)=>{
        let host = "Direct";
        if (r._id && r._id !== "Direct") {
            try {
                host = new URL(r._id).origin;
            } catch  {
                host = r._id;
            }
        }
        return {
            referrer: host,
            count: r.count
        };
    });
    // External top media enrichment (lightweight)
    const externalTop = await Promise.all(externalTopRaw.map((m)=>enrich({
            _id: m._id,
            downloads: m.clicks
        }, "download")));
    // External by-day fill
    const externalByDayMap = new Map();
    for(let i = period - 1; i >= 0; i--){
        externalByDayMap.set(new Date(now.getTime() - i * 86400000).toISOString().split("T")[0], 0);
    }
    for (const row of externalByDayRaw){
        if (externalByDayMap.has(row._id)) externalByDayMap.set(row._id, row.count);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        period,
        generated_at: new Date().toISOString(),
        detailed: {
            totalViews,
            totalStreamingViews,
            totalClicks: totalLinkClicks,
            totalAdClicks,
            uniqueVisitors: uniqueIpsAgg[0]?.n || 0,
            avgViewsPerDay: period > 0 ? totalViews / period : 0,
            viewsByType: [
                {
                    type: "Films",
                    count: viewsByType.find((x)=>x._id === "movie")?.count || 0
                },
                {
                    type: "Séries",
                    count: viewsByType.find((x)=>x._id === "tv")?.count || 0
                },
                {
                    type: "TV Live",
                    count: viewsByType.find((x)=>x._id === "live")?.count || 0 + (viewsByType.find((x)=>x._id === "live_tv")?.count || 0)
                },
                {
                    type: "Streaming",
                    count: totalStreamingViews
                }
            ]
        },
        viewsByDay: viewsByDayFinal,
        topMedia,
        topMediaDownload,
        topReferers,
        online: {
            online5min: online5[0]?.n || 0,
            online15min: online15[0]?.n || 0,
            online1hour: online1h[0]?.n || 0,
            online24h: online24h[0]?.n || 0,
            activePages,
            recentVisitors
        },
        external: {
            totalClicks: externalClicksRaw,
            totalClicksAllTime: totalExternalClicks,
            byDay: Array.from(externalByDayMap.entries()).map(([date, count])=>({
                    date,
                    count
                })),
            byProvider: externalProvidersRaw.map((r)=>({
                    provider: r._id,
                    count: r.count
                })),
            byHost: externalHostsRaw.map((r)=>({
                    host: r._id,
                    count: r.count
                })),
            byQuality: externalQualityRaw.map((r)=>({
                    quality: r._id,
                    count: r.count
                })),
            byMediaType: externalMediaTypeRaw.map((r)=>({
                    type: r._id,
                    count: r.count
                })),
            topMedia: externalTop
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__651617f7._.js.map