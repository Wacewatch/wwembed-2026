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
"[project]/lib/mongo/shim.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Supabase-compatible fluent query shim backed by MongoDB.
 *
 * Exposes the chainable `.from(table).select(...).eq(...).single()` API
 * Supabase developers know, but executes everything against MongoDB.
 *
 * This lets the existing 28 Next.js API routes keep working without
 * a single line of business logic changing.
 *
 * Supported chain methods:
 *   select, insert, update, upsert, delete
 *   eq, neq, in, ilike, like, gt, gte, lt, lte, contains
 *   order, limit, range, single, maybeSingle
 *   then  (so it's awaitable like the real thing)
 *
 * Returns: { data, error } shape compatible with @supabase/supabase-js.
 */ __turbopack_context__.s([
    "MongoSupabaseClient",
    ()=>MongoSupabaseClient,
    "createMongoClient",
    ()=>createMongoClient
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
;
;
const COLL_USES_OBJECT_ID = {};
function maybeOid(value) {
    if (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) {
        try {
            return new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](value);
        } catch  {
            return value;
        }
    }
    return value;
}
/**
 * Build a Mongo filter for `eq("id", value)` style queries.
 * After Supabase migration:
 *   - rows have _id = ObjectId(uuidHex.slice(0,24))  AND  legacy_uuid = original UUID string
 *   - new rows (post-migration) have _id = fresh ObjectId, no legacy_uuid
 * So when value is a UUID we have to match either (_id derived from UUID) or legacy_uuid.
 */ function idFilter(value) {
    if (typeof value !== "string") return {
        _id: value
    };
    // 24-char hex → straight ObjectId
    if (/^[a-f0-9]{24}$/i.test(value)) {
        try {
            return {
                _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](value)
            };
        } catch  {
            return {
                _id: value
            };
        }
    }
    // 36-char UUID → match by legacy_uuid OR by computed ObjectId
    if (/^[0-9a-f-]{36}$/i.test(value)) {
        const hex = value.replace(/-/g, "").slice(0, 24).padEnd(24, "0");
        const ors = [
            {
                legacy_uuid: value
            }
        ];
        try {
            ors.push({
                _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](hex)
            });
        } catch  {}
        return {
            $or: ors
        };
    }
    return {
        _id: value
    };
}
function idArrayFilter(values) {
    // Build a $or with one branch per id
    const ors = [];
    const oidIds = [];
    const stringIds = [];
    const legacyUuids = [];
    for (const v of values){
        if (typeof v !== "string") {
            stringIds.push(v);
            continue;
        }
        if (/^[a-f0-9]{24}$/i.test(v)) {
            try {
                oidIds.push(new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](v));
            } catch  {
                stringIds.push(v);
            }
        } else if (/^[0-9a-f-]{36}$/i.test(v)) {
            legacyUuids.push(v);
            try {
                oidIds.push(new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](v.replace(/-/g, "").slice(0, 24).padEnd(24, "0")));
            } catch  {}
        } else {
            stringIds.push(v);
        }
    }
    const idIns = [
        ...oidIds,
        ...stringIds
    ];
    if (idIns.length) ors.push({
        _id: {
            $in: idIns
        }
    });
    if (legacyUuids.length) ors.push({
        legacy_uuid: {
            $in: legacyUuids
        }
    });
    return ors.length === 1 ? ors[0] : {
        $or: ors
    };
}
function normalizeDoc(doc) {
    if (!doc) return doc;
    const out = {
        ...doc
    };
    // Map _id → id, preferring legacy_uuid if present so foreign key joins with
    // post-migration data continue to work (FKs in migrated rows still reference
    // the original Supabase UUIDs, not the new ObjectIds).
    if (!out.id) {
        if (out.legacy_uuid) {
            out.id = out.legacy_uuid;
        } else if (out._id) {
            out.id = typeof out._id === "object" && out._id?.toString ? out._id.toString() : out._id;
        }
    }
    delete out._id;
    return out;
}
function projectionFromSelect(sel) {
    if (!sel || sel === "*" || sel.trim() === "") return undefined;
    // We don't bother applying projection in Mongo — we just keep all fields and
    // strip _id during normalization. Supabase's "select(...)" string is sometimes
    // complex (joins like "*, profiles:submitted_by(username)") that we can't fully
    // replicate. Returning all columns keeps callers happy.
    return undefined;
}
class SupabaseShimQuery {
    collectionName;
    mode;
    filters;
    orQueries;
    payload;
    selectStr;
    orders;
    limitN;
    skipN;
    isSingle;
    isMaybeSingle;
    upsertOnConflict;
    headOnly;
    countMode;
    constructor(collectionName){
        this.collectionName = collectionName;
        this.mode = "select";
        this.filters = {};
        this.orQueries = [];
        this.payload = null;
        this.orders = [];
        this.isSingle = false;
        this.isMaybeSingle = false;
        this.headOnly = false;
    }
    // ---- terminal-ish setters ----
    select(cols, opts) {
        // .select() after insert/update/upsert/delete is a RETURNING hint — keep
        // the original write mode, just remember the projection.
        if (this.mode === "select" || !this.payload && this.mode !== "delete") {
            this.mode = "select";
        }
        this.selectStr = cols;
        if (opts?.count) this.countMode = opts.count;
        if (opts?.head) this.headOnly = true;
        return this;
    }
    insert(values, opts) {
        this.mode = "insert";
        this.payload = Array.isArray(values) ? values : [
            values
        ];
        return this;
    }
    update(values) {
        this.mode = "update";
        this.payload = values;
        return this;
    }
    upsert(values, opts) {
        this.mode = "upsert";
        this.payload = Array.isArray(values) ? values : [
            values
        ];
        this.upsertOnConflict = opts?.onConflict;
        return this;
    }
    delete() {
        this.mode = "delete";
        return this;
    }
    // ---- filters ----
    eq(col, val) {
        if (col === "id") {
            Object.assign(this.filters, idFilter(val));
        } else {
            this.filters[col] = val;
        }
        return this;
    }
    neq(col, val) {
        if (col === "id") {
            // negate id filter — rare. Best effort: $nor on the same filter.
            this.filters.$nor = [
                ...this.filters.$nor || [],
                idFilter(val)
            ];
        } else {
            this.filters[col] = {
                $ne: val
            };
        }
        return this;
    }
    gt(col, val) {
        this.filters[col] = {
            ...this.filters[col] || {},
            $gt: val
        };
        return this;
    }
    gte(col, val) {
        this.filters[col] = {
            ...this.filters[col] || {},
            $gte: val
        };
        return this;
    }
    lt(col, val) {
        this.filters[col] = {
            ...this.filters[col] || {},
            $lt: val
        };
        return this;
    }
    lte(col, val) {
        this.filters[col] = {
            ...this.filters[col] || {},
            $lte: val
        };
        return this;
    }
    in(col, arr) {
        if (col === "id") {
            Object.assign(this.filters, idArrayFilter(arr));
        } else {
            this.filters[col] = {
                $in: arr
            };
        }
        return this;
    }
    is(col, val) {
        this.filters[col] = val;
        return this;
    }
    ilike(col, pattern) {
        const re = new RegExp(pattern.replace(/%/g, ".*"), "i");
        this.filters[col] = re;
        return this;
    }
    like(col, pattern) {
        const re = new RegExp(pattern.replace(/%/g, ".*"));
        this.filters[col] = re;
        return this;
    }
    contains(col, val) {
        this.filters[col] = {
            $all: Array.isArray(val) ? val : [
                val
            ]
        };
        return this;
    }
    not(col, op, val) {
        if (op === "is" && val === null) this.filters[col] = {
            $ne: null
        };
        else if (op === "eq") this.filters[col] = {
            $ne: val
        };
        else this.filters[col] = {
            $not: {
                [`$${op}`]: val
            }
        };
        return this;
    }
    or(filterStr) {
        // very minimal OR support: "field.op.value,field.op.value"
        const parts = filterStr.split(",");
        const ors = [];
        for (const p of parts){
            const [field, op, ...rest] = p.split(".");
            const value = rest.join(".");
            const f = {};
            if (op === "eq") f[field] = value;
            else if (op === "ilike") f[field] = new RegExp(value.replace(/%/g, ".*"), "i");
            else f[field] = value;
            ors.push(f);
        }
        this.orQueries.push({
            $or: ors
        });
        return this;
    }
    match(obj) {
        Object.assign(this.filters, obj);
        return this;
    }
    // ---- modifiers ----
    order(column, opts) {
        this.orders.push({
            column,
            ascending: opts?.ascending !== false
        });
        return this;
    }
    limit(n) {
        this.limitN = n;
        return this;
    }
    range(from, to) {
        this.skipN = from;
        this.limitN = to - from + 1;
        return this;
    }
    single() {
        this.isSingle = true;
        return this;
    }
    maybeSingle() {
        this.isMaybeSingle = true;
        return this;
    }
    // ---- execution ----
    buildFilter() {
        if (this.orQueries.length === 0) return this.filters;
        return {
            ...this.filters,
            $and: this.orQueries
        };
    }
    async _exec() {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const coll = db.collection(this.collectionName);
        try {
            if (this.mode === "select") {
                if (this.countMode || this.headOnly) {
                    const count = await coll.countDocuments(this.buildFilter());
                    return {
                        data: this.headOnly ? null : [],
                        error: null,
                        count
                    };
                }
                let cursor = coll.find(this.buildFilter());
                if (this.orders.length) {
                    const sort = {};
                    for (const o of this.orders)sort[o.column] = o.ascending ? 1 : -1;
                    cursor = cursor.sort(sort);
                }
                if (this.skipN) cursor = cursor.skip(this.skipN);
                if (this.limitN) cursor = cursor.limit(this.limitN);
                const docs = await cursor.toArray();
                const normalized = docs.map((d)=>normalizeDoc(d));
                if (this.isSingle) {
                    if (normalized.length === 0) return {
                        data: null,
                        error: {
                            message: "No rows",
                            code: "PGRST116"
                        }
                    };
                    if (normalized.length > 1) return {
                        data: null,
                        error: {
                            message: "Multiple rows"
                        }
                    };
                    return {
                        data: normalized[0],
                        error: null
                    };
                }
                if (this.isMaybeSingle) {
                    return {
                        data: normalized[0] || null,
                        error: null
                    };
                }
                return {
                    data: normalized,
                    error: null
                };
            }
            if (this.mode === "insert") {
                const tableTimeField = {
                    embed_views: "viewed_at",
                    link_clicks: "clicked_at",
                    ad_clicks: "clicked_at"
                };
                const timeField = tableTimeField[this.collectionName];
                const docs = this.payload.map((d)=>{
                    const out = {
                        ...d,
                        created_at: d.created_at || new Date().toISOString()
                    };
                    if (timeField && !out[timeField]) out[timeField] = out.created_at;
                    return out;
                });
                const res = await coll.insertMany(docs);
                const inserted = docs.map((d, i)=>normalizeDoc({
                        ...d,
                        _id: res.insertedIds[i]
                    }));
                // Side-effect: when recording an embed view or link click, also bump
                // the parent record's view_count / download_count for fast dashboard reads.
                if (this.collectionName === "embed_views") {
                    for (const doc of docs){
                        if (!doc.ww_id) continue;
                        await Promise.all([
                            db.collection("streaming_links").updateMany({
                                ww_id: doc.ww_id
                            }, {
                                $inc: {
                                    view_count: 1
                                }
                            }),
                            db.collection("digital_content").updateMany({
                                ww_id: doc.ww_id
                            }, {
                                $inc: {
                                    view_count: 1
                                }
                            })
                        ]);
                        if (doc.ww_id.startsWith("ww-live-")) {
                            const cid = doc.ww_id.slice("ww-live-".length);
                            await db.collection("live_tv_channels").updateMany(idFilter(cid), {
                                $inc: {
                                    view_count: 1
                                }
                            });
                        }
                    }
                } else if (this.collectionName === "link_clicks") {
                    for (const doc of docs){
                        if (!doc.ww_id) continue;
                        await Promise.all([
                            db.collection("download_links").updateMany({
                                ww_id: doc.ww_id
                            }, {
                                $inc: {
                                    click_count: 1
                                }
                            }),
                            db.collection("digital_download_links").updateMany({
                                ww_id: doc.ww_id
                            }, {
                                $inc: {
                                    click_count: 1
                                }
                            })
                        ]);
                    }
                }
                return {
                    data: this.isSingle ? inserted[0] : inserted,
                    error: null
                };
            }
            if (this.mode === "update") {
                const upd = {
                    ...this.payload,
                    updated_at: new Date().toISOString()
                };
                const res = await coll.findOneAndUpdate(this.buildFilter(), {
                    $set: upd
                }, {
                    returnDocument: "after"
                });
                if (this.isSingle) {
                    return {
                        data: res ? normalizeDoc(res) : null,
                        error: null
                    };
                }
                const updated = await coll.find(this.buildFilter()).toArray();
                return {
                    data: updated.map((d)=>normalizeDoc(d)),
                    error: null
                };
            }
            if (this.mode === "upsert") {
                const conflict = this.upsertOnConflict || "id";
                const conflictField = conflict === "id" ? "_id" : conflict;
                const results = [];
                for (const doc of this.payload){
                    let filter = {};
                    if (conflictField === "_id") {
                        const idVal = doc.id || doc._id;
                        filter = idVal ? idFilter(idVal) : {};
                    } else {
                        filter[conflictField] = doc[conflictField];
                    }
                    const res = await coll.findOneAndUpdate(filter, {
                        $set: {
                            ...doc,
                            updated_at: new Date().toISOString()
                        }
                    }, {
                        upsert: true,
                        returnDocument: "after"
                    });
                    results.push(res ? normalizeDoc(res) : null);
                }
                return {
                    data: this.isSingle ? results[0] : results,
                    error: null
                };
            }
            if (this.mode === "delete") {
                const res = await coll.deleteMany(this.buildFilter());
                return {
                    data: {
                        count: res.deletedCount
                    },
                    error: null
                };
            }
            return {
                data: null,
                error: {
                    message: "Unknown mode"
                }
            };
        } catch (e) {
            console.error("[mongo-shim] error", this.collectionName, e?.message);
            return {
                data: null,
                error: {
                    message: e?.message || "MongoDB error"
                }
            };
        }
    }
    // Awaitable
    then(onfulfilled, onrejected) {
        return this._exec().then(onfulfilled, onrejected);
    }
}
class MongoSupabaseClient {
    from(table) {
        return new SupabaseShimQuery(table);
    }
    async rpc(fnName, args = {}) {
        // Minimal RPC support — implement the known stored procs.
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        if (fnName === "increment_ad_clicks") {
            await db.collection("ads").updateOne(idFilter(args.ad_id), {
                $inc: {
                    click_count: 1
                }
            });
            return {
                data: null,
                error: null
            };
        }
        if (fnName === "increment_live_tv_views") {
            await db.collection("live_tv_channels").updateOne(idFilter(args.channel_id), {
                $inc: {
                    view_count: 1
                }
            });
            return {
                data: null,
                error: null
            };
        }
        return {
            data: null,
            error: {
                message: `Unknown RPC: ${fnName}`
            }
        };
    }
    // Auth namespace — implemented in lib/mongo/auth-shim.ts to keep this file lean
    auth = {
        getUser: async ()=>({
                data: {
                    user: null
                },
                error: null
            }),
        getSession: async ()=>({
                data: {
                    session: null
                },
                error: null
            }),
        signOut: async ()=>({
                error: null
            }),
        signInWithPassword: async ()=>({
                data: {
                    user: null,
                    session: null
                },
                error: {
                    message: "Use /api/auth/login"
                }
            }),
        signUp: async ()=>({
                data: {
                    user: null,
                    session: null
                },
                error: {
                    message: "Use /api/auth/register"
                }
            }),
        admin: {
            listUsers: async ()=>({
                    data: {
                        users: []
                    },
                    error: null
                }),
            deleteUser: async (id)=>{
                const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
                await db.collection("users").deleteOne(idFilter(id));
                return {
                    data: null,
                    error: null
                };
            }
        },
        onAuthStateChange: ()=>({
                data: {
                    subscription: {
                        unsubscribe: ()=>{}
                    }
                }
            })
    };
}
function createMongoClient() {
    return new MongoSupabaseClient();
}
}),
"[project]/lib/supabase/admin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Drop-in replacement: server-side admin client backed by MongoDB.
 * All `from(...).select().eq()...` calls keep working unchanged.
 */ __turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$shim$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/shim.ts [app-route] (ecmascript)");
