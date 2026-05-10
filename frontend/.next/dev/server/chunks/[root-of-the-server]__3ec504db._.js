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
"[project]/lib/mongo/supabase-import.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Server-side Supabase → MongoDB importer.
 * Stateless module: a single global in-memory job + a persisted "import_jobs"
 * doc in MongoDB so the admin UI can poll progress and survive page refresh.
 *
 * Triggered by POST /api/admin/import-supabase (admin only).
 */ __turbopack_context__.s([
    "getJobById",
    ()=>getJobById,
    "getLatestJob",
    ()=>getLatestJob,
    "startImportJob",
    ()=>startImportJob
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
;
const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "";
// Tables to migrate (order matters: profiles before users so we can enrich)
const TABLES = [
    "profiles",
    "profile_settings",
    "third_party_apis",
    "streaming_links",
    "download_links",
    "embed_views",
    "link_clicks",
    "api_usage",
    "daily_stats",
    "ads",
    "ad_clicks",
    "live_tv_channels",
    "live_tv_sources",
    "digital_content",
    "digital_download_links",
    "bug_reports",
    "site_settings"
];
function uuidToObjectIdHex(uuid) {
    const hex = uuid.replace(/-/g, "");
    return hex.slice(0, 24).padEnd(24, "0");
}
function isUuid(v) {
    return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}
async function persistJob(job) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    await db.collection("import_jobs").replaceOne({
        _id: job._id
    }, job, {
        upsert: true
    });
}
async function migrateTable(job, supabase, tableName) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const coll = db.collection(tableName);
    const tableEntry = job.tables.find((t)=>t.name === tableName);
    tableEntry.state = "running";
    job.current_table = tableName;
    await persistJob(job);
    let from = 0;
    const PAGE = 500;
    let total = 0;
    while(true){
        let data = null;
        let lastError = null;
        for(let attempt = 0; attempt < 4; attempt++){
            const r = await supabase.from(tableName).select("*").range(from, from + PAGE - 1);
            if (r.error) {
                lastError = r.error.message;
                if (/timeout|57014|fetch failed/i.test(lastError)) {
                    await new Promise((res)=>setTimeout(res, 800 * (attempt + 1)));
                    continue;
                }
                await new Promise((res)=>setTimeout(res, 800 * (attempt + 1)));
                continue;
            }
            data = r.data || [];
            lastError = null;
            break;
        }
        if (lastError) {
            tableEntry.state = "error";
            tableEntry.error = lastError;
            tableEntry.total = total;
            await persistJob(job);
            return total;
        }
        if (!data || data.length === 0) break;
        const docs = data.map((row)=>{
            const doc = {
                ...row
            };
            if (isUuid(row.id)) {
                try {
                    doc._id = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](uuidToObjectIdHex(row.id));
                    doc.legacy_uuid = row.id;
                } catch  {
                    doc._id = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"]();
                    doc.legacy_uuid = row.id;
                }
            } else if (row.id != null) {
                doc.legacy_id = row.id;
            }
            delete doc.id;
            return doc;
        });
        const ops = docs.map((d)=>({
                replaceOne: {
                    filter: {
                        _id: d._id
                    },
                    replacement: d,
                    upsert: true
                }
            }));
        if (ops.length) {
            try {
                await coll.bulkWrite(ops, {
                    ordered: false
                });
            } catch (e) {
                // Continue on duplicate-key etc
                if (!/duplicate key|E11000/i.test(e?.message || "")) {
                    tableEntry.state = "error";
                    tableEntry.error = e?.message || "bulkWrite failed";
                    tableEntry.total = total;
                    await persistJob(job);
                    return total;
                }
            }
        }
        total += docs.length;
        tableEntry.total = total;
        job.total_rows += docs.length;
        // Persist every page so UI can show live progress
        await persistJob(job);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    tableEntry.state = "done";
    tableEntry.total = total;
    await persistJob(job);
    return total;
}
async function migrateAuthUsers(job, supabase) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const usersColl = db.collection("users");
    const profilesColl = db.collection("profiles");
    job.phase = "auth_users";
    job.auth_users.state = "running";
    job.current_table = "auth.users";
    await persistJob(job);
    let page = 1;
    const PER_PAGE = 500;
    let total = 0;
    while(true){
        let data = null;
        let lastError = null;
        for(let attempt = 0; attempt < 4; attempt++){
            const r = await supabase.auth.admin.listUsers({
                page,
                perPage: PER_PAGE
            });
            if (r.error) {
                lastError = r.error.message;
                await new Promise((res)=>setTimeout(res, 800 * (attempt + 1)));
                continue;
            }
            data = r.data;
            lastError = null;
            break;
        }
        if (lastError || !data) {
            job.auth_users.state = "error";
            job.auth_users.error = lastError || "listUsers failed";
            await persistJob(job);
            return;
        }
        if (!data.users || data.users.length === 0) break;
        for (const u of data.users){
            const _id = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](uuidToObjectIdHex(u.id));
            const profile = await profilesColl.findOne({
                legacy_uuid: u.id
            });
            // Don't overwrite a user that already has a real password_hash
            // (e.g. our manually-seeded admin or users who have set their password
            // via the post-migration sign-up flow).
            const existing = await usersColl.findOne({
                _id
            });
            if (existing && existing.password_hash) {
                if (profile) {
                    await profilesColl.updateOne({
                        _id: profile._id
                    }, {
                        $set: {
                            user_id: _id
                        }
                    });
                }
                total++;
                continue;
            }
            await usersColl.updateOne({
                _id
            }, {
                $set: {
                    email: (u.email || "").toLowerCase(),
                    username: profile?.username || u.user_metadata?.username || (u.email || "").split("@")[0],
                    role: profile?.role || u.user_metadata?.role || "member",
                    password_hash: null,
                    needs_password_reset: true,
                    legacy_uuid: u.id,
                    email_confirmed_at: u.email_confirmed_at,
                    created_at: u.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, {
                upsert: true
            });
            if (profile) {
                await profilesColl.updateOne({
                    _id: profile._id
                }, {
                    $set: {
                        user_id: _id
                    }
                });
            }
            total++;
        }
        job.auth_users.total = total;
        await persistJob(job);
        if (data.users.length < PER_PAGE) break;
        page++;
    }
    job.auth_users.state = "done";
    job.auth_users.total = total;
    await persistJob(job);
}
async function startImportJob() {
    if (!SB_URL || !SB_KEY) {
        throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in environment");
    }
    if (globalThis.__ww_import_running) {
        throw new Error("An import is already running");
    }
    globalThis.__ww_import_running = true;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SB_URL, SB_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    const job = {
        _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](),
        status: "running",
        started_at: new Date().toISOString(),
        phase: "tables",
        current_table: undefined,
        tables: TABLES.map((t)=>({
                name: t,
                total: 0,
                state: "pending"
            })),
        auth_users: {
            total: 0,
            state: "pending"
        },
        total_rows: 0
    };
    await persistJob(job);
    (async ()=>{
        try {
            for (const t of TABLES){
                try {
                    await migrateTable(job, supabase, t);
                } catch (e) {
                    const entry = job.tables.find((x)=>x.name === t);
                    if (entry) {
                        entry.state = "error";
                        entry.error = e?.message || "unknown";
                    }
                    await persistJob(job);
                }
            }
            try {
                await migrateAuthUsers(job, supabase);
            } catch (e) {
                job.auth_users.state = "error";
                job.auth_users.error = e?.message || "unknown";
            }
            job.phase = "done";
            job.status = job.tables.some((t)=>t.state === "error") ? "error" : "done";
            job.finished_at = new Date().toISOString();
            job.current_table = undefined;
            await persistJob(job);
        } catch (e) {
            job.status = "error";
            job.error = e?.message || "unknown";
            job.finished_at = new Date().toISOString();
            await persistJob(job);
        } finally{
            globalThis.__ww_import_running = false;
        }
    })();
    return job;
}
async function getLatestJob() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const doc = await db.collection("import_jobs").find({}).sort({
        started_at: -1
    }).limit(1).toArray();
    return doc[0] || null;
}
async function getJobById(id) {
    if (!/^[a-f0-9]{24}$/i.test(id)) return null;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const doc = await db.collection("import_jobs").findOne({
        _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](id)
    });
    return doc || null;
}
}),
"[project]/app/api/admin/import-supabase/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$supabase$2d$import$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/supabase-import.ts [app-route] (ecmascript)");
;
;
;
function serializeJob(job) {
    if (!job) return null;
    return {
        id: job._id?.toString?.() || job._id,
        status: job.status,
        phase: job.phase,
        started_at: job.started_at,
        finished_at: job.finished_at,
        current_table: job.current_table,
        total_rows: job.total_rows,
        tables: job.tables,
        auth_users: job.auth_users,
        error: job.error
    };
}
async function POST(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])(req);
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Forbidden"
        }, {
            status: 403
        });
    }
    try {
        const job = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$supabase$2d$import$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startImportJob"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            job: serializeJob(job)
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message || "import failed"
        }, {
            status: 400
        });
    }
}
async function GET(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])(req);
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Forbidden"
        }, {
            status: 403
        });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const job = id ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$supabase$2d$import$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getJobById"])(id) : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$supabase$2d$import$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getLatestJob"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        job: serializeJob(job)
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3ec504db._.js.map