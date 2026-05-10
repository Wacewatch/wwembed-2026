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
"[project]/app/api/v1/live/[wwId]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$embed$2d$ad$2d$modal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/embed-ad-modal.ts [app-route] (ecmascript)");
;
;
;
async function GET(request, props) {
    try {
        const params = await props.params;
        const { wwId } = params;
        const match = wwId.match(/^ww-live-(.+)$/i);
        if (!match) return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"]("Invalid WW ID format", {
            status: 400
        });
        const channelIdPart = match[1];
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        // Lookup by id (shim auto-handles 24-hex Mongo ObjectId or legacy UUID)
        let channel = null;
        const { data: byId } = await supabase.from("live_tv_channels").select("*").eq("id", channelIdPart).eq("is_active", true).eq("status", "approved").maybeSingle();
        channel = byId;
        // Fallback: prefix match (for shortened URL ids)
        if (!channel) {
            const { data } = await supabase.from("live_tv_channels").select("*").ilike("id", channelIdPart + "%").eq("is_active", true).eq("status", "approved").maybeSingle();
            channel = data;
        }
        if (!channel) return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"]("Channel not found", {
            status: 404
        });
        const { data: sources } = await supabase.from("live_tv_sources").select("*").eq("channel_id", channel.id).eq("is_active", true).eq("status", "approved").order("priority", {
            ascending: true
        });
        const allSources = sources && sources.length > 0 ? sources.map((s, i)=>({
                name: s.source_name || "Source #" + (i + 1),
                url: s.stream_url,
                quality: s.quality || "HD",
                language: s.language || "VO",
                priority: s.priority || 999
            })) : channel.stream_url ? [
            {
                name: "Source #1",
                url: channel.stream_url,
                quality: channel.quality || "HD",
                language: channel.language || "VO",
                priority: 1
            }
        ] : [];
        if (allSources.length === 0) return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"]("No sources available", {
            status: 404
        });
        const AD_URL_1 = "https://otieu.com/4/9248013";
        const AD_URL_2 = "https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5";
        const hasAds = true;
        const referer = request.headers.get("referer") || null;
        await supabase.from("embed_views").insert({
            ww_id: wwId,
            media_type: "live",
            embed_type: "live",
            tmdb_id: null,
            referrer: referer,
            user_agent: request.headers.get("user-agent")
        });
        const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c");
        const channelName = channel.channel_name || "Live TV";
        const channelLogo = channel.channel_logo || "";
        const adModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$embed$2d$ad$2d$modal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAdModal2Step"])({
            variant: "livetv",
            ad1: AD_URL_1,
            ad2: AD_URL_2,
            title: "Accédez au flux en direct",
            subtitle: "Deux étapes pour débloquer le contenu",
            doneText: "Cliquez pour démarrer la lecture",
            finalBtnLabel: "DÉMARRER LA LECTURE",
            showFinalBtn: true,
            autoShow: true,
            defaultOnComplete: "function(){if(typeof startPlayer==='function')startPlayer();}"
        });
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>${channelName} - Live TV</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff;overflow:hidden;height:100vh}
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#151520;border-bottom:1px solid #222}
.top-left{display:flex;align-items:center;gap:12px}
.logo{color:#e63946;font-weight:700;font-size:14px}
.ch-info{display:flex;align-items:center;gap:8px}
.ch-icon{width:32px;height:32px;border-radius:6px;object-fit:cover;background:#222}
.ch-name{font-size:14px;font-weight:600}
.live-badge{background:#e63946;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700}
.top-right{display:flex;gap:8px}
.btn{background:#222;border:1px solid #333;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600}
.btn:hover{background:#333}
.container{height:calc(100vh - 60px);position:relative}
.player{width:100%;height:100%}
.player video,.player iframe{width:100%;height:100%;display:block;background:#000}
.player iframe{border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555}
.dropdown{position:relative}
.dropdown-menu{position:absolute;top:calc(100% + 8px);right:0;background:#1a1a28;border:1px solid #333;border-radius:10px;padding:8px;min-width:200px;display:none;z-index:200;max-height:60vh;overflow-y:auto}
.dropdown-menu.show{display:block}
.src-item{padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:4px;border:1px solid transparent}
.src-item:hover{background:#222}
.src-item.active{background:#1a3a2a;border-color:#22c55e}
.src-name{font-size:13px;font-weight:600}
.src-tags{display:flex;gap:4px;margin-top:4px}
.tag{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-q{background:#7c3aed;color:#fff}
.tag-l{background:#0891b2;color:#fff}
${adModal.css}
</style>
</head>
<body>
<div class="top">
<div class="top-left">
<div class="logo">▶ WWEMBED</div>
<div class="ch-info">
<img class="ch-icon" src="${channelLogo}" alt="">
<span class="ch-name">${channelName}</span>
<span class="live-badge">● LIVE</span>
</div>
</div>
<div class="top-right">
<div class="dropdown">
<button class="btn" id="srcBtn">📡 <span id="srcLabel">Source #1</span></button>
<div class="dropdown-menu" id="srcMenu"></div>
</div>
</div>
</div>
<div class="container">
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

${adModal.html}

<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _hls=null;

function $(id){return document.getElementById(id);}

function startPlayer(){
if(_started)return;
_started=true;
buildSrcList();
if(_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function buildSrcList(){
var m=$("srcMenu");
if(!m||!_src.length)return;
m.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(idx){
var s=_src[idx];
var d=document.createElement("div");
d.className="src-item"+(idx===_idx?" active":"");
d.innerHTML='<div class="src-name">'+s.name+'</div><div class="src-tags"><span class="tag tag-q">'+(s.quality||"HD")+'</span><span class="tag tag-l">'+(s.language||"VO")+'</span></div>';
d.onclick=function(){_idx=idx;buildSrcList();$("srcLabel").textContent=s.name;$("srcMenu").classList.remove("show");if(_started)loadPlayer();};
m.appendChild(d);
})(i);
}
}

function loadPlayer(){
var p=$("player");if(!p||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
if(_hls){try{_hls.destroy();}catch(e){}_hls=null;}
if(url.indexOf(".m3u8")>-1&&typeof Hls!=="undefined"&&Hls.isSupported()){
p.innerHTML='<video id="vid" controls autoplay></video>';
var v=$("vid");
_hls=new Hls();_hls.loadSource(url);_hls.attachMedia(v);
_hls.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){});});
}else if(url.indexOf(".m3u8")>-1){
p.innerHTML='<video id="vid" src="'+url+'" controls autoplay></video>';
$("vid").play().catch(function(){});
}else{
p.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}
}

$("srcBtn").onclick=function(){$("srcMenu").classList.toggle("show");};
document.addEventListener("click",function(e){if(!e.target.closest(".dropdown"))$("srcMenu").classList.remove("show");});

${adModal.js}
<\/script>
</body>
</html>`;
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        });
    } catch (error) {
        console.error("[v0] Live route error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ef07bc6d._.js.map