;
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$shim$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createMongoClient"])();
}
}),
"[project]/lib/tmdb.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateWWId",
    ()=>generateWWId,
    "getBackdropUrl",
    ()=>getBackdropUrl,
    "getEpisodeDetails",
    ()=>getEpisodeDetails,
    "getMovieDetails",
    ()=>getMovieDetails,
    "getPosterUrl",
    ()=>getPosterUrl,
    "getSeasonDetails",
    ()=>getSeasonDetails,
    "getStillUrl",
    ()=>getStillUrl,
    "getTVDetails",
    ()=>getTVDetails,
    "parseWWId",
    ()=>parseWWId,
    "searchMedia",
    ()=>searchMedia
]);
const TMDB_API_KEY = process.env.TMDB_API_KEY || "demo";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
async function getMovieDetails(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
            next: {
                revalidate: 3600
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch  {
        return null;
    }
}
async function getTVDetails(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
            next: {
                revalidate: 3600
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch  {
        return null;
    }
}
async function getSeasonDetails(tmdbId, seasonNumber) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
            next: {
                revalidate: 3600
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch  {
        return null;
    }
}
async function getEpisodeDetails(tmdbId, seasonNumber, episodeNumber) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
            next: {
                revalidate: 3600
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch  {
        return null;
    }
}
function getPosterUrl(path, size = "w500") {
    if (!path) return "/abstract-movie-poster.png";
    return `https://image.tmdb.org/t/p/${size}${path}`;
}
function getBackdropUrl(path, size = "w1280") {
    if (!path) return "/movie-backdrop.png";
    return `https://image.tmdb.org/t/p/${size}${path}`;
}
function getStillUrl(path, size = "w500") {
    if (!path) return "/episode-still.jpg";
    return `https://image.tmdb.org/t/p/${size}${path}`;
}
async function searchMedia(query) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(query)}&page=1`, {
            next: {
                revalidate: 3600
            }
        });
        if (!res.ok) return [];
        const data = await res.json();
        // Filter only movies and TV shows
        return data.results.filter((r)=>r.media_type === "movie" || r.media_type === "tv").slice(0, 10).map((r)=>({
                id: r.id,
                title: r.title,
                name: r.name,
                media_type: r.media_type,
                poster_path: r.poster_path,
                release_date: r.release_date,
                first_air_date: r.first_air_date,
                vote_average: r.vote_average,
                overview: r.overview
            }));
    } catch  {
        return [];
    }
}
function generateWWId(mediaType, tmdbId, seasonNumber, episodeNumber) {
    let wwId = `ww-${mediaType}-${tmdbId}`;
    if (mediaType === "tv" && seasonNumber !== undefined && seasonNumber !== null) {
        wwId += `-s${seasonNumber}`;
        if (episodeNumber !== undefined && episodeNumber !== null) {
            wwId += `-e${episodeNumber}`;
        }
    }
    return wwId;
}
function parseWWId(wwId) {
    // Format: ww-movie-123456 or ww-tv-123456 or ww-tv-123456-s1 or ww-tv-123456-s1-e5
    const movieMatch = wwId.match(/^ww-movie-(\d+)$/);
    if (movieMatch) {
        return {
            mediaType: "movie",
            tmdbId: Number.parseInt(movieMatch[1], 10)
        };
    }
    const tvFullMatch = wwId.match(/^ww-tv-(\d+)(?:-s(\d+))?(?:-e(\d+))?$/);
    if (tvFullMatch) {
        return {
            mediaType: "tv",
            tmdbId: Number.parseInt(tvFullMatch[1], 10),
            seasonNumber: tvFullMatch[2] ? Number.parseInt(tvFullMatch[2], 10) : undefined,
            episodeNumber: tvFullMatch[3] ? Number.parseInt(tvFullMatch[3], 10) : undefined
        };
    }
    return null;
}
}),
"[project]/app/api/v1/streaming/[wwId]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tmdb.ts [app-route] (ecmascript)");
;
;
;
function generateRandomId(prefix = "x") {
    return prefix + Math.random().toString(36).substring(2, 10);
}
async function GET(request, props) {
    try {
        const params = await props.params;
        const { wwId } = params;
        if (!wwId) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Missing WW ID"
        }, {
            status: 400
        });
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseWWId"])(wwId);
        if (!parsed) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid WW ID format"
        }, {
            status: 400
        });
        const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed;
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        const AD_URL_1 = "https://otieu.com/4/9248013";
        const AD_URL_2 = "https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5";
        const tmdbData = mediaType === "movie" ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMovieDetails"])(tmdbId) : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTVDetails"])(tmdbId);
        let episodeData = null;
        if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
            episodeData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEpisodeDetails"])(tmdbId, seasonNumber, episodeNumber);
        }
        let title = tmdbData ? "title" in tmdbData ? tmdbData.title : tmdbData.name : "Unknown Media";
        if (episodeData) title = title + " - S" + seasonNumber + "E" + episodeNumber;
        let streamingQuery = supabase.from("streaming_links").select("*").eq("tmdb_id", tmdbId).eq("media_type", mediaType).eq("is_active", true).eq("status", "approved");
        if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
            streamingQuery = streamingQuery.eq("season_number", seasonNumber).eq("episode_number", episodeNumber);
        }
        const { data: userLinks } = await streamingQuery;
        const { data: apis } = await supabase.from("third_party_apis").select("*, language, is_anonymous").eq("api_type", "streaming").eq("is_active", true).order("priority", {
            ascending: true
        });
        let anonymousCounter = 0;
        const autoLinks = (apis || []).filter((api)=>mediaType === "movie" ? !!(api.url_pattern_movie || api.url_pattern) : !!api.url_pattern_tv).map((api)=>{
            const pattern = mediaType === "movie" ? api.url_pattern_movie || api.url_pattern || "" : api.url_pattern_tv || api.url_pattern || "";
            let url = pattern.replace(/{tmdb_id}/g, String(tmdbId)).replace(/{media_type}/g, mediaType);
            if (mediaType === "movie") {
                url = url.replace(/{season}/g, "").replace(/{episode}/g, "").replace(/{season_number}/g, "").replace(/{episode_number}/g, "");
            } else {
                url = url.replace(/{season}/g, String(seasonNumber || 1)).replace(/{episode}/g, String(episodeNumber || 1)).replace(/{season_number}/g, String(seasonNumber || 1)).replace(/{episode_number}/g, String(episodeNumber || 1));
            }
            url = url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/g, "");
            if (api.is_anonymous) anonymousCounter++;
            return {
                name: api.is_anonymous ? `Source #${anonymousCounter}` : api.name,
                url,
                quality: "HD",
                language: api.language || "VO",
                type: "api",
                source_type: null,
                sub: null
            };
        }).filter((link)=>link.url && link.url.length > 0);
        // allSources preserves original order (db first, then api) — this drives _idx / playback order
        const allSources = [
            ...(userLinks || []).map((l, i)=>({
                    name: l.source_name || "Source #" + (i + 1),
                    url: l.source_url,
                    quality: l.quality || "HD",
                    language: l.language || "VO",
                    type: "db",
                    source_type: l.source_type || null,
                    sub: l.subtitle || null
                })),
            ...autoLinks
        ];
        await supabase.from("embed_views").insert({
            ww_id: wwId,
            tmdb_id: tmdbId,
            media_type: mediaType,
            season_number: seasonNumber ?? null,
            episode_number: episodeNumber ?? null,
            embed_type: "streaming",
            referrer: request.headers.get("referer"),
            user_agent: request.headers.get("user-agent")
        });
        const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c");
        const ids = {
            overlay: generateRandomId("m"),
            progress: generateRandomId("g"),
            btnUnlock1: generateRandomId("u1"),
            btnUnlock2: generateRandomId("u2"),
            boxHelp: generateRandomId("bh"),
            boxThanks: generateRandomId("bk"),
            boxDone: generateRandomId("bd"),
            step1: generateRandomId("s1"),
            step2: generateRandomId("s2")
        };
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} - WWEMBED</title>
<style>
/* ── Reset & base ── */
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#fff;-webkit-font-smoothing:antialiased}

