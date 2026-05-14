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
"[project]/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Server-side client backed by MongoDB.
 * Unlike `admin.ts`, this client is auth-aware: `auth.getUser()` reads the
 * JWT cookie and returns the current user (so server pages like
 * /dashboard/page.tsx work the same way they did under Supabase).
 */ __turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$shim$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/shim.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/auth.ts [app-route] (ecmascript)");
;
;
class AuthAwareClient extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$shim$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MongoSupabaseClient"] {
    auth = {
        getUser: async ()=>{
            const u = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            return {
                data: {
                    user: u ? {
                        ...u,
                        id: u.id
                    } : null
                },
                error: null
            };
        },
        getSession: async ()=>{
            const u = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            return {
                data: {
                    session: u ? {
                        user: u
                    } : null
                },
                error: null
            };
        },
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
            deleteUser: async ()=>({
                    data: null,
                    error: null
                })
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
async function createClient() {
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$shim$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createMongoClient"])();
    const c = new AuthAwareClient();
    // expose .from / .rpc from base
    c.from = base.from.bind(base);
    c.rpc = base.rpc.bind(base);
    return c;
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
"[project]/app/api/media/[type]/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tmdb.ts [app-route] (ecmascript)");
;
;
;
function generateStreamingUrl(pattern, mediaType, tmdbId, seasonNumber, episodeNumber) {
    let url = pattern.replace(/{tmdb_id}/g, String(tmdbId)).replace(/{media_type}/g, mediaType);
    if (mediaType === "movie") {
        // For movies, remove season/episode placeholders and clean up URL
        url = url.replace(/{season}/g, "").replace(/{episode}/g, "").replace(/{season_number}/g, "").replace(/{episode_number}/g, "");
    } else {
        // For TV shows, replace with actual values
        url = url.replace(/{season}/g, String(seasonNumber || 1)).replace(/{episode}/g, String(episodeNumber || 1)).replace(/{season_number}/g, String(seasonNumber || 1)).replace(/{episode_number}/g, String(episodeNumber || 1));
    }
    // Clean up URL: remove trailing slashes and multiple consecutive slashes (except after protocol)
    url = url.replace(/([^:]\/)\/+/g, "$1") // Replace multiple slashes with single (but not after http:)
    .replace(/\/+$/g, ""); // Remove trailing slashes
    return url;
}
async function GET(request, { params }) {
    const { type, id } = await params;
    const tmdbId = Number.parseInt(id, 10);
    if (![
        "movie",
        "tv"
    ].includes(type) || isNaN(tmdbId)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid parameters"
        }, {
            status: 400
        });
    }
    const mediaType = type;
    const searchParams = request.nextUrl.searchParams;
    const seasonParam = searchParams.get("season");
    const episodeParam = searchParams.get("episode");
    const seasonNumber = seasonParam ? Number.parseInt(seasonParam, 10) : null;
    const episodeNumber = episodeParam ? Number.parseInt(episodeParam, 10) : null;
    const wwId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateWWId"])(mediaType, tmdbId, seasonNumber, episodeNumber);
    // Get TMDB data
    const tmdbData = mediaType === "movie" ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMovieDetails"])(tmdbId) : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTVDetails"])(tmdbId);
    if (!tmdbData) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Media not found on TMDB"
        }, {
            status: 404
        });
    }
    let episodeData = null;
    if (mediaType === "tv" && seasonNumber !== null && episodeNumber !== null) {
        episodeData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEpisodeDetails"])(tmdbId, seasonNumber, episodeNumber);
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    let streamingQuery = supabase.from("streaming_links").select("*").eq("tmdb_id", tmdbId).eq("media_type", mediaType).eq("is_active", true);
    // For TV shows, get links matching the specific season/episode or generic ones
    if (mediaType === "tv") {
        if (seasonNumber !== null && episodeNumber !== null) {
            // Get specific episode links OR generic show/season links
            streamingQuery = streamingQuery.or(`and(season_number.eq.${seasonNumber},episode_number.eq.${episodeNumber}),and(season_number.is.null,episode_number.is.null)`);
        } else if (seasonNumber !== null) {
            // Get season-level links or generic show links
            streamingQuery = streamingQuery.or(`and(season_number.eq.${seasonNumber},episode_number.is.null),and(season_number.is.null,episode_number.is.null)`);
        }
    }
    const { data: userStreamingLinks } = await streamingQuery.order("created_at", {
        ascending: false
    });
    // Get auto-generated links from third-party APIs
    const { data: apis } = await supabase.from("third_party_apis").select("*").eq("api_type", "streaming").eq("is_active", true).order("priority", {
        ascending: true
    });
    const autoStreamingLinks = (apis || []).filter((api)=>{
        if (mediaType === "movie") {
            return !!(api.url_pattern_movie || api.url_pattern);
        } else {
            return !!api.url_pattern_tv;
        }
    }).map((api)=>{
        const pattern = mediaType === "movie" ? api.url_pattern_movie || api.url_pattern || "" : api.url_pattern_tv || api.url_pattern || "";
        const url = generateStreamingUrl(pattern, mediaType, tmdbId, seasonNumber, episodeNumber);
        return {
            id: `auto-${api.id}`,
            tmdb_id: tmdbId,
            media_type: mediaType,
            ww_id: wwId,
            source_name: api.name,
            source_url: url,
            quality: "HD",
            language: "multi",
            is_auto_generated: true,
            is_verified: false,
            is_active: true,
            created_at: new Date().toISOString(),
            season_number: seasonNumber,
            episode_number: episodeNumber
        };
    });
    // Combine all streaming links
    const streamingLinks = [
        ...autoStreamingLinks,
        ...userStreamingLinks || []
    ];
    let downloadQuery = supabase.from("download_links").select("*").eq("tmdb_id", tmdbId).eq("media_type", mediaType).eq("is_active", true);
    if (mediaType === "tv") {
        if (seasonNumber !== null && episodeNumber !== null) {
            downloadQuery = downloadQuery.or(`and(season_number.eq.${seasonNumber},episode_number.eq.${episodeNumber}),and(season_number.is.null,episode_number.is.null)`);
        } else if (seasonNumber !== null) {
            downloadQuery = downloadQuery.or(`and(season_number.eq.${seasonNumber},episode_number.is.null),and(season_number.is.null,episode_number.is.null)`);
        }
    }
    const { data: downloadLinks } = await downloadQuery.order("created_at", {
        ascending: false
    });
    // Log API usage with season/episode
    await supabase.from("api_usage").insert({
        endpoint: `/api/media/${type}/${id}`,
        method: "GET",
        ww_id: wwId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        response_status: 200,
        referrer: request.headers.get("referer"),
        user_agent: request.headers.get("user-agent")
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        tmdbData,
        episodeData,
        streamingLinks,
        downloadLinks: downloadLinks || [],
        wwId,
        seasonNumber,
        episodeNumber
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__51f87cd8._.js.map