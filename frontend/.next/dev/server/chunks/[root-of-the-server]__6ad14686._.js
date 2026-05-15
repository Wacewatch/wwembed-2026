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
                // When sorting is requested we route through aggregate({ allowDiskUse: true })
                // because find().sort() has a hard 32 MB in-memory limit and crashes on
                // large collections without a covering index. allowDiskUse lets MongoDB
                // spill the sort to disk if needed — slower but never fails.
                // maxTimeMS caps the query so it fails fast (clean 500 with a clear
                // error) instead of hanging until the upstream reverse-proxy returns 502.
                let docs;
                if (this.orders.length) {
                    const sort = {};
                    for (const o of this.orders)sort[o.column] = o.ascending ? 1 : -1;
                    const pipeline = [
                        {
                            $match: this.buildFilter()
                        },
                        {
                            $sort: sort
                        }
                    ];
                    if (this.skipN) pipeline.push({
                        $skip: this.skipN
                    });
                    if (this.limitN) pipeline.push({
                        $limit: this.limitN
                    });
                    docs = await coll.aggregate(pipeline, {
                        allowDiskUse: true,
                        maxTimeMS: 25000
                    }).toArray();
                } else {
                    let cursor = coll.find(this.buildFilter()).maxTimeMS(25000);
                    if (this.skipN) cursor = cursor.skip(this.skipN);
                    if (this.limitN) cursor = cursor.limit(this.limitN);
                    docs = await cursor.toArray();
                }
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
                const needsTtl = !!timeField // every stats collection gets a Date _ttl for purging
                ;
                const nowIso = new Date().toISOString();
                const nowDate = new Date();
                const docs = this.payload.map((d)=>{
                    const out = {
                        ...d,
                        created_at: d.created_at || nowIso
                    };
                    if (timeField && !out[timeField]) out[timeField] = out.created_at;
                    // _ttl is a real Date BSON value so a Mongo TTL index can purge it.
                    // We can't TTL on the ISO string `viewed_at` directly.
                    if (needsTtl && !out._ttl) out._ttl = nowDate;
                    return out;
                });
                const res = await coll.insertMany(docs);
                const inserted = docs.map((d, i)=>normalizeDoc({
                        ...d,
                        _id: res.insertedIds[i]
                    }));
                // Side-effect: bump parent counters. These are NOT awaited — they happen
                // in the background so the user-facing insert returns immediately.
                // This used to add 50-150 ms to every embed_views insert on the hot path.
                if (this.collectionName === "embed_views" || this.collectionName === "link_clicks") {
                    const tableName = this.collectionName;
                    (async ()=>{
                        try {
                            if (tableName === "embed_views") {
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
                                    if (typeof doc.ww_id === "string" && doc.ww_id.startsWith("ww-live-")) {
                                        const cid = doc.ww_id.slice("ww-live-".length);
                                        await db.collection("live_tv_channels").updateMany(idFilter(cid), {
                                            $inc: {
                                                view_count: 1
                                            }
                                        });
                                    }
                                }
                            } else {
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
                        } catch (err) {
                            console.error(`[mongo-shim] async counter bump failed for ${tableName}:`, err);
                        }
                    })();
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
            // Use aggregation pipeline so $inc works even when click_count is null/missing (legacy migrated rows).
            await db.collection("ads").updateOne(idFilter(args.ad_id), [
                {
                    $set: {
                        click_count: {
                            $add: [
                                {
                                    $ifNull: [
                                        "$click_count",
                                        0
                                    ]
                                },
                                1
                            ]
                        }
                    }
                }
            ]);
            return {
                data: null,
                error: null
            };
        }
        if (fnName === "increment_live_tv_views") {
            await db.collection("live_tv_channels").updateOne(idFilter(args.channel_id), [
                {
                    $set: {
                        view_count: {
                            $add: [
                                {
                                    $ifNull: [
                                        "$view_count",
                                        0
                                    ]
                                },
                                1
                            ]
                        }
                    }
                }
            ]);
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
"[project]/app/api/tmdb-stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-route] (ecmascript)");
;
;
const TMDB_API_KEY = process.env.TMDB_API_KEY || "demo";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
async function GET() {
    try {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        // Fetch TMDB stats and database stats in parallel
        const [discoverMovies, discoverTv, allApis, downloadLinks, digitalDownloadLinks] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`),
            fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`),
            supabase.from("third_party_apis").select("id, url_pattern_movie, url_pattern_tv").eq("is_active", true),
            supabase.from("download_links").select("id", {
                count: "exact",
                head: true
            }).eq("status", "approved"),
            supabase.from("digital_download_links").select("id", {
                count: "exact",
                head: true
            }).eq("status", "approved")
        ]);
        const discoverMoviesData = await discoverMovies.json();
        const discoverTvData = await discoverTv.json();
        const totalMovies = discoverMoviesData.total_results || 0;
        const totalTvShows = discoverTvData.total_results || 0;
        const estimatedEpisodes = totalTvShows * 20;
        const apis = allApis.data || [];
        const movieApiCount = apis.filter((api)=>api.url_pattern_movie && api.url_pattern_movie.trim() !== "").length;
        const tvApiCount = apis.filter((api)=>api.url_pattern_tv && api.url_pattern_tv.trim() !== "").length;
        const totalStreamingLinks = totalMovies * movieApiCount + estimatedEpisodes * tvApiCount;
        const totalDownloadLinks = (downloadLinks.count || 0) + (digitalDownloadLinks.count || 0);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            movies: totalMovies,
            tvShows: totalTvShows,
            episodes: estimatedEpisodes,
            movieApiCount,
            tvApiCount,
            totalStreamingLinks,
            totalDownloadLinks
        });
    } catch (error) {
        console.error("Error fetching TMDB stats:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            movies: 0,
            tvShows: 0,
            episodes: 0,
            movieApiCount: 0,
            tvApiCount: 0,
            totalStreamingLinks: 0,
            totalDownloadLinks: 0
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6ad14686._.js.map