/* ── Layout ── */
.wrap{display:flex;flex-direction:column;height:100%;height:100dvh}

/* ── Header ── */
.hdr{
  display:flex;align-items:center;
  padding:0 12px;
  height:48px;min-height:48px;
  background:#151520;
  border-bottom:1px solid #222;
  gap:10px;
  flex-shrink:0;
}
.logo{font-weight:700;font-size:13px;color:#00d4aa;letter-spacing:.02em;flex-shrink:0;white-space:nowrap}
.ttl{
  flex:1;min-width:0;
  font-size:13px;font-weight:500;color:#ccc;
  text-align:center;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.top-right{display:flex;gap:7px;align-items:center;flex-shrink:0}

.src-btn{
  display:flex;align-items:center;gap:5px;
  padding:0 11px;height:34px;
  background:#00d4aa;border:none;border-radius:8px;
  color:#003d30;font-size:12px;font-weight:700;
  cursor:pointer;white-space:nowrap;flex-shrink:0;
  transition:opacity .15s;
}
.src-btn:active{opacity:.8}
.src-btn svg{width:14px;height:14px;flex-shrink:0}
.src-btn-text{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.bug-btn{
  display:flex;align-items:center;justify-content:center;
  width:34px;height:34px;
  background:#ef4444;border:none;border-radius:8px;
  color:#fff;font-size:15px;cursor:pointer;flex-shrink:0;
  transition:opacity .15s;
}
.bug-btn:active{opacity:.8}

/* ── Player ── */
.player{flex:1;background:#000;position:relative;overflow:hidden}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:14px}

/* ── Source sheet overlay ── */
.overlay{
  position:fixed;inset:0;
  background:rgba(0,0,0,.7);
  display:none;align-items:flex-end;justify-content:center;
  z-index:100;
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  /* safe area bottom */
  padding-bottom:env(safe-area-inset-bottom,0px);
}
.overlay.sh{display:flex}

.sheet{
  background:#13131f;
  border-radius:18px 18px 0 0;
  width:100%;max-width:760px;
  /* 90% of viewport height, never overflows */
  max-height:min(90vh,90dvh);
  display:flex;flex-direction:column;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.08);
  border-bottom:none;
  animation:slideUp .2s ease-out;
}
@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}

/* drag handle */
.sheet-handle{
  width:36px;height:4px;
  background:rgba(255,255,255,.15);
  border-radius:2px;
  margin:10px auto 0;
  flex-shrink:0;
}

/* ── Sheet header ── */
.sheet-hdr{
  padding:10px 16px 12px;
  border-bottom:1px solid rgba(255,255,255,.07);
  flex-shrink:0;
}
.sheet-top{
  display:flex;align-items:center;
  justify-content:space-between;
  margin-bottom:12px;
}
.sheet-ttl{font-size:15px;font-weight:700;color:#e8e8f0}
.src-count{font-size:11px;font-weight:500;color:#555;margin-left:7px}
.close-btn{
  width:28px;height:28px;border-radius:50%;
  background:rgba(255,255,255,.1);border:none;
  color:#aaa;cursor:pointer;font-size:18px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:background .15s;
}
.close-btn:hover{background:rgba(255,255,255,.18)}
.close-btn:active{background:rgba(255,255,255,.22)}

/* ── Language filters ── */
.filters{
  display:flex;gap:6px;
  flex-wrap:wrap;align-items:center;
  /* allow horizontal scroll on very small screens */
  overflow-x:auto;-webkit-overflow-scrolling:touch;
  scrollbar-width:none;padding-bottom:2px;
}
.filters::-webkit-scrollbar{display:none}
.filter-label{
  font-size:11px;color:#555;font-weight:600;
  margin-right:2px;flex-shrink:0;white-space:nowrap;
}
.filter-pill{
  padding:5px 12px;border-radius:20px;
  border:1px solid rgba(255,255,255,.1);
  background:transparent;color:#666;
  font-size:11px;font-weight:600;
  cursor:pointer;white-space:nowrap;flex-shrink:0;
  transition:all .15s;
}
.filter-pill:hover{border-color:rgba(255,255,255,.2);color:#aaa}
.filter-pill.act{background:#00d4aa;border-color:#00d4aa;color:#003d30}

/* ── Sheet body ── */
.sheet-body{
  padding:14px 14px 20px;
  overflow-y:auto;flex:1;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;
}
.sheet-body::-webkit-scrollbar{width:4px}
.sheet-body::-webkit-scrollbar-track{background:transparent}
.sheet-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}

/* ── Section labels ── */
.section-wrap{margin-bottom:18px}
.section-label{
  display:flex;align-items:center;gap:6px;
  font-size:10px;font-weight:700;color:#555;
  text-transform:uppercase;letter-spacing:.1em;
  margin-bottom:9px;padding-left:2px;
}
.section-label svg{width:12px;height:12px;opacity:.7;flex-shrink:0}
.section-count{
  background:rgba(255,255,255,.07);border-radius:4px;
  padding:1px 6px;font-size:9px;color:#555;
}

/* ── Source cards grid ──
   PC: 3 cols | tablet: 2 cols | mobile: 2 cols (≥300px each) | tiny: 1 col
── */
.src-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(clamp(140px,42%,240px),1fr));
  gap:8px;
}

/* ── Source card ── */
.card{
  background:#1a1a2e;
  border:1px solid rgba(255,255,255,.07);
  border-radius:11px;
  padding:12px 13px;
  cursor:pointer;
  transition:border-color .15s,background .15s;
  position:relative;overflow:hidden;
  /* prevent card shrinking too much */
  min-width:0;
}
.card:hover{border-color:rgba(0,212,170,.3);background:#1c1c35}
.card:active{background:#1c1c35;border-color:rgba(0,212,170,.4)}
.card.act{border-color:#00d4aa;background:#0d2420}
.card.act::before{
  content:'';position:absolute;top:0;left:0;right:0;
  height:2px;background:#00d4aa;
}

/* active checkmark */
.card-check{
  position:absolute;top:9px;right:9px;
  width:17px;height:17px;border-radius:50%;
  background:#00d4aa;display:none;
  align-items:center;justify-content:center;
  flex-shrink:0;
}
.card.act .card-check{display:flex}
.card-check svg{width:9px;height:9px;color:#003d30}

/* badge */
.card-badge{
  display:inline-flex;align-items:center;gap:3px;
  border-radius:5px;padding:2px 6px;
  margin-bottom:8px;
  font-size:10px;font-weight:700;letter-spacing:.01em;
  white-space:nowrap;
}
.badge-db{background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.22);color:#facc15}
.badge-dot-db{width:5px;height:5px;border-radius:50%;background:#facc15;flex-shrink:0}
.badge-api{background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.18);color:#00d4aa}
.badge-dot-api{width:5px;height:5px;border-radius:50%;background:#00d4aa;flex-shrink:0}

/* card name */
.card-name{
  font-size:12px;font-weight:600;color:#d0d0e8;
  margin-bottom:8px;line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden;
  padding-right:18px;/* space for checkmark */
}

/* metadata tags */
.card-meta{display:flex;gap:4px;flex-wrap:wrap}
.tag{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap}
.tag-q{background:rgba(124,58,237,.22);color:#a78bfa;border:1px solid rgba(124,58,237,.18)}
.tag-l{background:rgba(14,165,233,.18);color:#67d8f7;border:1px solid rgba(14,165,233,.14)}
.tag-sub{background:rgba(74,222,128,.14);color:#4ade80;border:1px solid rgba(74,222,128,.12)}
.tag-src{background:rgba(251,146,60,.14);color:#fb923c;border:1px solid rgba(251,146,60,.12)}
.tag-4k{background:rgba(250,204,21,.14);color:#facc15;border:1px solid rgba(250,204,21,.12)}

/* empty state */
.empty-state{text-align:center;padding:32px 16px;color:#444}
.empty-icon{font-size:32px;margin-bottom:8px}
.empty-txt{font-size:13px}

/* ── Bug modal ── */
.bug-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.88);
  display:none;align-items:center;justify-content:center;
  z-index:200;padding:16px;
}
.bug-overlay.sh{display:flex}
.bug-form{
  background:#1a1a28;border-radius:14px;padding:22px;
  max-width:480px;width:100%;
  border:1px solid rgba(255,255,255,.1);
  max-height:90vh;overflow-y:auto;
}
.bug-form h3{color:#00d4aa;margin-bottom:14px;font-size:15px;font-weight:700}
.form-group{margin-bottom:12px}
.form-group label{display:block;margin-bottom:5px;font-size:12px;color:#aaa;font-weight:500}
.form-group select,.form-group textarea{
  width:100%;background:#0f0f1a;
  border:1px solid rgba(255,255,255,.1);
  color:#fff;padding:9px;border-radius:8px;
  font-size:13px;font-family:inherit;
  -webkit-appearance:none;appearance:none;
}
.form-group textarea{min-height:76px;resize:vertical}
.bug-actions{display:flex;gap:9px;margin-top:14px}
.bug-actions button{
  flex:1;padding:10px;border:none;border-radius:8px;
  font-size:13px;font-weight:700;cursor:pointer;
}
.bug-submit{background:#00d4aa;color:#003d30}
.bug-cancel{background:rgba(255,255,255,.08);color:#ccc}

/* ── Ad modal ── */
.mo{
  position:fixed;inset:0;
  background:rgba(20,25,40,.88);
  display:none;align-items:center;justify-content:center;
  z-index:9999;padding:12px;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
}
.mo.sh{display:flex}
.mc{
  background:#1e2535;border:1px solid #2e3a50;border-radius:16px;
  padding:24px;max-width:400px;width:100%;
  text-align:center;
  box-shadow:0 20px 40px rgba(0,0,0,.35);
  max-height:90dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;
}
.mc h2{color:#dde4f0;margin-bottom:6px;font-size:20px;font-weight:700}
.mc-sub{color:#8894aa;font-size:13px;margin-bottom:14px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:14px}
.step{width:10px;height:10px;border-radius:50%;background:#2a3550;transition:all .3s}
.step.active{background:#667eea;transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:11px;margin:7px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px;min-width:18px}
.bx-content{flex:1;min-width:0}
.bx-content b{display:block;font-size:13px;margin-bottom:2px;color:#e2e8f0}
.bx-content span{font-size:12px;opacity:.65;display:block;word-break:break-word}
.bw{background:#272215;border:1px solid #40341a;color:#c9972e}
.bh{background:#271520;border:1px solid #402030;color:#b06890}
.bi{background:#1e1a2e;border:1px solid #302848;color:#8a7ab8}
.bo{background:#152218;border:1px solid #1e3a22;color:#3dba6a}
.pb{height:4px;background:#2e3a50;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width .3s;border-radius:3px}
.bt{
  width:100%;padding:12px;border:none;border-radius:10px;
  font-size:14px;font-weight:700;cursor:pointer;
  margin-top:7px;text-transform:uppercase;letter-spacing:.5px;
  transition:opacity .15s;text-decoration:none;
  display:block;text-align:center;
}
.bt:active{opacity:.85}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bp2{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff}
.hi{display:none}
.cf{margin-top:10px;font-size:11px;color:#4a5570}
.cf a{color:#667eea;text-decoration:none}
.adtag{background:#2a3550;color:#8ba3d4;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:5px;font-weight:600}
.adtag2{background:#2a3550;color:#f87171;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:5px;font-weight:600}

/* ────────────────────────────────────────────────────────────
   RESPONSIVE BREAKPOINTS
   We rely on clamp() in .src-grid for columns so fewer overrides needed.
   ──────────────────────────────────────────────────────────── */

/* ── Large desktop (≥900px): wider sheet, 3+ columns feel natural via auto-fill ── */
@media(min-width:900px){
  .sheet{max-height:min(85vh,85dvh)}
  .sheet-hdr{padding:12px 20px 14px}
  .sheet-body{padding:16px 18px 24px}
  .card{padding:14px 15px;border-radius:12px}
  .card-name{font-size:13px}
  .card-badge{font-size:10px}
  .tag{font-size:10px}
}

/* ── Tablet (480px–899px): mostly fine with defaults ── */

/* ── Mobile (≤479px) ── */
@media(max-width:479px){
  .hdr{height:44px;min-height:44px;padding:0 10px;gap:8px}
  .ttl{font-size:12px}
  .src-btn{padding:0 9px;height:32px;font-size:11px;gap:4px;border-radius:7px}
  .src-btn svg{width:13px;height:13px}
  .bug-btn{width:32px;height:32px;font-size:14px;border-radius:7px}

  .sheet{max-height:min(92vh,92dvh);border-radius:16px 16px 0 0}
  .sheet-hdr{padding:8px 13px 11px}
  .sheet-ttl{font-size:14px}
  .sheet-body{padding:11px 11px 18px}
  .src-grid{gap:7px}
  .card{padding:10px 11px;border-radius:10px}
  .card-name{font-size:11px;margin-bottom:7px}
  .card-badge{font-size:9px;padding:2px 5px;margin-bottom:7px}
  .tag{font-size:9px;padding:2px 5px}
  .card-check{width:16px;height:16px;top:8px;right:8px}
  .card-check svg{width:8px;height:8px}
  .filter-pill{padding:4px 10px;font-size:11px}

  .mc{padding:18px;border-radius:13px}
  .mc h2{font-size:17px}
  .mc-sub{font-size:12px;margin-bottom:11px}
  .bx{padding:9px;gap:7px;margin:5px 0;border-radius:8px}
  .bx svg{width:16px;height:16px;min-width:16px}
  .bx-content b{font-size:12px}
  .bx-content span{font-size:11px}
  .bt{padding:11px;font-size:13px;border-radius:9px;margin-top:6px}
  .pb{margin:10px 0}
  .steps{margin-bottom:11px}
  .cf{font-size:10px;margin-top:9px}
  .bug-form{padding:16px;border-radius:11px}
}

/* ── Very small (≤360px): 1-col cards, icon-only src button ── */
@media(max-width:360px){
  .src-grid{grid-template-columns:1fr}
  .src-btn-text{display:none}
  .src-btn{padding:0 8px}
  .mc{padding:14px}
  .mc h2{font-size:15px}
  .bx-content b{font-size:11px}
  .bt{font-size:12px;padding:10px;letter-spacing:.2px}
  .adtag,.adtag2{display:none}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="logo">▶ WW</div>
    <div class="ttl">${title}</div>
    <div class="top-right">
      <button class="src-btn" id="srcBtn" onclick="openSheet()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span class="src-btn-text" id="srcLabel">Source #1</span>
      </button>
      <button class="bug-btn" id="bugBtn" onclick="openBug()" title="Signaler un problème">🐛</button>
    </div>
  </div>
  <div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<!-- Source selector sheet -->
<div class="overlay" id="overlay" onclick="onOverlayClick(event)">
  <div class="sheet" id="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-hdr">
      <div class="sheet-top">
        <div>
          <span class="sheet-ttl">Choisir un lecteur</span>
          <span class="src-count" id="srcCount"></span>
        </div>
        <button class="close-btn" onclick="closeSheet()" aria-label="Fermer">×</button>
      </div>
      <div class="filters" id="filtersRow">
        <span class="filter-label">Langue</span>
      </div>
    </div>
    <div class="sheet-body" id="sheetBody"></div>
  </div>
</div>

<!-- Bug report modal -->
<div class="bug-overlay" id="bugOverlay">
  <div class="bug-form">
    <h3>🐛 Signaler un problème</h3>
    <div class="form-group">
      <label>Type de problème</label>
      <select id="bugType">
        <option value="ne_charge_pas">Ne charge pas</option>
        <option value="qualite_mauvaise">Qualité mauvaise</option>
        <option value="audio_desync">Audio désynchronisé</option>
        <option value="sous_titres">Problème sous-titres</option>
        <option value="autre">Autre</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description (optionnel)</label>
      <textarea id="bugDesc" placeholder="Décrivez le problème..."></textarea>
    </div>
    <div class="bug-actions">
      <button class="bug-cancel" onclick="closeBug()">Annuler</button>
      <button class="bug-submit" onclick="submitBug()">Envoyer</button>
    </div>
  </div>
</div>

<!-- Ad modal -->
<div class="mo" id="${ids.overlay}">
  <div class="mc">
    <h2>Accéder au lecteur</h2>
    <div class="mc-sub">Deux étapes pour débloquer le contenu</div>
    <div class="steps">
      <div class="step active" id="${ids.step1}"></div>
      <div class="step" id="${ids.step2}"></div>
    </div>
    <div class="bx bw">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
    </div>
    <div class="bx bh" id="${ids.boxHelp}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
    </div>
    <div class="bx bi" id="${ids.boxThanks}" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="bx-content"><b>Étape 1 validée !</b><span>Cliquez sur le 2ème bouton pour continuer</span></div>
    </div>
    <div class="bx bo" id="${ids.boxDone}" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour lancer le lecteur</span></div>
    </div>
    <div class="pb"><div class="pf" id="${ids.progress}"></div></div>
    <button class="bt bp" id="${ids.btnUnlock1}">ÉTAPE 1 / 2<span class="adtag">PUB</span></button>
    <button class="bt bp2 hi" id="${ids.btnUnlock2}">ÉTAPE 2 / 2<span class="adtag2">PUB</span></button>
    <div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
  </div>
</div>

<script>
(function(){
/* ── Data ──
   _src  = original array (preserves server order → drives _idx / playback)
   In the sheet UI: db sources are rendered first (top), then api sources.
   But _idx always references the position in _src, so playback order = server order.
── */
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _adStep=0;
var _currentLang="all";
var _ids=${JSON.stringify(ids)};

function $$(id){return document.getElementById(id);}

/* ── Language list (preserves original order) ── */
function getLanguages(){
  var langs=[],seen={};
  for(var i=0;i<_src.length;i++){
    var l=(_src[i].language||"").trim();
    if(l&&!seen[l]){seen[l]=1;langs.push(l);}
  }
  return langs;
}

/* ── Filter pills ── */
function buildFilters(){
  var row=$$("filtersRow");
  var langs=getLanguages();
  // rebuild
  row.innerHTML='<span class="filter-label">Langue</span>';

  var allPill=document.createElement("button");
  allPill.className="filter-pill act";
  allPill.textContent="Toutes";
  allPill.setAttribute("data-lang","all");
  allPill.onclick=function(){setLang("all");};
  row.appendChild(allPill);

  langs.forEach(function(lang){
    var pill=document.createElement("button");
    pill.className="filter-pill";
    pill.textContent=lang;
    pill.setAttribute("data-lang",lang);
    pill.onclick=function(){setLang(lang);};
    row.appendChild(pill);
  });
}

function setLang(lang){
  _currentLang=lang;
  document.querySelectorAll(".filter-pill").forEach(function(p){
    p.classList.toggle("act",p.getAttribute("data-lang")===lang);
  });
  renderGrid();
}

/* ── Render grid
   Visual order: db sources first, then api sources.
   Each card stores the ORIGINAL index from _src so _idx stays consistent.
── */
function renderGrid(){
  var body=$$("sheetBody");

  var filtered=_src.map(function(s,i){return{s:s,i:i};}).filter(function(o){
    return _currentLang==="all"||(o.s.language||"")=== _currentLang;
  });

  var dbItems=filtered.filter(function(o){return o.s.type==="db";});
  var apiItems=filtered.filter(function(o){return o.s.type!=="db";});

  $$("srcCount").textContent=filtered.length+" source"+(filtered.length>1?"s":"");

  if(filtered.length===0){
    body.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-txt">Aucune source disponible pour cette langue</div></div>';
    return;
  }

  var html="";

  /* ── Direct / embed sources (db) on top ── */
  if(dbItems.length>0){
    html+='<div class="section-wrap">';
    html+='<div class="section-label">';
    html+='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
    html+='Sources directes<span class="section-count">'+dbItems.length+'</span></div>';
    html+='<div class="src-grid">';
    dbItems.forEach(function(o){html+=renderCard(o.s,o.i);});
    html+='</div></div>';
  }

  /* ── External / api sources below ── */
  if(apiItems.length>0){
    html+='<div class="section-wrap">';
    html+='<div class="section-label">';
    html+='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    html+='Sources externes<span class="section-count">'+apiItems.length+'</span></div>';
    html+='<div class="src-grid">';
    apiItems.forEach(function(o){html+=renderCard(o.s,o.i);});
    html+='</div></div>';
  }

  body.innerHTML=html;

  body.querySelectorAll(".card").forEach(function(card){
    card.onclick=function(){
      selectSource(parseInt(card.getAttribute("data-idx"),10));
    };
  });
}

function renderCard(s,idx){
  var isAct=idx===_idx;
  var qualityTag=s.quality==="4K"
    ?'<span class="tag tag-4k">4K</span>'
    :(s.quality?'<span class="tag tag-q">'+s.quality+'</span>':"");
  var langTag=s.language?'<span class="tag tag-l">'+s.language+'</span>':"";
  var subTag=s.sub?'<span class="tag tag-sub">Sub '+s.sub+'</span>':"";
  var srcTag=s.source_type?'<span class="tag tag-src">'+s.source_type+'</span>':"";

  var badgeHtml=s.type==="db"
    ?'<div class="card-badge badge-db"><span class="badge-dot-db"></span>Direct</div>'
    :'<div class="card-badge badge-api"><span class="badge-dot-api"></span>Externe</div>';

  return '<div class="card'+(isAct?' act':'')+'" data-idx="'+idx+'">'
    +'<div class="card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +badgeHtml
    +'<div class="card-name" title="'+escHtml(s.name)+'">'+escHtml(s.name)+'</div>'
    +'<div class="card-meta">'+qualityTag+langTag+subTag+srcTag+'</div>'
    +'</div>';
}

function escHtml(str){
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function selectSource(i){
  _idx=i;
  var s=_src[i];
  var lbl=$$("srcLabel");
  if(lbl) lbl.textContent=s.name;
  closeSheet();
  if(_started) loadPlayer();
}

/* ── Player ── */
function loadPlayer(){
  var p=$$("player");
  if(!p||!_src.length) return;
  var s=_src[_idx];
  if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
  p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen;picture-in-picture"></iframe>';
  fetch("/api/embed-click",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({wwId:"${wwId}",tmdbId:${tmdbId},mediaType:"${mediaType}",
      seasonNumber:${seasonNumber ?? null},episodeNumber:${episodeNumber ?? null},
      sourceName:s.name,sourceType:s.type})
  }).catch(function(){});
}

/* ── Sheet ── */
window.openSheet=function(){
  buildFilters();
  renderGrid();
  $$("overlay").classList.add("sh");
  document.body.style.overflow="hidden";
};
window.closeSheet=function(){
  $$("overlay").classList.remove("sh");
  document.body.style.overflow="";
};
window.onOverlayClick=function(e){
  if(e.target===$$("overlay")) closeSheet();
};

/* ── Bug report ── */
window.openBug=function(){$$("bugOverlay").classList.add("sh");};
window.closeBug=function(){$$("bugOverlay").classList.remove("sh");};
window.submitBug=async function(){
  var type=$$("bugType").value;
  var desc=$$("bugDesc").value;
  try{
    await fetch("/api/bug-report",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        ww_id:"${wwId}",tmdb_id:${tmdbId},media_type:"${mediaType}",
        season_number:${seasonNumber ?? null},episode_number:${episodeNumber ?? null},
        title:"${title.replace(/"/g, '\\"')}",
        source_name:(_src[_idx]&&_src[_idx].name)||"Source #1",
        source_url:(_src[_idx]&&_src[_idx].url)||"",
        message:type+(desc?" - "+desc:""),embed_type:"streaming"
      })
    });
    closeBug();
    alert("Merci pour votre signalement !");
    $$("bugDesc").value="";
  }catch(e){alert("Erreur lors de l'envoi");}
};

/* ── Ad modal ── */
function showAdModal(){
  _adStep=0;
  $$(_ids.step1).className="step active";
  $$(_ids.step2).className="step";
  $$(_ids.progress).style.width="0%";
  $$(_ids.btnUnlock1).classList.remove("hi");
  $$(_ids.btnUnlock2).classList.add("hi");
  $$(_ids.boxHelp).style.display="";
  $$(_ids.boxThanks).style.display="none";
  $$(_ids.boxDone).style.display="none";
  $$(_ids.overlay).classList.add("sh");
}

$$(_ids.btnUnlock1).onclick=function(){
  if(_adStep>=1) return;
  _adStep=1;
  var a=document.createElement("a");a.href="${AD_URL_1}";a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  $$(_ids.step1).className="step done";
  $$(_ids.step2).className="step active";
  $$(_ids.progress).style.width="50%";
  $$(_ids.btnUnlock1).classList.add("hi");
  $$(_ids.btnUnlock2).classList.remove("hi");
  $$(_ids.boxHelp).style.display="none";
  $$(_ids.boxThanks).style.display="";
};

$$(_ids.btnUnlock2).onclick=function(){
  if(_adStep>=2) return;
  _adStep=2;
  var a=document.createElement("a");a.href="${AD_URL_2}";a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  $$(_ids.step2).className="step done";
  $$(_ids.progress).style.width="100%";
  $$(_ids.btnUnlock2).classList.add("hi");
  $$(_ids.boxThanks).style.display="none";
  $$(_ids.boxDone).style.display="";
  setTimeout(function(){
    if(!_started){
      _started=true;
      $$(_ids.overlay).classList.remove("sh");
      if(_src.length){
        var lbl=$$("srcLabel");
        if(lbl) lbl.textContent=_src[0].name;
        loadPlayer();
      }
    }
  },300);
};

/* ── Init ── */
if(_src.length){var lbl=$$("srcLabel");if(lbl) lbl.textContent=_src[0].name;}
showAdModal();
})();
</script>
</body>
</html>`;
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        });
    } catch (error) {
        console.error("Streaming error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1f5d5a04._.js.map