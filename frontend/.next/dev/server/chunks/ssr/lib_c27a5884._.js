module.exports = [
"[project]/lib/mongo/browser-shim.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Browser-side query shim — sends a serialized "ops chain" to /api/db.
 * The server reconstructs the chain on top of the real MongoDB shim.
 *
 * Operation list shape: [["eq", "col", "val"], ["order", "col", true], ...]
 */ __turbopack_context__.s([
    "BrowserSupabaseClient",
    ()=>BrowserSupabaseClient,
    "createBrowserClient",
    ()=>createBrowserClient
]);
class BrowserQuery {
    table;
    mode;
    payload;
    selectStr;
    upsertOnConflict;
    isSingle;
    isMaybeSingle;
    countMode;
    headOnly;
    chain;
    constructor(table){
        this.table = table;
        this.mode = "select";
        this.payload = null;
        this.isSingle = false;
        this.isMaybeSingle = false;
        this.headOnly = false;
        this.chain = [];
    }
    select(cols, opts) {
        this.mode = "select";
        this.selectStr = cols;
        if (opts?.count) this.countMode = opts.count;
        if (opts?.head) this.headOnly = true;
        return this;
    }
    insert(values) {
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
    // filters / modifiers — pushed onto chain as ["op", ...args]
    eq(c, v) {
        this.chain.push([
            "eq",
            c,
            v
        ]);
        return this;
    }
    neq(c, v) {
        this.chain.push([
            "neq",
            c,
            v
        ]);
        return this;
    }
    gt(c, v) {
        this.chain.push([
            "gt",
            c,
            v
        ]);
        return this;
    }
    gte(c, v) {
        this.chain.push([
            "gte",
            c,
            v
        ]);
        return this;
    }
    lt(c, v) {
        this.chain.push([
            "lt",
            c,
            v
        ]);
        return this;
    }
    lte(c, v) {
        this.chain.push([
            "lte",
            c,
            v
        ]);
        return this;
    }
    in(c, arr) {
        this.chain.push([
            "in",
            c,
            arr
        ]);
        return this;
    }
    is(c, v) {
        this.chain.push([
            "is",
            c,
            v
        ]);
        return this;
    }
    ilike(c, p) {
        this.chain.push([
            "ilike",
            c,
            p
        ]);
        return this;
    }
    like(c, p) {
        this.chain.push([
            "like",
            c,
            p
        ]);
        return this;
    }
    contains(c, v) {
        this.chain.push([
            "contains",
            c,
            v
        ]);
        return this;
    }
    not(c, op, v) {
        this.chain.push([
            "not",
            c,
            op,
            v
        ]);
        return this;
    }
    or(filterStr) {
        this.chain.push([
            "or",
            filterStr
        ]);
        return this;
    }
    match(o) {
        for (const k of Object.keys(o))this.chain.push([
            "eq",
            k,
            o[k]
        ]);
        return this;
    }
    order(column, opts) {
        this.chain.push([
            "order",
            column,
            opts?.ascending !== false
        ]);
        return this;
    }
    limit(n) {
        this.chain.push([
            "limit",
            n
        ]);
        return this;
    }
    range(from, to) {
        this.chain.push([
            "range",
            from,
            to
        ]);
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
    serialize() {
        return {
            table: this.table,
            mode: this.mode,
            chain: this.chain,
            payload: this.payload,
            selectStr: this.selectStr,
            upsertOnConflict: this.upsertOnConflict,
            isSingle: this.isSingle,
            isMaybeSingle: this.isMaybeSingle,
            countMode: this.countMode,
            headOnly: this.headOnly
        };
    }
    async _exec() {
        try {
            const res = await fetch("/api/db", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(this.serialize())
            });
            const json = await res.json();
            return json;
        } catch (e) {
            return {
                data: null,
                error: {
                    message: e?.message || "Network error"
                }
            };
        }
    }
    then(onfulfilled, onrejected) {
        return this._exec().then(onfulfilled, onrejected);
    }
}
class BrowserAuth {
    listeners = [];
    cachedUser = null;
    async getUser() {
        try {
            const res = await fetch("/api/auth/me", {
                credentials: "include"
            });
            if (!res.ok) return {
                data: {
                    user: null
                },
                error: null
            };
            const u = await res.json();
            this.cachedUser = u;
            return {
                data: {
                    user: u
                },
                error: null
            };
        } catch  {
            return {
                data: {
                    user: null
                },
                error: null
            };
        }
    }
    async getSession() {
        const r = await this.getUser();
        return {
            data: {
                session: r.data.user ? {
                    user: r.data.user
                } : null
            },
            error: null
        };
    }
    async signInWithPassword({ email, password }) {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password
            })
        });
        const json = await res.json();
        if (!res.ok) return {
            data: {
                user: null,
                session: null
            },
            error: {
                message: json.error || "Login failed"
            }
        };
        this.cachedUser = json;
        this.listeners.forEach((cb)=>cb("SIGNED_IN", {
                user: json
            }));
        return {
            data: {
                user: json,
                session: {
                    user: json
                }
            },
            error: null
        };
    }
    async signUp({ email, password, options }) {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password,
                username: options?.data?.username
            })
        });
        const json = await res.json();
        if (!res.ok) return {
            data: {
                user: null,
                session: null
            },
            error: {
                message: json.error || "Signup failed"
            }
        };
        this.cachedUser = json;
        this.listeners.forEach((cb)=>cb("SIGNED_IN", {
                user: json
            }));
        return {
            data: {
                user: json,
                session: {
                    user: json
                }
            },
            error: null
        };
    }
    async signOut() {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        this.cachedUser = null;
        this.listeners.forEach((cb)=>cb("SIGNED_OUT", null));
        return {
            error: null
        };
    }
    onAuthStateChange(cb) {
        this.listeners.push(cb);
        this.getUser().then((r)=>{
            if (r.data.user) cb("SIGNED_IN", {
                user: r.data.user
            });
            else cb("SIGNED_OUT", null);
        });
        return {
            data: {
                subscription: {
                    unsubscribe: ()=>{
                        this.listeners = this.listeners.filter((c)=>c !== cb);
                    }
                }
            }
        };
    }
    async resetPasswordForEmail(_email) {
        return {
            data: null,
            error: null
        };
    }
    async updateUser(_attrs) {
        return {
            data: {
                user: this.cachedUser
            },
            error: null
        };
    }
}
class BrowserSupabaseClient {
    auth = new BrowserAuth();
    from(table) {
        return new BrowserQuery(table);
    }
    async rpc(fn, args = {}) {
        const res = await fetch("/api/rpc", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                fn,
                args
            })
        });
        const json = await res.json();
        return json;
    }
}
function createBrowserClient() {
    return new BrowserSupabaseClient();
}
}),
"[project]/lib/supabase/client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Drop-in replacement: browser-side client backed by /api/db + /api/auth/*.
 * All existing UI code keeps using `createClient()` exactly as before.
 */ __turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$browser$2d$shim$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/browser-shim.ts [app-ssr] (ecmascript)");
;
function createClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$browser$2d$shim$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createBrowserClient"])();
}
}),
"[project]/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/lib/tmdb.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
];

//# sourceMappingURL=lib_c27a5884._.js.map