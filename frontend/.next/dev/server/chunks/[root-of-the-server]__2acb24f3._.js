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
"[project]/lib/embed-ad-modal.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Unified 2-step ad modal for all embed routes.
 *
 * Public API (server-side, returns CSS / HTML / JS strings to inline):
 *   buildAdModal2Step({ variant, ad1, ad2, title, subtitle, doneText, finalBtnLabel, autoShow })
 *     → { css, html, js, ids }
 *
 * Client-side (after the JS is injected):
 *   window._wwAdModal.show(payload, onComplete)
 *     - payload: any value passed back to onComplete after both ads are clicked
 *     - onComplete: function(payload) executed once the user finishes step 2
 *
 * Variants change the OVERLAY background color so each section keeps its identity:
 *   - "streaming" → dark blue (existing streaming look)
 *   - "download"  → purple/violet gradient (existing download look)
 *   - "livetv"    → orange gradient
 */ __turbopack_context__.s([
    "buildAdModal2Step",
    ()=>buildAdModal2Step,
    "genAdModalIds",
    ()=>genAdModalIds
]);
function rid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 10);
}
function genAdModalIds() {
    return {
        overlay: rid("ov"),
        step1: rid("s1"),
        step2: rid("s2"),
        btnUnlock1: rid("u1"),
        btnUnlock2: rid("u2"),
        btnFinal: rid("uf"),
        boxHelp: rid("bh"),
        boxThanks: rid("bk"),
        boxDone: rid("bd"),
        progress: rid("pg")
    };
}
const VARIANTS = {
    streaming: {
        overlayBg: "background:rgba(20,25,40,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
        cardBg: "#1e2535",
        cardBorder: "#2e3a50",
        titleColor: "#dde4f0",
        subColor: "#8894aa",
        stepBg: "#2a3550",
        stepActive: "#667eea",
        bp1: "linear-gradient(135deg,#667eea,#764ba2)",
        bp2: "linear-gradient(135deg,#f59e0b,#ef4444)",
        cfColor: "#4a5570",
        cfLink: "#667eea",
        tagBg: "background:#2a3550;color:#8ba3d4",
        tag2Bg: "background:#2a3550;color:#f87171",
        bw: "background:#272215;border:1px solid #40341a;color:#c9972e",
        bh: "background:#271520;border:1px solid #402030;color:#b06890",
        bi: "background:#1e1a2e;border:1px solid #302848;color:#8a7ab8",
        bo: "background:#152218;border:1px solid #1e3a22;color:#3dba6a"
    },
    download: {
        overlayBg: "background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
        cardBg: "#ffffff",
        cardBorder: "rgba(0,0,0,0.06)",
        titleColor: "#1a1a2e",
        subColor: "#6b7280",
        stepBg: "#e5e7eb",
        stepActive: "#667eea",
        bp1: "linear-gradient(135deg,#667eea,#764ba2)",
        bp2: "linear-gradient(135deg,#f59e0b,#ef4444)",
        cfColor: "#9ca3af",
        cfLink: "#667eea",
        tagBg: "background:#fff;color:#667eea",
        tag2Bg: "background:#fff;color:#ef4444",
        bw: "background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e",
        bh: "background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d",
        bi: "background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6",
        bo: "background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46"
    },
    livetv: {
        overlayBg: "background:linear-gradient(135deg,rgba(251,146,60,0.95),rgba(234,88,12,0.95));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
        cardBg: "#ffffff",
        cardBorder: "rgba(0,0,0,0.06)",
        titleColor: "#1a1a2e",
        subColor: "#6b7280",
        stepBg: "#e5e7eb",
        stepActive: "#ea580c",
        bp1: "linear-gradient(135deg,#fb923c,#ea580c)",
        bp2: "linear-gradient(135deg,#dc2626,#991b1b)",
        cfColor: "#9ca3af",
        cfLink: "#ea580c",
        tagBg: "background:#fff;color:#ea580c",
        tag2Bg: "background:#fff;color:#dc2626",
        bw: "background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e",
        bh: "background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d",
        bi: "background:linear-gradient(135deg,#ffedd5,#fed7aa);border:1px solid #ea580c;color:#9a3412",
        bo: "background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46"
    }
};
function buildAdModal2Step(opts) {
    const ids = opts.ids || genAdModalIds();
    const v = VARIANTS[opts.variant];
    const showFinal = opts.showFinalBtn;
    // ── CSS ──────────────────────────────────────────────────────────────────
    // Scoped via #${ids.overlay} so multiple modals with different variants
    // would not collide if ever rendered on the same page. We still expose the
    // generic .mo / .mc / .step / .bt / .bx classes inside the overlay only.
    const css = `
#${ids.overlay}{position:fixed;inset:0;${v.overlayBg};display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;overflow-y:auto}
#${ids.overlay}.sh{display:flex}
#${ids.overlay} .ww-mc{background:${v.cardBg};border:1px solid ${v.cardBorder};border-radius:16px;padding:22px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,.35);max-height:min(90vh,90dvh);overflow-y:auto;-webkit-overflow-scrolling:touch;margin:auto}
#${ids.overlay} .ww-mc h2{color:${v.titleColor};margin:0 0 6px;font-size:20px;font-weight:700;line-height:1.25}
#${ids.overlay} .ww-mc-sub{color:${v.subColor};font-size:13px;margin-bottom:14px}
#${ids.overlay} .ww-steps{display:flex;justify-content:center;gap:8px;margin-bottom:14px}
#${ids.overlay} .ww-step{width:10px;height:10px;border-radius:50%;background:${v.stepBg};transition:all .3s}
#${ids.overlay} .ww-step.active{background:${v.stepActive};transform:scale(1.2)}
#${ids.overlay} .ww-step.done{background:#10b981}
#${ids.overlay} .ww-bx{border-radius:10px;padding:11px;margin:7px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
#${ids.overlay} .ww-bx svg{flex-shrink:0;width:18px;height:18px;min-width:18px}
#${ids.overlay} .ww-bx-c{flex:1;min-width:0}
#${ids.overlay} .ww-bx-c b{display:block;font-size:13px;margin-bottom:2px;line-height:1.25}
#${ids.overlay} .ww-bx-c span{font-size:12px;opacity:.85;display:block;word-break:break-word;line-height:1.35}
#${ids.overlay} .ww-bw{${v.bw}}
#${ids.overlay} .ww-bh{${v.bh}}
#${ids.overlay} .ww-bi{${v.bi}}
#${ids.overlay} .ww-bo{${v.bo}}
#${ids.overlay} .ww-pb{height:4px;background:${v.stepBg};border-radius:3px;margin:12px 0;overflow:hidden}
#${ids.overlay} .ww-pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width .3s;border-radius:3px}
#${ids.overlay} .ww-bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:7px;text-transform:uppercase;letter-spacing:.5px;transition:opacity .15s,transform .15s;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px}
#${ids.overlay} .ww-bt:active{opacity:.85;transform:translateY(1px)}
#${ids.overlay} .ww-bp1{background:${v.bp1};color:#fff}
#${ids.overlay} .ww-bp2{background:${v.bp2};color:#fff}
#${ids.overlay} .ww-bg{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
#${ids.overlay} .ww-hi{display:none !important}
#${ids.overlay} .ww-cf{margin-top:10px;font-size:11px;color:${v.cfColor}}
#${ids.overlay} .ww-cf a{color:${v.cfLink};text-decoration:none}
#${ids.overlay} .ww-tag{${v.tagBg};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
#${ids.overlay} .ww-tag2{${v.tag2Bg};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
@media(max-width:479px){
  #${ids.overlay}{padding:8px}
  #${ids.overlay} .ww-mc{padding:16px;border-radius:14px}
  #${ids.overlay} .ww-mc h2{font-size:17px}
  #${ids.overlay} .ww-mc-sub{font-size:12px;margin-bottom:11px}
  #${ids.overlay} .ww-bx{padding:9px;gap:8px;border-radius:9px}
  #${ids.overlay} .ww-bt{padding:11px;font-size:13px;border-radius:9px}
}
@media(max-width:360px){
  #${ids.overlay} .ww-mc{padding:14px}
  #${ids.overlay} .ww-bt{padding:10px;font-size:12px}
}
`.trim();
    // ── HTML ─────────────────────────────────────────────────────────────────
    const finalBtnHtml = showFinal ? `<button class="ww-bt ww-bg ww-hi" id="${ids.btnFinal}">${opts.finalBtnLabel}</button>` : "";
    const html = `
<div id="${ids.overlay}">
  <div class="ww-mc">
    <h2>${opts.title}</h2>
    <div class="ww-mc-sub">${opts.subtitle}</div>
    <div class="ww-steps">
      <div class="ww-step active" id="${ids.step1}"></div>
      <div class="ww-step" id="${ids.step2}"></div>
    </div>
    <div class="ww-bx ww-bw">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div class="ww-bx-c"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
    </div>
    <div class="ww-bx ww-bh" id="${ids.boxHelp}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div class="ww-bx-c"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
    </div>
    <div class="ww-bx ww-bi ww-hi" id="${ids.boxThanks}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="ww-bx-c"><b>Étape 1 validée !</b><span>Cliquez sur le 2ème bouton pour continuer</span></div>
    </div>
    <div class="ww-bx ww-bo ww-hi" id="${ids.boxDone}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="ww-bx-c"><b>Tout est prêt !</b><span>${opts.doneText}</span></div>
    </div>
    <div class="ww-pb"><div class="ww-pf" id="${ids.progress}"></div></div>
    <button class="ww-bt ww-bp1" id="${ids.btnUnlock1}">ÉTAPE 1 / 2<span class="ww-tag">PUB</span></button>
    <button class="ww-bt ww-bp2 ww-hi" id="${ids.btnUnlock2}">ÉTAPE 2 / 2<span class="ww-tag2">PUB</span></button>
    ${finalBtnHtml}
    <div class="ww-cf">Propulsé par <a href="https://wavewatch.top" target="_blank">WaveWatch</a></div>
  </div>
</div>
`.trim();
    // ── JS ───────────────────────────────────────────────────────────────────
    const autoShowJs = opts.autoShow ? `try{window._wwAdModal.show(null, ${opts.defaultOnComplete || "null"});}catch(e){}` : "";
    const finalBlockJs = showFinal ? `
        var bf=document.getElementById(_ids.btnFinal);
        if(bf){bf.classList.remove("ww-hi");bf.onclick=function(){
          document.getElementById(_ids.overlay).classList.remove("sh");
          if(typeof _onComp==="function"){var p=_payload;_payload=null;var c=_onComp;_onComp=null;c(p);}
          else{_payload=null;_onComp=null;}
        };}` : `
        setTimeout(function(){
          document.getElementById(_ids.overlay).classList.remove("sh");
          if(typeof _onComp==="function"){var p=_payload;_payload=null;var c=_onComp;_onComp=null;c(p);}
          else{_payload=null;_onComp=null;}
        },350);`;
    const js = `
window._wwAdModal=(function(){
  var _ids=${JSON.stringify(ids)};
  var _payload=null,_onComp=null,_adStep=0;
  function $$(id){return document.getElementById(id);}
  function _openAd(url){
    if(!url)return;
    var a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }
  function show(payload,onComplete){
    _payload=(typeof payload==="undefined")?null:payload;
    _onComp=(typeof onComplete==="function")?onComplete:null;
    _adStep=0;
    var s1=$$(_ids.step1),s2=$$(_ids.step2);
    if(s1)s1.className="ww-step active";
    if(s2)s2.className="ww-step";
    var pr=$$(_ids.progress);if(pr)pr.style.width="0%";
    var b1=$$(_ids.btnUnlock1),b2=$$(_ids.btnUnlock2),bf=$$(_ids.btnFinal);
    if(b1)b1.classList.remove("ww-hi");
    if(b2)b2.classList.add("ww-hi");
    if(bf)bf.classList.add("ww-hi");
    var bh=$$(_ids.boxHelp),bk=$$(_ids.boxThanks),bd=$$(_ids.boxDone);
    if(bh)bh.classList.remove("ww-hi");
    if(bk)bk.classList.add("ww-hi");
    if(bd)bd.classList.add("ww-hi");
    var ov=$$(_ids.overlay);if(ov)ov.classList.add("sh");
  }
  var _b1=$$(_ids.btnUnlock1);
  if(_b1){_b1.onclick=function(){
    if(_adStep>=1)return;
    _adStep=1;
    _openAd(${JSON.stringify(opts.ad1)});
    var s1=$$(_ids.step1),s2=$$(_ids.step2);
    if(s1)s1.className="ww-step done";
    if(s2)s2.className="ww-step active";
    var pr=$$(_ids.progress);if(pr)pr.style.width="50%";
    _b1.classList.add("ww-hi");
    var b2=$$(_ids.btnUnlock2);if(b2)b2.classList.remove("ww-hi");
    var bh=$$(_ids.boxHelp);if(bh)bh.classList.add("ww-hi");
    var bk=$$(_ids.boxThanks);if(bk)bk.classList.remove("ww-hi");
  };}
  var _b2=$$(_ids.btnUnlock2);
  if(_b2){_b2.onclick=function(){
    if(_adStep>=2)return;
    _adStep=2;
    _openAd(${JSON.stringify(opts.ad2)});
    var s2=$$(_ids.step2);if(s2)s2.className="ww-step done";
    var pr=$$(_ids.progress);if(pr)pr.style.width="100%";
    _b2.classList.add("ww-hi");
    var bk=$$(_ids.boxThanks);if(bk)bk.classList.add("ww-hi");
    var bd=$$(_ids.boxDone);if(bd)bd.classList.remove("ww-hi");
    ${finalBlockJs}
  };}
  return {show:show};
})();
${autoShowJs}
`.trim();
    return {
        ids,
        css,
        html,
        js
    };
}
}),
"[project]/app/api/v1/download/[wwId]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tmdb.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$embed$2d$ad$2d$modal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/embed-ad-modal.ts [app-route] (ecmascript)");
;
;
;
;
function generateRandomId(prefix = "x") {
    return prefix + Math.random().toString(36).substring(2, 10);
}
async function GET(request, { params }) {
    const { wwId } = await params;
    // ============================================
    // DECODE PROXY — forward l'IP user au worker
    // ============================================
    const decodeId = request.nextUrl.searchParams.get("decode");
    const titleId = request.nextUrl.searchParams.get("title_id") || "";
    if (decodeId) {
        const userIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
        const workerUrl = `https://still-wood-a206.wavewatchcontact.workers.dev/https://api.movix.cash/api/darkiworld/decode/${decodeId}?title_id=${titleId}`;
        try {
            const resp = await fetch(workerUrl, {
                headers: {
                    "X-Forwarded-For": userIp,
                    "X-Real-IP": userIp
                }
            });
            const data = await resp.json();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
        } catch  {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "decode_failed"
            }, {
                status: 500
            });
        }
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const isDigitalContent = wwId.startsWith("ww-ebook-") || wwId.startsWith("ww-music-") || wwId.startsWith("ww-software-") || wwId.startsWith("ww-soft-") || wwId.startsWith("ww-game-");
    // ============================================
    // DIGITAL CONTENT DOWNLOAD
    // ============================================
    if (isDigitalContent) {
        let digitalContent = null;
        const { data: content1 } = await supabase.from("digital_content").select("*").eq("ww_id", wwId).single();
        if (content1) {
            digitalContent = content1;
        } else if (wwId.startsWith("ww-soft-")) {
            const alternateWwId = wwId.replace("ww-soft-", "ww-software-");
            const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single();
            if (content2) digitalContent = content2;
        } else if (wwId.startsWith("ww-software-")) {
            const alternateWwId = wwId.replace("ww-software-", "ww-soft-");
            const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single();
            if (content2) digitalContent = content2;
        }
        if (!digitalContent) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Digital content not found"
            }, {
                status: 404
            });
        }
        const { data: digitalLinks } = await supabase.from("digital_download_links").select("*").eq("content_id", digitalContent.id).eq("is_active", true).eq("status", "approved").order("quality", {
            ascending: false
        });
        const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true);
        const hasAds = ads && ads.length > 0;
        const adUrl = hasAds ? ads[0].ad_url : "";
        const adId = hasAds ? ads[0].id : "";
        const title = digitalContent.title;
        const cover = digitalContent.cover_url || "";
        const contentType = digitalContent.content_type;
        const downloadLinks = digitalLinks?.filter((l)=>l.source_url) || [];
        await supabase.from("embed_views").insert({
            ww_id: wwId,
            embed_type: "download",
            referrer: request.headers.get("referer"),
            user_agent: request.headers.get("user-agent")
        });
        const externalIds = {
            container: generateRandomId("ext"),
            loading: generateRandomId("extl"),
            content: generateRandomId("extc"),
            filters: generateRandomId("extf"),
            count: generateRandomId("extn"),
            altContent: generateRandomId("exa"),
            altLoading: generateRandomId("exal"),
            altCount: generateRandomId("exac")
        };
        const ids = {
            overlay: generateRandomId("m"),
            container: generateRandomId("c"),
            timer: generateRandomId("t"),
            progress: generateRandomId("g"),
            btnUnlock: generateRandomId("u"),
            btnDownload: generateRandomId("d"),
            boxTime: generateRandomId("bt"),
            boxHelp: generateRandomId("bh"),
            boxThanks: generateRandomId("bk"),
            boxDone: generateRandomId("bd"),
            step1: generateRandomId("s1"),
            step2: generateRandomId("s2"),
            step3: generateRandomId("s3"),
            linksContainer: generateRandomId("lc")
        };
        const linksJson = JSON.stringify(downloadLinks || []).replace(/'/g, "\\'").replace(/</g, "\\u003c");
        const adModalDigital = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$embed$2d$ad$2d$modal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAdModal2Step"])({
            variant: "download",
            ad1: "https://otieu.com/4/9248013",
            ad2: "https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5",
            title: "Votre téléchargement est prêt",
            subtitle: "Deux étapes pour accéder au lien",
            doneText: "Affichage du lien...",
            finalBtnLabel: "VOIR LE LIEN",
            showFinalBtn: false,
            autoShow: false
        });
        const digitalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - Téléchargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1a 0%,#111827 50%,#0f172a 100%);color:#e5e7eb;padding:16px;min-height:100vh}
