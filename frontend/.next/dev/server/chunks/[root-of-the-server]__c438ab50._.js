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
"[project]/app/api/tmdb/[type]/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_react-dom@19.2.0_react@19.2.0__react@19.2.0/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tmdb.ts [app-route] (ecmascript)");
;
;
async function GET(request, { params }) {
    const { type, id } = await params;
    const tmdbId = Number.parseInt(id, 10);
    if (isNaN(tmdbId)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid ID"
        }, {
            status: 400
        });
    }
    try {
        let data;
        if (type === "movie") {
            data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMovieDetails"])(tmdbId);
        } else if (type === "tv") {
            data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTVDetails"])(tmdbId);
        } else {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid type"
            }, {
                status: 400
            });
        }
        if (!data) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Not found"
            }, {
                status: 404
            });
        }
        const title = "title" in data ? data.title : data.name;
        const poster = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tmdb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPosterUrl"])(data.poster_path, "w200");
        const seasons = "number_of_seasons" in data ? data.number_of_seasons : undefined;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            title,
            poster,
            seasons
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to fetch"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c438ab50._.js.map