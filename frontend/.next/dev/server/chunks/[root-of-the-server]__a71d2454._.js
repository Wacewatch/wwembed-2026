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
"[project]/app/api/openapi/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * GET /api/openapi
 * Returns the OpenAPI 3.1 spec describing the WWEmbed public API.
 * Consumed by /api-docs Swagger UI page.
 */ __turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
function getBaseUrl(req) {
    return (process.env.PUBLIC_APP_URL || process.env.REACT_APP_BACKEND_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`).replace(/\/$/, "");
}
async function GET(req) {
    const baseUrl = getBaseUrl(req);
    const spec = {
        openapi: "3.1.0",
        info: {
            title: "WWEmbed API",
            version: "1.0.0",
            description: "API publique de WWEmbed — embeds vidéo (films, séries, TV live, ebooks, musique), téléchargements, statistiques et auth. Toutes les routes sont préfixées par `/api`.",
            contact: {
                name: "WWEmbed",
                url: "https://wwembed.wavewatch.top"
            }
        },
        servers: [
            {
                url: baseUrl
            }
        ],
        tags: [
            {
                name: "Auth",
                description: "Inscription, connexion, mot de passe oublié"
            },
            {
                name: "Embed",
                description: "URLs iframe à utiliser dans une page tierce"
            },
            {
                name: "Stats",
                description: "Statistiques publiques par WW ID"
            },
            {
                name: "Database",
                description: "CRUD générique authentifié (compatible Supabase)"
            },
            {
                name: "Search",
                description: "Recherche TMDB"
            },
            {
                name: "Tracking",
                description: "Tracking de clics liens & pubs"
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "ww_access",
                    description: "JWT httpOnly cookie posé après /api/auth/login ou /register"
                }
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        error: {
                            type: "string"
                        }
                    },
                    required: [
                        "error"
                    ]
                },
                UserPublic: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        email: {
                            type: "string",
                            format: "email"
                        },
                        username: {
                            type: "string",
                            nullable: true
                        },
                        role: {
                            type: "string",
                            enum: [
                                "admin",
                                "uploader",
                                "member"
                            ]
                        },
                        created_at: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },
                AuthCredentials: {
                    type: "object",
                    required: [
                        "email",
                        "password"
                    ],
                    properties: {
                        email: {
                            type: "string",
                            format: "email"
                        },
                        password: {
                            type: "string",
                            minLength: 6
                        }
                    }
                },
                RegisterCredentials: {
                    type: "object",
                    required: [
                        "email",
                        "password"
                    ],
                    properties: {
                        email: {
                            type: "string",
                            format: "email"
                        },
                        password: {
                            type: "string",
                            minLength: 6
                        },
                        username: {
                            type: "string"
                        }
                    }
                },
                ForgotPasswordBody: {
                    type: "object",
                    required: [
                        "email"
                    ],
                    properties: {
                        email: {
                            type: "string",
                            format: "email"
                        }
                    }
                },
                ResetPasswordBody: {
                    type: "object",
                    required: [
                        "token",
                        "password"
                    ],
                    properties: {
                        token: {
                            type: "string"
                        },
                        password: {
                            type: "string",
                            minLength: 6
                        }
                    }
                },
                StatsResponse: {
                    type: "object",
                    properties: {
                        wwId: {
                            type: "string"
                        },
                        views: {
                            type: "integer"
                        },
                        clicks: {
                            type: "integer"
                        },
                        uniqueVisitors: {
                            type: "integer"
                        },
                        byDay: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    date: {
                                        type: "string",
                                        format: "date"
                                    },
                                    views: {
                                        type: "integer"
                                    },
                                    clicks: {
                                        type: "integer"
                                    }
                                }
                            }
                        }
                    }
                },
                DbQueryBody: {
                    type: "object",
                    required: [
                        "table",
                        "op"
                    ],
                    properties: {
                        table: {
                            type: "string",
                            example: "streaming_links"
                        },
                        op: {
                            type: "string",
                            enum: [
                                "select",
                                "insert",
                                "update",
                                "delete",
                                "upsert"
                            ]
                        },
                        filters: {
                            type: "array",
                            description: "Liste de filtres (compatible Supabase fluent API)",
                            items: {
                                type: "object"
                            }
                        },
                        data: {
                            type: "object",
                            description: "Payload pour insert / update / upsert"
                        },
                        order: {
                            type: "object",
                            properties: {
                                column: {
                                    type: "string"
                                },
                                ascending: {
                                    type: "boolean"
                                }
                            }
                        },
                        range: {
                            type: "object",
                            properties: {
                                from: {
                                    type: "integer"
                                },
                                to: {
                                    type: "integer"
                                }
                            }
                        },
                        count: {
                            type: "string",
                            enum: [
                                "exact",
                                "planned",
                                "estimated"
                            ]
                        },
                        select: {
                            type: "string",
                            description: "Colonnes à projeter"
                        }
                    }
                }
            }
        },
        paths: {
            "/api/health": {
                get: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Healthcheck du proxy FastAPI",
                    responses: {
                        "200": {
                            description: "OK",
                            content: {
                                "application/json": {
                                    example: {
                                        status: "ok",
                                        service: "wwembed-proxy"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/auth/login": {
                post: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Login via email + mot de passe",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/AuthCredentials"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Cookies de session posés (ww_access, ww_refresh)",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UserPublic"
                                    }
                                }
                            }
                        },
                        "401": {
                            description: "Identifiants invalides",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Error"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/auth/register": {
                post: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Inscription d'un nouveau membre",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/RegisterCredentials"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Compte créé + cookies posés",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UserPublic"
                                    }
                                }
                            }
                        },
                        "409": {
                            description: "Email déjà utilisé",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Error"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/auth/logout": {
                post: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Déconnexion (efface les cookies)",
                    security: [
                        {
                            cookieAuth: []
                        }
                    ],
                    responses: {
                        "200": {
                            description: "OK"
                        }
                    }
                }
            },
            "/api/auth/me": {
                get: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Profil de l'utilisateur courant",
                    security: [
                        {
                            cookieAuth: []
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Utilisateur courant",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UserPublic"
                                    }
                                }
                            }
                        },
                        "401": {
                            description: "Non authentifié"
                        }
                    }
                }
            },
            "/api/auth/forgot-password": {
                post: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Demande d'un email de réinitialisation de mot de passe",
                    description: "Envoie un email Resend si l'email existe. Renvoie toujours `{ ok: true }` pour éviter l'énumération des emails.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ForgotPasswordBody"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Demande prise en compte",
                            content: {
                                "application/json": {
                                    example: {
                                        ok: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/auth/reset-password": {
                post: {
                    tags: [
                        "Auth"
                    ],
                    summary: "Finalise la réinitialisation",
                    description: "Token reçu par email. Pose les cookies et auto-login.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ResetPasswordBody"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Mot de passe mis à jour, cookies posés",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UserPublic"
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Token invalide / expiré / mot de passe trop court",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Error"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/streaming/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed streaming (film/série) — URL iframe-safe",
                    description: "À utiliser comme `src` d'un `<iframe>`. Renvoie l'HTML player.",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            example: "ww_streaming_xxx"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Player HTML",
                            content: {
                                "text/html": {}
                            }
                        },
                        "404": {
                            description: "wwId inconnu"
                        }
                    }
                }
            },
            "/api/v1/download/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed liens de téléchargement",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Page download HTML",
                            content: {
                                "text/html": {}
                            }
                        }
                    }
                }
            },
            "/api/v1/live/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed TV Live (HLS)",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "HLS player HTML",
                            content: {
                                "text/html": {}
                            }
                        }
                    }
                }
            },
            "/api/v1/ebook/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed ebook reader",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Reader HTML",
                            content: {
                                "text/html": {}
                            }
                        }
                    }
                }
            },
            "/api/v1/music/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed audio player",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Player HTML",
                            content: {
                                "text/html": {}
                            }
                        }
                    }
                }
            },
            "/api/v1/digital/{wwId}": {
                get: {
                    tags: [
                        "Embed"
                    ],
                    summary: "Embed digital content (auto-detect type)",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "HTML",
                            content: {
                                "text/html": {}
                            }
                        }
                    }
                }
            },
            "/api/v1/stats/{wwId}": {
                get: {
                    tags: [
                        "Stats"
                    ],
                    summary: "Statistiques publiques d'un embed",
                    parameters: [
                        {
                            name: "wwId",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Stats agrégées",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/StatsResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/db": {
                post: {
                    tags: [
                        "Database"
                    ],
                    summary: "CRUD générique (compatible client Supabase)",
                    description: "Endpoint utilisé en interne par la fluent API `supabase.from(...).select().eq()`. Soumis à RBAC : seules les tables autorisées par rôle sont accessibles.",
                    security: [
                        {
                            cookieAuth: []
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/DbQueryBody"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Résultat",
                            content: {
                                "application/json": {
                                    example: {
                                        data: [
                                            {
                                                id: "abc",
                                                name: "Example"
                                            }
                                        ],
                                        count: 1,
                                        error: null
                                    }
                                }
                            }
                        },
                        "403": {
                            description: "RBAC refus"
                        }
                    }
                }
            },
            "/api/search": {
                get: {
                    tags: [
                        "Search"
                    ],
                    summary: "Recherche multi (TMDB)",
                    parameters: [
                        {
                            name: "q",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            example: "matrix"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Résultats TMDB"
                        }
                    }
                }
            },
            "/api/tmdb/{type}/{id}": {
                get: {
                    tags: [
                        "Search"
                    ],
                    summary: "Détail TMDB (film / série)",
                    parameters: [
                        {
                            name: "type",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string",
                                enum: [
                                    "movie",
                                    "tv"
                                ]
                            }
                        },
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Métadonnées TMDB"
                        }
                    }
                }
            },
            "/api/link-click": {
                post: {
                    tags: [
                        "Tracking"
                    ],
                    summary: "Track un clic sur un lien externe",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                example: {
                                    link_id: "abc",
                                    link_type: "download",
                                    ww_id: "ww_xxx",
                                    provider: "1fichier",
                                    host: "1fichier.com"
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "OK"
                        }
                    }
                }
            },
            "/api/admin/stats": {
                get: {
                    tags: [
                        "Stats"
                    ],
                    summary: "Stats admin globales (agrégées MongoDB pipeline)",
                    security: [
                        {
                            cookieAuth: []
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Bundle de stats"
                        },
                        "403": {
                            description: "Réservé aux admins"
                        }
                    }
                }
            }
        }
    };
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(spec, {
        headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300"
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a71d2454._.js.map