.hd{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(30,58,79,0.3);border-radius:12px;border:1px solid rgba(30,58,79,0.5)}
.ps{width:70px;height:100px;object-fit:cover;border-radius:8px}
.tt{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.tg{font-size:13px;color:#14B8A6;text-transform:capitalize}
.li{background:rgba(22,34,48,0.8);border-radius:12px;margin-bottom:12px;overflow:hidden}
.li-top{padding:16px;border-bottom:1px solid rgba(30,58,79,0.4)}
.li-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.li-nm{font-weight:600;font-size:15px;color:#fff;flex:1}
.li-meta{display:flex;flex-wrap:wrap;gap:8px}
.li-tag{padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600}
.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%}
.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px}
.ft a{color:#14B8A6}
.sec-title{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));border:1px solid rgba(102,126,234,0.3);border-radius:12px;margin:24px 0 16px;font-weight:700;color:#a78bfa}
.sec-title svg{width:20px;height:20px}
.ext-tabs{display:flex;gap:8px;margin-bottom:16px}
.ext-tab{flex:1;padding:10px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.ext-tab.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,0.4)}
.ext-tab:not(.active){background:rgba(30,58,79,0.4);color:#94a3b8;border:1px solid rgba(30,58,79,0.6)}
.ext-tab:not(.active):hover{background:rgba(30,58,79,0.7);color:#e5e7eb}
.ext-tab-badge{background:rgba(255,255,255,0.2);padding:2px 7px;border-radius:10px;font-size:11px}
.ext-tab.active .ext-tab-badge{background:rgba(255,255,255,0.25)}
.ext-tab:not(.active) .ext-tab-badge{background:rgba(102,126,234,0.3);color:#a78bfa}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card.alt-card{border-color:rgba(245,158,11,0.3)}
.ext-card.alt-card:hover{border-color:rgba(245,158,11,0.6)}
.ext-card-body{padding:16px}
.ext-provider{font-size:11px;color:#667eea;font-weight:600;text-transform:uppercase;margin-bottom:8px}
.ext-quality{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:10px}
.ext-info{font-size:12px;color:#94a3b8;margin-bottom:6px}
.ext-host{padding:10px 0;border-top:1px solid rgba(30,58,79,0.4);margin-top:10px}
.ext-host span{font-size:12px;color:#8ba3b5}
.ext-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ext-stat{text-align:center;padding:8px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-stat-label{font-size:10px;color:#6b7280}
.ext-stat-value{font-size:13px;font-weight:600;color:#e5e7eb}
.ext-btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;margin-top:12px}
.alt-badge{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:0.5px;vertical-align:middle}
.alt-filename{font-size:11px;color:#94a3b8;word-break:break-word;margin-top:6px;line-height:1.4;max-height:3.2em;overflow:hidden}
.ext-btn.alt-btn{background:linear-gradient(135deg,#f59e0b,#d97706)}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:8px;backdrop-filter:blur(8px);overflow-y:auto}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:16px;padding:14px 16px;max-width:380px;width:100%;max-height:calc(100vh - 16px);display:flex;flex-direction:column;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);margin:auto}
.mc-body{flex:1 1 auto;overflow-y:auto;min-height:0}
.mc-foot{flex:0 0 auto;padding-top:6px}
.mc h2{color:#1a1a2e;margin:0 0 4px;font-size:16px;font-weight:700;line-height:1.2}
.mc-sub{color:#6b7280;font-size:11px;margin-bottom:8px}
.steps{display:flex;justify-content:center;gap:6px;margin-bottom:8px}
.step{width:7px;height:7px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.3)}
.step.done{background:#10b981}
.bx{border-radius:8px;padding:7px 10px;margin:5px 0;text-align:left;display:flex;align-items:center;gap:8px}
.bx svg{flex-shrink:0;width:14px;height:14px}
.bx-content b{display:block;font-size:12px;margin-bottom:0;line-height:1.2}
.bx-content span{font-size:10.5px;opacity:0.8;display:block;line-height:1.3}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46;cursor:pointer}
.bo:hover{background:linear-gradient(135deg,#a7f3d0,#6ee7b7)}
.pb{height:4px;background:#e5e7eb;border-radius:3px;margin:8px 0 6px;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:6px;text-transform:uppercase;letter-spacing:0.4px;transition:all 0.2s;text-decoration:none;display:block;text-align:center}
.bt:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none !important}
.cf{margin-top:8px;font-size:10px;color:#9ca3af}
.cf a{color:#667eea}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:1px 5px;border-radius:4px;font-size:9px;margin-left:5px;font-weight:600}
.link-display{background:rgba(20,184,166,0.1);border:1px solid rgba(20,184,166,0.3);border-radius:12px;padding:16px;margin-top:16px;text-align:center}
.link-display-title{font-size:14px;color:#14B8A6;margin-bottom:12px;font-weight:600}
.link-display-url{background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:12px;color:#e5e7eb;margin-bottom:12px}
.link-display-btn{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
.decode-loading{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999}
.decode-loading-box{background:#1e293b;border-radius:12px;padding:32px 24px;text-align:center;color:#e2e8f0;min-width:200px}
.decode-loading-box svg{animation:spin 1s linear infinite;width:36px;height:36px;margin-bottom:14px;color:#667eea}
.decode-loading-box p{font-size:14px;color:#94a3b8}
</style>
</head>
<body>
<div class="hd">
${cover ? `<img src="${cover}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${contentType}</div>
</div>
</div>

<div id="${ids.linksContainer}"></div>

<div class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
Sources externes
</div>

<div class="ext-tabs">
<button class="ext-tab active" id="tabMovix" onclick="switchTab('movix')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  Sources externes
  <span class="ext-tab-badge" id="${externalIds.count}">...</span>
</button>
<button class="ext-tab" id="tabAlt" onclick="switchTab('alt')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  Sources Alt
  <span class="ext-tab-badge" id="${externalIds.altCount}">...</span>
</button>
</div>

<div id="${externalIds.container}">
<div class="ext-loading" id="${externalIds.loading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources externes...
</div>
<div id="${externalIds.filters}" class="ext-filters" style="display:none">
<select id="extQualityFilter" class="ext-select"><option value="">Qualité</option></select>
<select id="extLanguageFilter" class="ext-select"><option value="">Langue</option></select>
<select id="extProviderFilter" class="ext-select"><option value="">Provider</option></select>
</div>
<div id="${externalIds.content}" class="ext-grid"></div>
</div>

<div id="${externalIds.altContent}_wrap" style="display:none">
<div class="ext-loading" id="${externalIds.altLoading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources alternatives...
</div>
<div id="${externalIds.altContent}" class="ext-grid"></div>
</div>

<div class="link-display-area" id="linkDisplayArea"></div>

<div class="ft">par <a href="https://wavewatch.top" target="_blank">wavewatch.top</a></div>

${adModalDigital.html}

<script>
(function(){
var _lks=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _extIds=${JSON.stringify(externalIds)};
var _title="${title.replace(/"/g, '\\"')}";
var _wwId="${digitalContent.ww_id}";
var _contentType="${contentType}";
var _allExtLinks=[];
var _currentExtLinks=[];
var _allAltLinks=[];
var _altLoaded=false;
var _movixContentId=null;
var _BASE="https://still-wood-a206.wavewatchcontact.workers.dev/https://api.movix.cash/api";
var AD_URL_EXT="https://foreignabnormality.com/q7jywq0h?key=6eb56670c09233e007f1bfb9cf0e1b55";

// ── Rate limit modal ──────────────────────────────────────────────────────
function _formatRetryTime(retryAt){
  if(!retryAt)return"quelques minutes";
  var diff=Math.max(0,retryAt-Date.now());
  var h=Math.floor(diff/3600000);
  var m=Math.floor((diff%3600000)/60000);
  var s=Math.floor((diff%60000)/1000);
  if(h>0)return h+"h "+m+"min";
  if(m>0)return m+"min "+s+"s";
  return s+"s";
}

function _showRateLimitModal(retryAt){
  var existing = document.getElementById("extAdModal");
  if(existing) existing.remove();

  var loader = document.getElementById("decodeLoader");
  if(loader) loader.remove();

  var timeStr = _formatRetryTime(retryAt);

  var modal = document.createElement("div");
  modal.id = "extAdModal";
  modal.style.cssText =
    "position:fixed;" +
    "inset:0;" +
    "background:rgba(0,0,0,0.85);" +
    "display:flex;" +
    "align-items:center;" +
    "justify-content:center;" +
    "z-index:99999;" +
    "padding:16px;";

  var box = document.createElement("div");
  box.style.cssText =
    "background:#1e293b;" +
    "border-radius:16px;" +
    "padding:28px 24px;" +
    "max-width:380px;" +
    "width:100%;" +
    "text-align:center;" +
    "border:1px solid rgba(249,115,22,0.35);" +
    "box-shadow:0 20px 50px rgba(0,0,0,0.45);";

  box.innerHTML =
    '<div style="font-size:36px;margin-bottom:12px">⏳</div>' +

    '<h2 style="color:#f97316;font-size:18px;margin-bottom:10px">' +
    'Lien temporairement indisponible' +
    '</h2>' +

    '<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">' +
    'Ce lien a atteint sa limite temporaire.<br>' +
    'Vous pouvez essayer un autre lien externe, un lien direct ou un lien alternatif disponible sur cette page.' +
    '</p>' +

    '<div style="' +
      'background:rgba(249,115,22,0.08);' +
      'border:1px solid rgba(249,115,22,0.25);' +
      'border-radius:10px;' +
      'padding:12px;' +
      'margin-bottom:20px">' +

        '<div style="font-size:11px;color:#9ca3af;margin-bottom:5px">' +
        'Réessayez dans' +
        '</div>' +

        '<div id="rateLimitTime" style="font-size:22px;font-weight:700;color:#fdba74">' +
        timeStr +
        '</div>' +

    '</div>' +

    '<button id="closeRateLimitBtn" style="' +
      'width:100%;' +
      'padding:12px;' +
      'background:linear-gradient(135deg,#374151,#1f2937);' +
      'color:#e5e7eb;' +
      'border:1px solid #374151;' +
      'border-radius:8px;' +
      'font-size:13px;' +
      'font-weight:600;' +
      'cursor:pointer">' +
      'Fermer' +
    '</button>' +

    '<p style="margin-top:12px;font-size:10px;color:#4b5563">' +
    'Propulsé par <a href="https://wavewatch.top" target="_blank" style="color:#60a5fa;text-decoration:none">WaveWatch</a>' +
    '</p>';

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById("closeRateLimitBtn").onclick = function(){
    modal.remove();
  };

  modal.onclick = function(e){
    if(e.target === modal) modal.remove();
  };
}

window.switchTab=function(tab){
  var movixWrap=document.getElementById(_extIds.container);
  var altWrap=document.getElementById(_extIds.altContent+"_wrap");
  var tabMovix=document.getElementById("tabMovix");
  var tabAlt=document.getElementById("tabAlt");
  if(tab==="movix"){
    movixWrap.style.display="block";altWrap.style.display="none";
    tabMovix.classList.add("active");tabAlt.classList.remove("active");
  }else{
    movixWrap.style.display="none";altWrap.style.display="block";
    tabAlt.classList.add("active");tabMovix.classList.remove("active");
    if(!_altLoaded){_altLoaded=true;_loadAltExternal();}
  }
};

function _getExpectedTypes(){
  if(_contentType==="game")return["games","game"];
  if(_contentType==="music")return["music","album","titre"];
  if(_contentType==="ebook")return["doc","ebook","book","livre"];
  if(_contentType==="software")return["software","logiciel","app"];
  return null;
}

function _getDownloadEndpoint(resultType){
  var t=(resultType||"").toLowerCase();
  if(t==="games"||t==="game")return"game";
  if(t==="music"||t==="album"||t==="titre")return"music";
  if(t==="doc"||t==="ebook"||t==="book"||t==="livre")return"ebook";
  if(t==="software"||t==="logiciel"||t==="app")return"software";
  if(t==="series"||t==="tv")return"tv";
  return"movie";
}

function openAdPopup(){
  if(!_u)return;
  var link=document.createElement('a');
  link.href=_u;link.target='_blank';link.rel='noopener noreferrer';
  document.body.appendChild(link);link.click();document.body.removeChild(link);
}

function _renderLink(l){
  var url=l.source_url||"";
  var release=l.release_name||l.source_name||"Fichier t\u00e9l\u00e9chargeable";
  var meta='<div class="li-meta">';
  if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#fff">'+l.quality+'</span>';
  if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#fff">'+l.resolution+'</span>';
  if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#fff">'+l.file_size+'</span>';
  if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#fff">'+l.language+'</span>';
  if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#fff">'+l.codec_video+'</span>';
  if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#fff">'+l.codec_audio+'</span>';
  if(l.source_type)meta+='<span class="li-tag" style="background:#dc2626;color:#fff">'+l.source_type+'</span>';
  meta+='</div>';
  var btnText=url?'T\u00e9l\u00e9charger':'Lien indisponible';
  var btnDisabled=!url?' disabled style="opacity:0.5;cursor:not-allowed"':'';
  return '<div class="li"><div class="li-top"><div class="li-header"><div class="li-nm">'+release+'</div></div>'+meta+'</div><div class="li-bottom"><button class="li-btn"'+btnDisabled+' data-url="'+encodeURIComponent(url)+'">'+btnText+'</button></div></div>';
}

function _renderLinks(){
  var c=document.getElementById(_ids.linksContainer);
  if(!c)return;
  if(_lks.length===0){c.innerHTML='<div class="em">Aucun lien direct disponible</div>';return;}
  var html='';
  for(var i=0;i<_lks.length;i++){html+=_renderLink(_lks[i]);}
  c.innerHTML=html;_bindBtns();
}

function _bindBtns(){
  var bs=document.querySelectorAll(".li-btn");
  for(var j=0;j<bs.length;j++){
    (function(btn){
      btn.onclick=function(e){
        e.preventDefault();
        var url=btn.getAttribute("data-url");
        if(!url||url==="undefined"){alert("Lien non disponible");return;}
        if(_h){_showAdModal(decodeURIComponent(url));}
        else{
          fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
          _displayLink(decodeURIComponent(url));
        }
      };
    })(bs[j]);
  }
}

function _displayLink(url){
  var area=document.getElementById("linkDisplayArea");
  area.style.display="block";
  area.innerHTML='<div class="link-display"><div class="link-display-title">Votre lien est pr\u00eat !</div><div class="link-display-url">'+url+'</div><a href="'+url+'" target="_blank" class="link-display-btn">Ouvrir le lien</a></div>';
  area.scrollIntoView({behavior:"smooth"});
}

function _showAdModal(downloadUrl){
  // Unified 2-step ad modal — see /app/frontend/lib/embed-ad-modal.ts
  if(window._wwAdModal){
    window._wwAdModal.show(downloadUrl, function(u){
      if(u){
        fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})}).catch(function(){});
        fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})}).catch(function(){});
        _displayLink(u);
      }
    });
  }else{
    _displayLink(downloadUrl);
  }
}

function _loadExternal(){
  var loading=document.getElementById(_extIds.loading);
  var content=document.getElementById(_extIds.content);
  var filters=document.getElementById(_extIds.filters);
  var countBadge=document.getElementById(_extIds.count);
  fetch(_BASE+"/search?title="+encodeURIComponent(_title))
  .then(function(r){return r.json();})
  .then(function(data){
    var results=data;
    if(data&&typeof data==="object"&&!Array.isArray(data)){
      if(data.results)results=data.results;
      else if(data.data)results=data.data;
    }
    if(!Array.isArray(results)||results.length===0){
      loading.style.display="none";
      content.innerHTML='<div class="em">Aucune source externe trouv\u00e9e</div>';
      countBadge.textContent="0";return;
    }
    var expectedTypes=_getExpectedTypes();
    var best=null;
    if(expectedTypes){
      for(var i=0;i<results.length;i++){
        var t=(results[i].type||"").toLowerCase();
        for(var j=0;j<expectedTypes.length;j++){
          if(t===expectedTypes[j]){best=results[i];break;}
        }
        if(best)break;
      }
    }
    if(!best)best=results[0];
    var itemId=best.id||best.movie_id;
    _movixContentId=itemId;
    var endpoint=_getDownloadEndpoint(best.type||"movie");
    var dlUrl=_BASE+"/darkiworld/download/"+endpoint+"/"+itemId;
    function _fetchLinks(url,useFallback){
      fetch(url).then(function(r){return r.json();})
      .then(function(dlData){
        var links=(dlData&&dlData.success&&dlData.all)?dlData.all.filter(function(l){return l.id;}):null;
        if((!links||links.length===0)&&useFallback){
          _fetchLinks(_BASE+"/darkiworld/download/movie/"+itemId,false);return;
        }
        loading.style.display="none";
        if(!links||links.length===0){
          content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
          countBadge.textContent="0";return;
        }
        _allExtLinks=links;countBadge.textContent=links.length;
        _populateFilters(links);filters.style.display="flex";_renderExtLinks(links);
      }).catch(function(){
        if(useFallback){_fetchLinks(_BASE+"/darkiworld/download/movie/"+itemId,false);return;}
        loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";
      });
    }
    _fetchLinks(dlUrl,endpoint!=="movie");
  }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
}

function _loadAltExternal(){
  var altLoading=document.getElementById(_extIds.altLoading);
  var altContent=document.getElementById(_extIds.altContent);
  var altCountBadge=document.getElementById(_extIds.altCount);
  var altUrl="https://apis.wavewatch.top/wawa.php?_route=api&type=search&q="+encodeURIComponent(_title);
  fetch(altUrl)
  .then(function(r){return r.json();})
  .then(function(data){
    altLoading.style.display="none";
    var links=_extractAndFilterAltLinks(data);
    _allAltLinks=links;altCountBadge.textContent=links.length;
    if(links.length===0){altContent.innerHTML='<div class="em">Aucune source alternative disponible</div>';return;}
    _renderAltLinks(links,altContent);
  }).catch(function(){
    altLoading.style.display="none";
    altContent.innerHTML='<div class="em">Erreur de chargement</div>';
    altCountBadge.textContent="0";
  });
}

function _parseFilename(fname){
  if(!fname)return{quality:"",lang:""};
  var up=fname.toUpperCase();var quality="";var lang="";
  var qualities=["2160P","4K","1080P","720P","480P","576P","1080I","720I","BDRIP","BLURAY","BLU-RAY","BDREMUX","REMUX","WEBDL","WEB-DL","WEBRIP","WEB-RIP","HDRIP","HDTV","DVDSCR","DVDRIP","DVD","TVRIP","VHSRIP","HDCAM","CAM","TS","R5","SCR","VODRIP"];
  for(var i=0;i<qualities.length;i++){if(up.indexOf(qualities[i])!==-1){quality=qualities[i].replace("-","");break;}}
  var langs=[["MULTI","MULTI"],["TRUEFRENCH","TRUEFRENCH"],["FRENCH","FR"],["VOSTFR","VOSTFR"],["VOSTSUB","VOSTSUB"],["VOST","VOST"],["VFF","VFF"],["VFQ","VFQ"],["VF","VF"],["FANSUB","FANSUB"],["ENGLISH","EN"],["ENG","EN"],["SPANISH","ES"],["SPA","ES"],["GERMAN","DE"],["GER","DE"],["DEUTSCH","DE"],["ITALIAN","IT"],["ITA","IT"],["PORTUGUESE","PT"],["POR","PT"],["ARABIC","AR"],["ARA","AR"],["RUSSIAN","RU"],["RUS","RU"],["JAPANESE","JA"],["JPN","JA"],["KOREAN","KO"],["KOR","KO"],["CHINESE","ZH"],["CHI","ZH"]];
  for(var j=0;j<langs.length;j++){if(up.indexOf(langs[j][0])!==-1){lang=langs[j][1];break;}}
  return{quality:quality,lang:lang};
}

function _extractAndFilterAltLinks(data){
  var raw=[];
  if(Array.isArray(data)){raw=data;}
  else if(data&&Array.isArray(data.links)){raw=data.links;}
  else if(data&&Array.isArray(data.downloadLinks)){raw=data.downloadLinks;}
  else if(data&&Array.isArray(data.results)){raw=data.results;}
  else if(data&&Array.isArray(data.data)){raw=data.data;}
  else if(data&&Array.isArray(data.qualities)){
    data.qualities.forEach(function(q){
      if(Array.isArray(q.downloadLinks)){
        q.downloadLinks.forEach(function(l){raw.push(Object.assign({},l,{quality:l.protection||q.quality||"",_qualityGroup:q.quality||""}));});
      }
    });
  }
  return _filterAltLinks(raw);
}

function _filterAltLinks(raw){
  return (raw||[]).filter(function(l){
    var u=l.url||l.lien||l.link||"";
    var fname=(l.filename||l.name||"").toLowerCase();
    var host=(l.host||l.provider||"").toLowerCase();
    var prot=l.protection||l.quality||l._qualityGroup||"";
    if(!u)return false;
    if(u.indexOf("rqts-url")!==-1)return false;
    if(u.indexOf("wawacity.news")!==-1)return false;
    if(u.indexOf("/pub/")!==-1)return false;
    if(host==="wawacity")return false;
    if(host==="mamot")return false;
    var bad=["vod(+18)","webcams","rencontres sexe","boutique","rencontres","adulte","xxx"];
    for(var i=0;i<bad.length;i++){if(fname.indexOf(bad[i])!==-1)return false;}
    if(!fname&&!prot)return false;
    return true;
  });
}

function _renderAltLinks(links,container){
  if(links.length===0){container.innerHTML='<div class="em">Aucun r\u00e9sultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    var u=l.url||l.lien||l.link||"";
    var host=l.host||l.provider||"";
    var fname=l.filename||l.name||"";
    var size=l.size||"";
    var prot=l.protection||l.quality||l._qualityGroup||"";
    var parsed=_parseFilename(fname);
    var dispQuality=prot||parsed.quality||"N/A";
    var dispLang=l.language||parsed.lang||"";
    html+='<div class="ext-card alt-card" data-alt-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
    html+='<span class="ext-quality">'+dispQuality+'</span>';
    if(dispLang)html+='<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700">'+dispLang+'</span>';
    html+='<span class="alt-badge">ALT</span></div>';
    if(host)html+='<div class="ext-provider">'+host+'</div>';
    if(fname)html+='<div class="alt-filename">'+fname+'</div>';
    if(size)html+='<div class="ext-info" style="margin-top:6px">Taille: '+size+'</div>';
    html+=(u?'<button class="ext-btn alt-btn">T\u00e9l\u00e9charger</button>':'<button class="ext-btn alt-btn" disabled style="opacity:0.4;cursor:not-allowed">Indisponible</button>');
    html+='</div></div>';
  });
  container.innerHTML=html;
  container.querySelectorAll(".alt-card").forEach(function(card){
    var btn=card.querySelector(".ext-btn");
    if(btn.disabled)return;
    btn.onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-alt-idx"));
      var l=_allAltLinks[idx];
      var u=l.url||l.lien||l.link||"";
      if(!u){alert("Lien non disponible");return;}
      _openExtAdModal(u,{provider:l.host,quality:l.protection||l._qualityGroup});
    };
  });
}

function _populateFilters(links){
  var qualities=new Set(),languages=new Set(),providers=new Set();
  links.forEach(function(l){if(l.quality)qualities.add(l.quality);if(l.language)languages.add(l.language);if(l.provider)providers.add(l.provider);});
  var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
  qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
  languages.forEach(function(l){var o=document.createElement("option");o.value=l;o.textContent=l;lf.appendChild(o);});
  providers.forEach(function(p){var o=document.createElement("option");o.value=p;o.textContent=p;pf.appendChild(o);});
  qf.onchange=lf.onchange=pf.onchange=_applyFilters;
}

function _applyFilters(){
  var qf=document.getElementById("extQualityFilter").value,lf=document.getElementById("extLanguageFilter").value,pf=document.getElementById("extProviderFilter").value;
  var filtered=_allExtLinks.filter(function(l){
    if(qf&&l.quality!==qf)return false;
    if(lf&&l.language!==lf)return false;
    if(pf&&l.provider!==pf)return false;
    return true;
  });
  _renderExtLinks(filtered);
}

function _formatSize(bytes){
  if(!bytes)return"N/A";
  var gb=bytes/(1024*1024*1024);
  if(gb>=1)return gb.toFixed(2)+" GB";
  return(bytes/(1024*1024)).toFixed(0)+" MB";
}

function _renderExtLinks(links){
  _currentExtLinks=links;
  var content=document.getElementById(_extIds.content);
  if(links.length===0){content.innerHTML='<div class="em">Aucun r\u00e9sultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
    html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
    if(l.sub)html+='<div class="ext-info">Sub: '+l.sub+'</div>';
    html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
    if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
    if(l.size)html+='<div class="ext-stats"><div class="ext-stat"><span class="ext-stat-label">Taille</span><span class="ext-stat-value">'+_formatSize(l.size)+'</span></div></div>';
    html+='<button class="ext-btn">T\u00e9l\u00e9charger</button></div></div>';
  });
  content.innerHTML=html;
  content.querySelectorAll(".ext-card").forEach(function(card){
    card.querySelector(".ext-btn").onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-idx"));
      _showExtDetails(_currentExtLinks[idx]);
    };
  });
}

function _openExtAdModal(finalUrl,extLink){
  fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({linkType:"external",wwId:_wwId,provider:(extLink&&extLink.provider)||null,hostName:(extLink&&extLink.host_name)||null,quality:(extLink&&extLink.quality)||null,language:(extLink&&extLink.language)||null,fileSize:(extLink&&extLink.size)||null})
  }).catch(function(){});
  // Unified 2-step ad modal — also used for direct DB links and alt sources
  if(window._wwAdModal){
    window._wwAdModal.show(finalUrl, function(u){ if(u) _displayLink(u); });
  }else{
    _displayLink(finalUrl);
  }
}

function _showExtDetails(extLink){
  if(!extLink)return;
  if(extLink.lien){_openExtAdModal(extLink.lien,extLink);return;}
  if(!extLink.id){alert("Lien non disponible pour ce fichier");return;}
  var tmpLoader=document.createElement("div");
  tmpLoader.className="decode-loading";tmpLoader.id="decodeLoader";
  tmpLoader.innerHTML='<div class="decode-loading-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><p>D\u00e9codage du lien...</p></div>';
  document.body.appendChild(tmpLoader);
  var decodeUrl = _BASE + "/darkiworld/decode/" + extLink.id + "?title_id=" + _movixMovieId;
fetch(decodeUrl).then(function(r){return r.json();})
  .then(function(data){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    if(data&&data.error==="rate_limited"){_showRateLimitModal(data.retry_at||null);return;}
    var finalUrl=null;
    if(data&&data.lien)finalUrl=data.lien;
    else if(data&&data.embed_url&&data.embed_url.lien)finalUrl=data.embed_url.lien;
    if(!finalUrl){alert("Lien non disponible pour ce fichier");return;}
    _openExtAdModal(finalUrl,extLink);
  }).catch(function(){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    alert("Erreur lors du d\u00e9codage du lien");
  });
}

_renderLinks();
_loadExternal();
${adModalDigital.js}
})();
</script>
</body>
</html>`;
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](digitalHtml, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "X-Frame-Options": "ALLOWALL",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
    // ============================================
    // FILM / SERIE DOWNLOAD
    // ============================================
    const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseWWId"])(wwId);
    if (!parsed) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid WW ID format"
        }, {
            status: 400
        });
    }
    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed;
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true);
    const hasAds = ads && ads.length > 0;
    const adUrl = hasAds ? ads[0].ad_url : "";
    const adId = hasAds ? ads[0].id : "";
    const tmdbData = mediaType === "movie" ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMovieDetails"])(tmdbId) : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTVDetails"])(tmdbId);
    const title = tmdbData ? "title" in tmdbData ? tmdbData.title : tmdbData.name : "Unknown";
    const posterPath = tmdbData?.poster_path;
    const posterUrl = posterPath ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPosterUrl"])(posterPath, "w185") : "";
    let query = supabase.from("download_links").select(`*, profiles:submitted_by (username)`).eq("tmdb_id", tmdbId).eq("media_type", mediaType).eq("is_active", true).eq("status", "approved");
    if (mediaType === "tv") {
        if (seasonNumber !== undefined && episodeNumber !== undefined) {
            query = query.eq("season_number", seasonNumber).eq("episode_number", episodeNumber);
        } else if (seasonNumber !== undefined) {
            query = query.eq("season_number", seasonNumber);
        }
    }
    const { data: links } = await query.order("season_number", {
        ascending: true
    }).order("episode_number", {
        ascending: true
    }).order("quality", {
        ascending: false
    });
    await supabase.from("embed_views").insert({
        ww_id: wwId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        season_number: seasonNumber ?? null,
        episode_number: episodeNumber ?? null,
        embed_type: "download",
        referrer: request.headers.get("referer"),
        user_agent: request.headers.get("user-agent")
    });
    const ids = {
        overlay: generateRandomId("m"),
        timer: generateRandomId("t"),
        progress: generateRandomId("g"),
        btnUnlock: generateRandomId("u"),
        btnDownload: generateRandomId("d"),
        boxTime: generateRandomId("bt"),
        boxHelp: generateRandomId("bh"),
        boxThanks: generateRandomId("bk"),
        boxDone: generateRandomId("bd"),
        step1: generateRandomId("s1"),
        step2: generateRandomId("s2"),
        step3: generateRandomId("s3"),
        linksContainer: generateRandomId("lc")
    };
    const linksJson = JSON.stringify(links || []).replace(/'/g, "\\'").replace(/</g, "\\u003c");
    const isSeries = mediaType === "tv";
    const externalIds = {
        container: generateRandomId("ext"),
        content: generateRandomId("exc"),
        loading: generateRandomId("exl"),
        filters: generateRandomId("exf"),
        count: generateRandomId("exn"),
        altContent: generateRandomId("exa"),
        altLoading: generateRandomId("exal"),
        altCount: generateRandomId("exac")
    };
    const movieHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>T\u00e9l\u00e9chargement - ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1a 0%,#111827 50%,#0f172a 100%);color:#e5e7eb;padding:16px;min-height:100vh}
.hd{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(30,58,79,0.3);border-radius:12px;border:1px solid rgba(30,58,79,0.5)}
.ps{width:70px;height:100px;object-fit:cover;border-radius:8px}
.tt{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.tg{font-size:13px;color:#14B8A6}
.li{background:rgba(22,34,48,0.8);border-radius:12px;margin-bottom:12px;overflow:hidden}
.li-top{padding:16px;border-bottom:1px solid rgba(30,58,79,0.4)}
.li-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.li-ep{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700}
.li-nm{font-weight:600;font-size:15px;color:#fff;flex:1}
.li-up{font-size:12px;color:#6b7280;background:rgba(107,114,128,0.1);padding:4px 10px;border-radius:6px}
.li-meta{display:flex;flex-wrap:wrap;gap:8px}
.li-tag{padding:6px 10px;background:rgba(30,58,79,0.6);border-radius:6px;font-size:11px;color:#94a3b8;border:1px solid rgba(30,58,79,0.8)}
.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%}
.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px}
.ft a{color:#14B8A6}
.sec-title{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));border:1px solid rgba(102,126,234,0.3);border-radius:12px;margin:24px 0 16px;font-weight:700;color:#a78bfa}
.sec-title svg{width:20px;height:20px}
.ext-tabs{display:flex;gap:8px;margin-bottom:16px}
.ext-tab{flex:1;padding:10px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.ext-tab.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,0.4)}
.ext-tab:not(.active){background:rgba(30,58,79,0.4);color:#94a3b8;border:1px solid rgba(30,58,79,0.6)}
.ext-tab:not(.active):hover{background:rgba(30,58,79,0.7);color:#e5e7eb}
.ext-tab-badge{background:rgba(255,255,255,0.2);padding:2px 7px;border-radius:10px;font-size:11px}
.ext-tab.active .ext-tab-badge{background:rgba(255,255,255,0.25)}
.ext-tab:not(.active) .ext-tab-badge{background:rgba(102,126,234,0.3);color:#a78bfa}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card.alt-card{border-color:rgba(245,158,11,0.3)}
.ext-card.alt-card:hover{border-color:rgba(245,158,11,0.6)}
.ext-card-body{padding:16px}
.ext-provider{font-size:11px;color:#667eea;font-weight:600;text-transform:uppercase;margin-bottom:8px}
.ext-quality{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:10px}
.ext-info{font-size:12px;color:#94a3b8;margin-bottom:6px}
.ext-host{padding:10px 0;border-top:1px solid rgba(30,58,79,0.4);margin-top:10px}
.ext-host span{font-size:12px;color:#8ba3b5}
.ext-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ext-stat{text-align:center;padding:8px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-stat-label{font-size:10px;color:#6b7280}
.ext-stat-value{font-size:13px;font-weight:600;color:#e5e7eb}
.ext-btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;margin-top:12px}
.alt-badge{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:0.5px;vertical-align:middle}
.alt-filename{font-size:11px;color:#94a3b8;word-break:break-word;margin-top:6px;line-height:1.4;max-height:3.2em;overflow:hidden}
.ext-btn.alt-btn{background:linear-gradient(135deg,#f59e0b,#d97706)}
.link-display-area{display:none;margin:20px 0;padding:20px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(20,184,166,0.1));border:2px solid #10b981;border-radius:12px}
.link-display-title{font-size:16px;font-weight:700;color:#10b981;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.link-display-url{background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-family:monospace;font-size:12px;color:#5eead4;word-break:break-all;margin-bottom:16px;border:1px solid rgba(94,234,212,0.3)}
.link-display-btns{display:flex;gap:10px;flex-wrap:wrap}
.link-display-btn{flex:1;min-width:140px;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;text-align:center;text-decoration:none;transition:all 0.2s}
.link-display-btn.primary{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none}
.link-display-btn.secondary{background:transparent;color:#5eead4;border:2px solid #5eead4;cursor:pointer}
.copy-success{color:#10b981;font-size:12px;margin-top:8px;display:none}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:8px;backdrop-filter:blur(8px);overflow-y:auto}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:16px;padding:14px 16px;max-width:380px;width:100%;max-height:calc(100vh - 16px);display:flex;flex-direction:column;text-align:center;margin:auto}
.mc-body{flex:1 1 auto;overflow-y:auto;min-height:0}
.mc-foot{flex:0 0 auto;padding-top:6px}
.mc h2{color:#1a1a2e;margin:0 0 4px;font-size:16px;font-weight:700;line-height:1.2}
.mc-sub{color:#6b7280;font-size:11px;margin-bottom:8px}
.steps{display:flex;justify-content:center;gap:6px;margin-bottom:8px}
.step{width:7px;height:7px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.3)}
.step.done{background:#10b981}
.bx{border-radius:8px;padding:7px 10px;margin:5px 0;text-align:left;display:flex;align-items:center;gap:8px}
.bx svg{flex-shrink:0;width:14px;height:14px}
.bx-content b{display:block;font-size:12px;margin-bottom:0;line-height:1.2}
.bx-content span{font-size:10.5px;opacity:0.8;line-height:1.3;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46;cursor:pointer}
.bo:hover{background:linear-gradient(135deg,#a7f3d0,#6ee7b7)}
.pb{height:4px;background:#e5e7eb;border-radius:3px;margin:8px 0 6px;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s}
.bt{width:100%;padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:6px;text-transform:uppercase;letter-spacing:0.4px;transition:all 0.2s;text-decoration:none;display:block;text-align:center}
.bt:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none !important}
.cf{margin-top:8px;font-size:10px;color:#9ca3af}
.cf a{color:#667eea}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:1px 5px;border-radius:4px;font-size:9px;margin-left:5px;font-weight:600}
.decode-loading{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999}
.decode-loading-box{background:#1e293b;border-radius:12px;padding:32px 24px;text-align:center;color:#e2e8f0;min-width:200px}
.decode-loading-box svg{animation:spin 1s linear infinite;width:36px;height:36px;margin-bottom:14px;color:#667eea}
.decode-loading-box p{font-size:14px;color:#94a3b8}
</style>
</head>
<body>
<div class="hd">
${posterUrl ? `<img src="${posterUrl}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${mediaType === "movie" ? "Film" : "S\u00e9rie"}</div>
</div>
</div>

<div id="${ids.linksContainer}"></div>

<div class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
Sources externes
</div>

<div class="ext-tabs">
<button class="ext-tab active" id="tabMovix" onclick="switchTab('movix')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  Sources externes
  <span class="ext-tab-badge" id="${externalIds.count}">...</span>
</button>
<button class="ext-tab" id="tabAlt" onclick="switchTab('alt')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  Sources Alt
  <span class="ext-tab-badge" id="${externalIds.altCount}">...</span>
</button>
</div>

<div id="${externalIds.container}">
<div class="ext-loading" id="${externalIds.loading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources externes...
</div>
<div id="${externalIds.filters}" class="ext-filters" style="display:none">
<select id="extQualityFilter" class="ext-select"><option value="">Qualit\u00e9</option></select>
<select id="extLanguageFilter" class="ext-select"><option value="">Langue</option></select>
<select id="extProviderFilter" class="ext-select"><option value="">Provider</option></select>
</div>
<div id="${externalIds.content}" class="ext-grid"></div>
</div>

<div id="${externalIds.altContent}_wrap" style="display:none">
<div class="ext-loading" id="${externalIds.altLoading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources alternatives...
</div>
<div id="${externalIds.content}_altfilters" class="ext-filters" style="display:none">
<select id="altQualityFilter" class="ext-select"><option value="">Qualit\u00e9</option></select>
<select id="altHostFilter" class="ext-select"><option value="">Host</option></select>
</div>
<div id="${externalIds.altContent}" class="ext-grid"></div>
</div>

<div class="link-display-area" id="linkDisplayArea"></div>

<div class="ft">par <a href="https://wavewatch.top" target="_blank">wavewatch.top</a></div>

<div class="mo" id="${ids.overlay}">
<div class="mc">
<div class="mc-body">
<h2>Votre t\u00e9l\u00e9chargement est pr\u00eat</h2>
<div class="mc-sub">Deux \u00e9tapes pour acc\u00e9der au fichier</div>
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
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide \u00e0 rester en ligne</span></div>
</div>
<div class="bx bi hi" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>\u00c9tape 1 valid\u00e9e !</b><span>Cliquez sur le 2\u00e8me bouton pour continuer</span></div>
</div>
<div class="bx bo hi" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Tout est pr\u00eat !</b><span>Affichage du lien...</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
</div>
<div class="mc-foot">
<button class="bt bp" id="${ids.btnUnlock}">\u00c9TAPE 1 / 2<span class="tag">PUB</span></button>
<button class="bt bp hi" id="${ids.btnDownload}">\u00c9TAPE 2 / 2<span class="tag">PUB</span></button>
<div class="cf">Propuls\u00e9 par <a href="https://wavewatch.top" target="_blank">WaveWatch</a></div>
</div>
</div>
</div>

<script>
(function(){
var _lks=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _extIds=${JSON.stringify(externalIds)};
var _isSeries=${isSeries};
var _title="${title.replace(/"/g, '\\"')}";
var _mediaType="${mediaType}";
var _tmdbId=${tmdbId};
var _seasonNum=${seasonNumber !== undefined ? seasonNumber : "null"};
var _episodeNum=${episodeNumber !== undefined ? episodeNumber : "null"};
var _wwId="${wwId}";
var _allExtLinks=[];
var _currentExtLinks=[];
var _allAltLinks=[];
var _currentAltLinks=[];
var _altLoaded=false;
var _movixMovieId=null;
var _BASE="https://still-wood-a206.wavewatchcontact.workers.dev/https://api.movix.cash/api";
var AD_URL_EXT="https://foreignabnormality.com/q7jywq0h?key=6eb56670c09233e007f1bfb9cf0e1b55";
var ALT_BASE="https://apis.wavewatch.top/wawa.php";

// ── Rate limit modal ──────────────────────────────────────────────────────
function _formatRetryTime(retryAt){
  if(!retryAt)return"quelques minutes";
  var diff=Math.max(0,retryAt-Date.now());
  var h=Math.floor(diff/3600000);
  var m=Math.floor((diff%3600000)/60000);
  var s=Math.floor((diff%60000)/1000);
  if(h>0)return h+"h "+m+"min";
  if(m>0)return m+"min "+s+"s";
  return s+"s";
}

function _showRateLimitModal(retryAt){
  var existing = document.getElementById("extAdModal");
  if(existing) existing.remove();

  var loader = document.getElementById("decodeLoader");
  if(loader) loader.remove();

  var timeStr = _formatRetryTime(retryAt);

  var modal = document.createElement("div");
  modal.id = "extAdModal";
  modal.style.cssText =
    "position:fixed;" +
    "inset:0;" +
    "background:rgba(0,0,0,0.85);" +
    "display:flex;" +
    "align-items:center;" +
    "justify-content:center;" +
    "z-index:99999;" +
    "padding:16px;";

  var box = document.createElement("div");
  box.style.cssText =
    "background:#1e293b;" +
    "border-radius:16px;" +
    "padding:28px 24px;" +
    "max-width:380px;" +
    "width:100%;" +
    "text-align:center;" +
    "border:1px solid rgba(249,115,22,0.35);" +
    "box-shadow:0 20px 50px rgba(0,0,0,0.45);";

  box.innerHTML =
    '<div style="font-size:36px;margin-bottom:12px">⏳</div>' +

    '<h2 style="color:#f97316;font-size:18px;margin-bottom:10px">' +
    'Lien temporairement indisponible' +
    '</h2>' +

    '<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">' +
    'Ce lien a atteint sa limite temporaire.<br>' +
    'Vous pouvez essayer un autre lien externe, un lien direct ou un lien alternatif disponible sur cette page.' +
    '</p>' +

    '<div style="' +
      'background:rgba(249,115,22,0.08);' +
      'border:1px solid rgba(249,115,22,0.25);' +
      'border-radius:10px;' +
      'padding:12px;' +
      'margin-bottom:20px">' +

        '<div style="font-size:11px;color:#9ca3af;margin-bottom:5px">' +
        'Réessayez dans' +
        '</div>' +

        '<div id="rateLimitTime" style="font-size:22px;font-weight:700;color:#fdba74">' +
        timeStr +
        '</div>' +

    '</div>' +

    '<button id="closeRateLimitBtn" style="' +
      'width:100%;' +
      'padding:12px;' +
      'background:linear-gradient(135deg,#374151,#1f2937);' +
      'color:#e5e7eb;' +
      'border:1px solid #374151;' +
      'border-radius:8px;' +
      'font-size:13px;' +
      'font-weight:600;' +
      'cursor:pointer">' +
      'Fermer' +
    '</button>' +

    '<p style="margin-top:12px;font-size:10px;color:#4b5563">' +
    'Propulsé par <a href="https://wavewatch.top" target="_blank" style="color:#60a5fa;text-decoration:none">WaveWatch</a>' +
    '</p>';

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById("closeRateLimitBtn").onclick = function(){
    modal.remove();
  };

  modal.onclick = function(e){
    if(e.target === modal) modal.remove();
  };
}

window.switchTab=function(tab){
  var movixWrap=document.getElementById(_extIds.container);
  var altWrap=document.getElementById(_extIds.altContent+"_wrap");
  var tabMovix=document.getElementById("tabMovix");
  var tabAlt=document.getElementById("tabAlt");
  if(tab==="movix"){
    movixWrap.style.display="block";altWrap.style.display="none";
    tabMovix.classList.add("active");tabAlt.classList.remove("active");
  }else{
    movixWrap.style.display="none";altWrap.style.display="block";
    tabAlt.classList.add("active");tabMovix.classList.remove("active");
    if(!_altLoaded){_altLoaded=true;_loadAltExternal();}
  }
};

function _parseFilename(fname){
  if(!fname)return{quality:"",lang:""};
  var up=fname.toUpperCase();var quality="";var lang="";
  var qualities=["2160P","4K","1080P","720P","480P","576P","1080I","720I","BDRIP","BLURAY","BLU-RAY","BDREMUX","REMUX","WEBDL","WEB-DL","WEBRIP","WEB-RIP","HDRIP","HDTV","DVDSCR","DVDRIP","DVD","TVRIP","VHSRIP","HDCAM","CAM","TS","R5","SCR","VODRIP"];
  for(var i=0;i<qualities.length;i++){if(up.indexOf(qualities[i])!==-1){quality=qualities[i].replace("-","");break;}}
  var langs=[["MULTI","MULTI"],["TRUEFRENCH","TRUEFRENCH"],["FRENCH","FR"],["VOSTFR","VOSTFR"],["VOSTSUB","VOSTSUB"],["VOST","VOST"],["VFF","VFF"],["VFQ","VFQ"],["VF","VF"],["FANSUB","FANSUB"],["ENGLISH","EN"],["ENG","EN"],["SPANISH","ES"],["SPA","ES"],["GERMAN","DE"],["GER","DE"],["DEUTSCH","DE"],["ITALIAN","IT"],["ITA","IT"],["PORTUGUESE","PT"],["POR","PT"],["ARABIC","AR"],["ARA","AR"],["RUSSIAN","RU"],["RUS","RU"],["JAPANESE","JA"],["JPN","JA"],["KOREAN","KO"],["KOR","KO"],["CHINESE","ZH"],["CHI","ZH"]];
  for(var j=0;j<langs.length;j++){if(up.indexOf(langs[j][0])!==-1){lang=langs[j][1];break;}}
  return{quality:quality,lang:lang};
}

function _normaliseAltLinks(data){
  var raw=[];
  if(Array.isArray(data)){raw=data;}
  else if(data&&Array.isArray(data.links)){raw=data.links;}
  else if(data&&Array.isArray(data.downloadLinks)){raw=data.downloadLinks;}
  else if(data&&Array.isArray(data.results)){raw=data.results;}
  else if(data&&Array.isArray(data.data)){raw=data.data;}
  else if(data&&Array.isArray(data.qualities)){
    data.qualities.forEach(function(q){
      if(Array.isArray(q.downloadLinks)){
        q.downloadLinks.forEach(function(l){raw.push(Object.assign({},l,{quality:l.protection||q.quality||"",_qualityGroup:q.quality||""}));});
      }
    });
  }
  return raw;
}

function _filterAltLinks(raw){
  return (raw||[]).filter(function(l){
    var u=l.url||l.lien||l.link||"";
    var fname=(l.filename||l.name||"").toLowerCase();
    var host=(l.host||l.provider||"").toLowerCase();
    var prot=l.protection||l.quality||l._qualityGroup||"";
    if(!u)return false;
    if(u.indexOf("rqts-url")!==-1)return false;
    if(u.indexOf("wawacity.news")!==-1)return false;
    if(u.indexOf("/pub/")!==-1)return false;
    if(host==="wawacity")return false;
    if(host==="mamot")return false;
    var bad=["vod(+18)","webcams","rencontres sexe","boutique","rencontres","adulte","xxx"];
    for(var i=0;i<bad.length;i++){if(fname.indexOf(bad[i])!==-1)return false;}
    if(!fname&&!prot)return false;
    return true;
  });
}

function _loadAltExternal(){
  var altLoading=document.getElementById(_extIds.altLoading);
  var altContent=document.getElementById(_extIds.altContent);
  var altFilters=document.getElementById(_extIds.content+"_altfilters");
  var altCountBadge=document.getElementById(_extIds.altCount);
  var url;
  if(_mediaType==="tv"){
    var s=_seasonNum||1;var e=_episodeNum||1;
    url=ALT_BASE+"?_route=api&type=tv&id="+_tmdbId+"&s="+s+"&e="+e;
  }else{
    url=ALT_BASE+"?_route=api&type=movie&id="+_tmdbId;
  }
  fetch(url)
  .then(function(r){return r.json();})
  .then(function(data){
    altLoading.style.display="none";
    var raw=_normaliseAltLinks(data);
    var links=_filterAltLinks(raw);
    _allAltLinks=links;_currentAltLinks=links;
    altCountBadge.textContent=links.length;
    if(links.length===0){altContent.innerHTML='<div class="em">Aucune source alternative disponible</div>';return;}
    _populateAltFilters(links,altFilters);altFilters.style.display="flex";
    _renderAltLinks(links);
  }).catch(function(){
    altLoading.style.display="none";
    altContent.innerHTML='<div class="em">Erreur de chargement</div>';
    altCountBadge.textContent="0";
  });
}

function _populateAltFilters(links,filtersEl){
  var qualities=new Set(),hosts=new Set();
  links.forEach(function(l){
    var q=l.protection||l.quality||l._qualityGroup||"";
    var h=l.host||l.provider||"";
    if(q)qualities.add(q);if(h)hosts.add(h);
  });
  var qf=document.getElementById("altQualityFilter");
  var hf=document.getElementById("altHostFilter");
  qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
  hosts.forEach(function(h){var o=document.createElement("option");o.value=h;o.textContent=h;hf.appendChild(o);});
  qf.onchange=hf.onchange=_applyAltFilters;
}

function _applyAltFilters(){
  var qf=document.getElementById("altQualityFilter").value;
  var hf=document.getElementById("altHostFilter").value;
  var filtered=_allAltLinks.filter(function(l){
    var q=l.protection||l.quality||l._qualityGroup||"";
    var h=l.host||l.provider||"";
    if(qf&&q!==qf)return false;
    if(hf&&h!==hf)return false;
    return true;
  });
  _currentAltLinks=filtered;_renderAltLinks(filtered);
}

function _renderAltLinks(links){
  var content=document.getElementById(_extIds.altContent);
  if(!links||links.length===0){content.innerHTML='<div class="em">Aucun r\u00e9sultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    var u=l.url||l.lien||l.link||"";
    var host=l.host||l.provider||"";
    var fname=l.filename||l.name||"";
    var size=l.size||"";
    var prot=l.protection||l.quality||l._qualityGroup||"";
    var parsed=_parseFilename(fname);
    var dispQuality=prot||parsed.quality||"N/A";
    var dispLang=l.language||parsed.lang||"";
    html+='<div class="ext-card alt-card" data-alt-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
    html+='<span class="ext-quality">'+dispQuality+'</span>';
    if(dispLang)html+='<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700">'+dispLang+'</span>';
    html+='<span class="alt-badge">ALT</span></div>';
    if(host)html+='<div class="ext-provider">'+host+'</div>';
    if(fname)html+='<div class="alt-filename">'+fname+'</div>';
    if(size)html+='<div class="ext-info" style="margin-top:6px">Taille: '+size+'</div>';
    html+=(u?'<button class="ext-btn alt-btn">Voir le lien</button>':'<button class="ext-btn alt-btn" disabled style="opacity:0.4;cursor:not-allowed">Indisponible</button>');
    html+='</div></div>';
  });
  content.innerHTML=html;
  content.querySelectorAll(".alt-card").forEach(function(card){
    var btn=card.querySelector(".ext-btn");
    if(btn.disabled)return;
    btn.onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-alt-idx"));
      var l=_currentAltLinks[idx];
      var u=l.url||l.lien||l.link||"";
      if(!u){alert("Lien non disponible");return;}
      _openExtAdModal(u,{provider:l.host||l.provider,quality:l.protection||l.quality||l._qualityGroup});
    };
  });
}

function _renderLink(l){
  var url=l.source_url||"";
  var release=l.release_name||l.source_name||"Fichier t\u00e9l\u00e9chargeable";
  var up=l.username?'<div class="li-up">par <span>'+l.username+'</span></div>':"";
  var ep="";
  if(_mediaType==="tv"){
    var sNum=l.season_number||_seasonNum||1;
    var eNum=l.episode_number||_episodeNum||1;
    ep='<div class="li-ep">S'+String(sNum).padStart(2,"0")+'E'+String(eNum).padStart(2,"0")+'</div>';
  }
  var meta='<div class="li-meta">';
  if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#fff">'+l.quality+'</span>';
  if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#fff">'+l.resolution+'</span>';
  if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#fff">'+l.file_size+'</span>';
  if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#fff">'+l.language+'</span>';
  if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#fff">'+l.codec_video+'</span>';
  if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#fff">'+l.codec_audio+'</span>';
  if(l.source_name)meta+='<span class="li-tag" style="background:#dc2626;color:#fff">'+l.source_name+'</span>';
  if(l.subtitle)meta+='<span class="li-tag" style="background:#4f46e5;color:#fff">'+l.subtitle+'</span>';
  meta+='</div>';
  var btnText=url?'T\u00e9l\u00e9charger':'Lien indisponible';
  var btnDisabled=!url?' disabled style="opacity:0.5;cursor:not-allowed"':'';
  return '<div class="li"><div class="li-top"><div class="li-header">'+ep+'<div class="li-nm">'+release+'</div>'+up+'</div>'+meta+'</div><div class="li-bottom"><button class="li-btn"'+btnDisabled+' data-url="'+encodeURIComponent(url)+'">'+btnText+'</button></div></div>';
}

function _renderLinks(){
  var c=document.getElementById(_ids.linksContainer);
  if(!c)return;
  if(_lks.length===0){c.innerHTML='<div class="em">Aucun lien direct disponible</div>';return;}
  var html='';
  for(var i=0;i<_lks.length;i++){html+=_renderLink(_lks[i]);}
  c.innerHTML=html;_bindBtns();
}

function _bindBtns(){
  var bs=document.querySelectorAll(".li-btn");
  for(var j=0;j<bs.length;j++){
    (function(btn){
      btn.onclick=function(e){
        e.preventDefault();
        var url=btn.getAttribute("data-url");
        if(!url||url==="undefined"){alert("Lien non disponible");return;}
        if(_h&&_u){_sa(decodeURIComponent(url));}
        else{
          fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
          _displayLink(decodeURIComponent(url));
        }
      };
    })(bs[j]);
  }
}

function _displayLink(url){
  var area=document.getElementById("linkDisplayArea");
  area.style.display="block";
  area.innerHTML='<div class="link-display-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Votre lien est pr\u00eat !</div><div class="link-display-url" id="linkUrlText">'+url+'</div><div class="link-display-btns"><a href="'+url+'" target="_blank" class="link-display-btn primary">Ouvrir le lien</a><button class="link-display-btn secondary" onclick="_copyLink()">Copier le lien</button></div><div class="copy-success" id="copySuccess">Lien copi\u00e9 !</div>';
  area.scrollIntoView({behavior:"smooth"});
}

window._copyLink=function(){
  var urlText=document.getElementById("linkUrlText").textContent;
  navigator.clipboard.writeText(urlText).then(function(){
    var msg=document.getElementById("copySuccess");
    msg.style.display="block";
    setTimeout(function(){msg.style.display="none";},2000);
  });
};

function _sa(url){
  _p=url;
  var o=document.getElementById(_ids.overlay);
  var bh=document.getElementById(_ids.boxHelp);
  var bk=document.getElementById(_ids.boxThanks);
  var bd=document.getElementById(_ids.boxDone);
  var pr=document.getElementById(_ids.progress);
  var bu=document.getElementById(_ids.btnUnlock);
  var dn=document.getElementById(_ids.btnDownload);
  var s1=document.getElementById(_ids.step1);
  var s2=document.getElementById(_ids.step2);
  // Reset state
  if(bh)bh.classList.remove("hi");
  if(bk)bk.classList.add("hi");
  if(bd)bd.classList.add("hi");
  if(pr)pr.style.width="0";
  if(bu)bu.classList.remove("hi");
  if(dn)dn.classList.add("hi");
  if(s1){s1.classList.add("active");s1.classList.remove("done");}
  if(s2){s2.classList.remove("active");s2.classList.remove("done");}
  o.classList.add("sh");
  // Re-bind buttons (clone to reset listeners)
  var buClone=bu.cloneNode(true);bu.parentNode.replaceChild(buClone,bu);bu=buClone;
  var dnClone=dn.cloneNode(true);dn.parentNode.replaceChild(dnClone,dn);dn=dnClone;
  var _step=0;
  bu.addEventListener("click",function(){
    if(_step>=1)return;
    _step=1;
    var adLink=document.createElement("a");
    adLink.href=_u;adLink.target="_blank";adLink.rel="noopener noreferrer";
    document.body.appendChild(adLink);adLink.click();document.body.removeChild(adLink);
    fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})}).catch(function(){});
    if(s1){s1.classList.remove("active");s1.classList.add("done");}
    if(s2)s2.classList.add("active");
    if(pr)pr.style.width="50%";
    bu.classList.add("hi");
    if(dn)dn.classList.remove("hi");
    if(bh)bh.classList.add("hi");
    if(bk)bk.classList.remove("hi");
  });
  dn.addEventListener("click",function(){
    if(_step>=2)return;
    _step=2;
    var adLink2=document.createElement("a");
    adLink2.href=AD_URL_EXT;adLink2.target="_blank";adLink2.rel="noopener noreferrer";
    document.body.appendChild(adLink2);adLink2.click();document.body.removeChild(adLink2);
    if(s2){s2.classList.remove("active");s2.classList.add("done");}
    if(pr)pr.style.width="100%";
    dn.classList.add("hi");
    if(bk)bk.classList.add("hi");
    if(bd)bd.classList.remove("hi");
    setTimeout(function(){
      o.classList.remove("sh");
      if(_p){
        fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})}).catch(function(){});
        _displayLink(_p);_p=null;
      }
    },350);
  });
}

function _loadExternal(){
  var loading=document.getElementById(_extIds.loading);
  var content=document.getElementById(_extIds.content);
  var filters=document.getElementById(_extIds.filters);
  var countBadge=document.getElementById(_extIds.count);
  fetch(_BASE+"/search?title="+encodeURIComponent(_title))
  .then(function(r){return r.json();})
  .then(function(data){
    var results=data;
    if(data&&typeof data==="object"&&!Array.isArray(data)){
      if(data.results)results=data.results;
      else if(data.data)results=data.data;
    }
    if(!Array.isArray(results)||results.length===0){
      loading.style.display="none";
      content.innerHTML='<div class="em">Aucune source externe trouv\u00e9e</div>';
      countBadge.textContent="0";return;
    }
    var first=results[0];
    for(var i=0;i<results.length;i++){
      if(results[i].tmdb_id===_tmdbId||results[i].tmdb_id===String(_tmdbId)){first=results[i];break;}
    }
    var movieId=first.id||first.movie_id||first.tmdb_id;
    _movixMovieId=movieId;
    var isTv=(_mediaType==="tv")||first.is_series||(first.type==="series");
    var dlUrl;
    if(isTv){
      var s=_seasonNum||1;var e=_episodeNum||1;
      dlUrl=_BASE+"/darkiworld/download/tv/"+movieId+"?season="+s+"&episode="+e+"&tmdbId="+_tmdbId;
    }else{
      dlUrl=_BASE+"/darkiworld/download/movie/"+movieId+"?tmdbdId="+_tmdbId;
    }
    fetch(dlUrl)
    .then(function(r){return r.json();})
    .then(function(dlData){
      loading.style.display="none";
      var links=(dlData&&dlData.success&&dlData.all)?dlData.all.filter(function(l){return l.id;}):null;
      if(!links||links.length===0){
        content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
        countBadge.textContent="0";return;
      }
      _allExtLinks=links;countBadge.textContent=links.length;
      _populateExtFilters(links);filters.style.display="flex";_renderExtLinks(links);
    }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
  }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
}

function _populateExtFilters(links){
  var qualities=new Set(),languages=new Set(),providers=new Set();
  links.forEach(function(l){if(l.quality)qualities.add(l.quality);if(l.language)languages.add(l.language);if(l.provider)providers.add(l.provider);});
  var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
  qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
  languages.forEach(function(l){var o=document.createElement("option");o.value=l;o.textContent=l;lf.appendChild(o);});
  providers.forEach(function(p){var o=document.createElement("option");o.value=p;o.textContent=p;pf.appendChild(o);});
  qf.onchange=lf.onchange=pf.onchange=_applyExtFilters;
}

function _applyExtFilters(){
  var qf=document.getElementById("extQualityFilter").value,lf=document.getElementById("extLanguageFilter").value,pf=document.getElementById("extProviderFilter").value;
  var filtered=_allExtLinks.filter(function(l){
    if(qf&&l.quality!==qf)return false;
    if(lf&&l.language!==lf)return false;
    if(pf&&l.provider!==pf)return false;
    return true;
  });
  _renderExtLinks(filtered);
}

function _formatSize(bytes){
  if(!bytes)return"N/A";
  var gb=bytes/(1024*1024*1024);
  if(gb>=1)return gb.toFixed(2)+" GB";
  return(bytes/(1024*1024)).toFixed(0)+" MB";
}

function _renderExtLinks(links){
  _currentExtLinks=links;
  var content=document.getElementById(_extIds.content);
  if(links.length===0){content.innerHTML='<div class="em">Aucun r\u00e9sultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
    html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
    if(l.sub)html+='<div class="ext-info">Sub: '+l.sub+'</div>';
    html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
    if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
    if(l.size)html+='<div class="ext-stats"><div class="ext-stat"><span class="ext-stat-label">Taille</span><span class="ext-stat-value">'+_formatSize(l.size)+'</span></div></div>';
    html+='<button class="ext-btn">Voir le lien</button></div></div>';
  });
  content.innerHTML=html;
  content.querySelectorAll(".ext-card").forEach(function(card){
    card.querySelector(".ext-btn").onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-idx"));
      _showExtDetails(_currentExtLinks[idx]);
    };
  });
}

function _openExtAdModal(finalUrl,extLink){
  fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      linkType:"external",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType,
      seasonNumber:_seasonNum||null,episodeNumber:_episodeNum||null,
      provider:(extLink&&extLink.provider)||null,hostName:(extLink&&extLink.host_name)||null,
      quality:(extLink&&extLink.quality)||null,language:(extLink&&extLink.language)||null,
      fileSize:(extLink&&extLink.size)||null
    })
  }).catch(function(){});
  window._extFinalUrl=finalUrl;
  var existingModal=document.getElementById("extAdModal");if(existingModal)existingModal.remove();
  var modal=document.createElement("div");
  modal.id="extAdModal";
  modal.style.cssText="position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95),rgba(118,75,162,0.95));display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px";
  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center";
  var t=document.createElement("h2");t.style.cssText="color:#1a1a2e;margin-bottom:6px;font-size:18px";t.textContent="Votre lien est pr\u00eat";
  var sub=document.createElement("p");sub.style.cssText="color:#666;font-size:12px;margin-bottom:14px";sub.textContent="Deux \u00e9tapes pour acc\u00e9der au t\u00e9l\u00e9chargement";
  var warn=document.createElement("div");
  warn.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e";
  warn.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Popup requis</b><span style="font-size:10px;opacity:0.8">Autorisez les popups pour continuer</span></div>';
  var sup=document.createElement("div");
  sup.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6";
  sup.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Soutenez le service gratuit</b><span style="font-size:10px;opacity:0.8">Votre clic nous aide \u00e0 rester en ligne</span></div>';
  var ad1Btn=document.createElement("a");
  ad1Btn.href=AD_URL_EXT;ad1Btn.target="_blank";ad1Btn.rel="noopener";
  ad1Btn.style.cssText="display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;text-align:center;margin-top:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;cursor:pointer";
  ad1Btn.innerHTML='\u00c9TAPE 1 / 2 <span style="background:#fff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px">PUB</span>';
  var ad2Btn=document.createElement("a");
  ad2Btn.href=_u||AD_URL_EXT;ad2Btn.target="_blank";ad2Btn.rel="noopener";
  ad2Btn.style.cssText="display:none;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;text-align:center;margin-top:8px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;cursor:pointer";
  ad2Btn.innerHTML='\u00c9TAPE 2 / 2 <span style="background:#fff;color:#ef4444;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px">PUB</span>';
  ad1Btn.onclick=function(){this.style.display="none";ad2Btn.style.display="block";};
  ad2Btn.onclick=function(){
    ad2Btn.style.display="none";
    setTimeout(function(){modal.remove();_displayLink(window._extFinalUrl);},350);
  };
  var footer=document.createElement("p");footer.style.cssText="margin-top:10px;font-size:10px;color:#999";
  footer.innerHTML='Propuls\u00e9 par <a href="https://wavewatch.top" target="_blank" style="color:#667eea">WaveWatch</a>';
  box.appendChild(t);box.appendChild(sub);box.appendChild(warn);box.appendChild(sup);box.appendChild(ad1Btn);box.appendChild(ad2Btn);box.appendChild(footer);
  modal.appendChild(box);document.body.appendChild(modal);
}

function _showExtDetails(extLink){
  if(!extLink)return;
  if(extLink.lien){_openExtAdModal(extLink.lien,extLink);return;}
  if(!extLink.id){alert("Lien non disponible pour ce fichier");return;}
  var tmpLoader=document.createElement("div");
  tmpLoader.className="decode-loading";tmpLoader.id="decodeLoader";
  tmpLoader.innerHTML='<div class="decode-loading-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><p>D\u00e9codage du lien...</p></div>';
  document.body.appendChild(tmpLoader);
  var decodeUrl = _BASE + "/darkiworld/decode/" + extLink.id + "?title_id=" + _movixMovieId;
fetch(decodeUrl).then(function(r){return r.json();})
  .then(function(data){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    if(data&&data.error==="rate_limited"){_showRateLimitModal(data.retry_at||null);return;}
    var finalUrl=null;
    if(data&&data.lien)finalUrl=data.lien;
    else if(data&&data.embed_url&&data.embed_url.lien)finalUrl=data.embed_url.lien;
    if(!finalUrl){alert("Lien non disponible pour ce fichier");return;}
    _openExtAdModal(finalUrl,extLink);
  }).catch(function(){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    alert("Erreur lors du d\u00e9codage du lien");
  });
}

_renderLinks();
_loadExternal();
})();
</script>
</body>
</html>`;
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](movieHtml, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2acb24f3._.js.map