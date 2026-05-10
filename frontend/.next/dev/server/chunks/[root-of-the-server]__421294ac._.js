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
"[project]/app/api/v1/digital/[wwId]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-route] (ecmascript)");
;
;
// Anti-adblock: Generate random class names
function generateRandomId(prefix = "x") {
    return prefix + Math.random().toString(36).substring(2, 10);
}
async function GET(request, { params }) {
    const { wwId } = await params;
    // Validate format: ww-software-xxx or ww-game-xxx
    const match = wwId.match(/^ww-(software|game)-/);
    if (!match) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid digital content WW ID format"
        }, {
            status: 400
        });
    }
    const contentType = match[1];
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Fetch the digital content
    const { data: content } = await supabase.from("digital_content").select("*").eq("ww_id", wwId).eq("content_type", contentType).eq("is_active", true).eq("status", "approved").single();
    if (!content) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `${contentType} not found`
        }, {
            status: 404
        });
    }
    // Fetch download links
    const { data: links } = await supabase.from("digital_download_links").select("*").eq("ww_id", wwId).eq("is_active", true).eq("status", "approved");
    // Fetch ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true);
    const hasAds = ads && ads.length > 0;
    const randomAd = hasAds ? ads[Math.floor(Math.random() * ads.length)] : null;
    const adUrl = randomAd?.ad_url || "";
    const adId = randomAd?.id || "";
    const adCount = ads ? ads.length : 0;
    // Log embed view
    await supabase.from("embed_views").insert({
        ww_id: wwId,
        tmdb_id: 0,
        media_type: contentType,
        embed_type: "download",
        referrer: request.headers.get("referer"),
        user_agent: request.headers.get("user-agent")
    });
    const downloadLinks = links || [];
    const linksJson = JSON.stringify(downloadLinks.map((l)=>({
            name: l.source_name,
            url: l.source_url,
            format: l.file_format || "",
            size: l.file_size || "",
            type: l.link_type || "direct"
        })));
    const ids = {
        overlay: generateRandomId("ov"),
        container: generateRandomId("ct"),
        timer: generateRandomId("tm"),
        progress: generateRandomId("pg"),
        btnUnlock: generateRandomId("bu"),
        btnDownload: generateRandomId("bd"),
        step1: generateRandomId("s1"),
        step2: generateRandomId("s2"),
        step3: generateRandomId("s3"),
        boxWarn: generateRandomId("bw"),
        boxTime: generateRandomId("bt"),
        boxDone: generateRandomId("dn")
    };
    const typeLabel = contentType === "software" ? "Logiciel" : "Jeu";
    const iconSvg = contentType === "software" ? '<path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>' : '<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>';
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - Telechargement</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#fff;min-height:100vh;padding:20px}
.hd{display:flex;gap:20px;margin-bottom:24px;align-items:flex-start}
.cv{width:120px;height:120px;object-fit:cover;border-radius:16px;background:linear-gradient(135deg,#1a2436,#141c2b);flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,0.3)}
.ti{flex:1}
.ti h1{font-size:20px;font-weight:700;margin-bottom:8px;color:#f1f5f9}
.ti p{font-size:13px;color:#7a8ba3;margin-bottom:6px}
.tg{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 4px 12px rgba(99,102,241,0.3)}
.tg svg{width:14px;height:14px;fill:currentColor}
.desc{color:#94a3b8;font-size:14px;margin-bottom:20px;line-height:1.6;background:linear-gradient(135deg,#141c2b,#1a2436);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
.lk{background:linear-gradient(180deg,#141c2b,#0d1219);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)}
.lk-hd{padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px}
.lk-hd svg{width:20px;height:20px;fill:#6366f1}
.lk-hd span{font-weight:600;color:#e2e8f0}
.li{display:flex;flex-direction:column;gap:12px;padding:16px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.2s}
.li:hover{background:rgba(99,102,241,0.05)}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nm{font-weight:500;font-size:15px;color:#e2e8f0}
.bg{padding:4px 10px;background:rgba(99,102,241,0.15);border-radius:6px;font-size:11px;color:#a5b4fc;font-weight:500}
.db{padding:12px 24px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;width:100%;transition:all 0.2s;box-shadow:0 4px 12px rgba(16,185,129,0.25)}
.db:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,0.35)}
.db:active{transform:scale(0.98)}
.em{color:#64748b;padding:40px;text-align:center;font-size:14px}
.ft{text-align:center;color:#475569;font-size:12px;margin-top:24px}
.ft a{color:#6366f1;text-decoration:none}
.ft a:hover{text-decoration:underline}

/* Modal - elegant dark glassmorphism */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.97));backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px}
.mo.sh{display:flex}
.mc{background:linear-gradient(180deg,#1e293b,#0f172a);border-radius:24px;padding:32px;max-width:420px;width:100%;text-align:center;border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px rgba(0,0,0,0.5)}
.mc-icon{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.mc-icon svg{width:32px;height:32px;fill:#fff}
.mc h2{color:#f1f5f9;margin-bottom:8px;font-size:22px;font-weight:700}
.mc-sub{color:#94a3b8;font-size:14px;margin-bottom:24px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:24px}
.step{width:10px;height:10px;border-radius:50%;background:#334155;transition:all 0.3s ease}
.step.ac{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px rgba(99,102,241,0.5)}
.step.dn{background:#10b981}
.bx{border-radius:12px;padding:14px 16px;margin:10px 0;text-align:left;display:flex;align-items:center;gap:12px}
.bx-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bx-icon svg{width:18px;height:18px}
.bw{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3)}
.bw .bx-icon{background:rgba(251,191,36,0.2)}
.bw .bx-icon svg{fill:#fbbf24}
.bi{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3)}
.bi .bx-icon{background:rgba(99,102,241,0.2)}
.bi .bx-icon svg{fill:#818cf8}
.bo{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)}
.bo .bx-icon{background:rgba(16,185,129,0.2)}
.bo .bx-icon svg{fill:#10b981}
.bx-txt b{display:block;font-size:13px;color:#f1f5f9;margin-bottom:2px}
.bx-txt span{font-size:12px;color:#94a3b8}
.pb{height:6px;background:#1e293b;border-radius:3px;margin:20px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7);border-radius:3px;transition:width 0.3s ease}
.bt{width:100%;padding:14px 20px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;gap:8px}
.bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.bp:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(99,102,241,0.4)}
.bg-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 8px 24px rgba(16,185,129,0.3)}
.bg-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,0.4)}
.hd-cls{display:none}
.cnt{background:rgba(251,191,36,0.15);color:#fbbf24;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}

@media(min-width:480px){
.li{flex-direction:row;justify-content:space-between;align-items:center}
.db{width:auto;padding:12px 28px}
}
</style>
</head>
<body>
<div class="hd">
${content.cover_url ? `<img src="${content.cover_url}" alt="${content.title}" class="cv">` : '<div class="cv"></div>'}
<div class="ti">
<h1>${content.title}</h1>
${content.version ? `<p>Version: ${content.version}</p>` : ""}
${content.file_size ? `<p>Taille: ${content.file_size}</p>` : ""}
<span class="tg"><svg viewBox="0 0 24 24">${iconSvg}</svg>${typeLabel}</span>
</div>
</div>
${content.description ? `<div class="desc">${content.description}</div>` : ""}
<div class="lk">
<div class="lk-hd"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Liens de telechargement</span></div>
<div id="${ids.container}"></div>
</div>
<div class="ft">Propulse par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
<script>
(function(){
var _l=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _unlocked=!_h;

function _bl(){
var c=document.getElementById(_ids.container);
if(!c)return;
if(_l.length===0){
c.innerHTML='<div class="em">Aucun lien de telechargement disponible</div>';
return;
}
var h="";
for(var i=0;i<_l.length;i++){
var l=_l[i];
h+='<div class="li">';
h+='<div class="ln">';
h+='<span class="nm">'+l.name+'</span>';
if(l.format)h+='<span class="bg">'+l.format+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div>';
h+='<button class="db" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
c.innerHTML=h;

document.querySelectorAll(".db").forEach(function(b){
b.onclick=function(){
var url=this.getAttribute("data-url");
if(_unlocked){window.open(url,"_blank");}
else{_sa(url);}
};
});
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
if(!o){
o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML=\`<div class="mc">
<div class="mc-icon"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
<h2>Telechargement</h2>
<p class="mc-sub">Une etape rapide pour acceder au fichier</p>
<div class="steps"><div class="step ac" id="${ids.step1}"></div><div class="step" id="${ids.step2}"></div><div class="step" id="${ids.step3}"></div></div>
<div class="bx bw hd-cls" id="${ids.boxWarn}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><div class="bx-txt"><b>Autorisez les popups</b><span>Desactivez votre bloqueur si necessaire</span></div></div>
<div class="bx bi" id="${ids.boxTime}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><div class="bx-txt"><b>Patientez <span id="${ids.timer}">5</span> secondes</b><span>Le compteur demarre apres le clic</span></div></div>
<div class="bx bo hd-cls" id="${ids.boxDone}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div class="bx-txt"><b>Verification terminee!</b><span>Votre telechargement est pret</span></div></div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">CONTINUER <span class="cnt">${adCount} pub</span></button>
<button class="bt bg-btn hd-cls" id="${ids.btnDownload}">TELECHARGER LE FICHIER</button>
</div>\`;
document.body.appendChild(o);

document.getElementById(_ids.btnUnlock).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
var w=window.open(_u,"_blank");
if(!w||w.closed||typeof w.closed=="undefined"){
document.getElementById(_ids.boxWarn).classList.remove("hd-cls");
return;
}
this.classList.add("hd-cls");
document.getElementById(_ids.step1).classList.remove("ac");
document.getElementById(_ids.step1).classList.add("dn");
document.getElementById(_ids.step2).classList.add("ac");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
document.getElementById(_ids.timer).textContent=s;
document.getElementById(_ids.progress).style.width=pg+"%";
if(s<=0){
clearInterval(iv);
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.add("dn");
document.getElementById(_ids.step3).classList.add("ac");
document.getElementById(_ids.boxTime).classList.add("hd-cls");
document.getElementById(_ids.boxDone).classList.remove("hd-cls");
document.getElementById(_ids.btnDownload).classList.remove("hd-cls");
_unlocked=true;
}
},1000);
};

document.getElementById(_ids.btnDownload).onclick=function(){
var ov=document.getElementById(_ids.overlay);
if(ov)ov.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
};
}
o.classList.add("sh");
// Reset state
document.getElementById(_ids.boxWarn).classList.add("hd-cls");
document.getElementById(_ids.boxTime).classList.remove("hd-cls");
document.getElementById(_ids.boxDone).classList.add("hd-cls");
document.getElementById(_ids.btnUnlock).classList.remove("hd-cls");
document.getElementById(_ids.btnDownload).classList.add("hd-cls");
document.getElementById(_ids.progress).style.width="0";
document.getElementById(_ids.timer).textContent="5";
document.getElementById(_ids.step1).classList.add("ac");
document.getElementById(_ids.step1).classList.remove("dn");
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.remove("dn");
document.getElementById(_ids.step3).classList.remove("ac");
}

_bl();
})();
</script>
</body>
</html>`;
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__421294ac._.js.map