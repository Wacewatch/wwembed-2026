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
"[project]/lib/email/resend.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Resend client wrapper.
 * - Uses RESEND_API_KEY from /app/frontend/.env
 * - Sender configurable via RESEND_SENDER_EMAIL / RESEND_SENDER_NAME
 * - Falls back to onboarding@resend.dev if domain not yet verified
 *
 * IMPORTANT: in Resend testing mode (default sender = onboarding@resend.dev),
 * emails will only be delivered to the email address that owns the API key
 * account. To deliver to any address, verify the custom domain in Resend.
 */ __turbopack_context__.s([
    "sendEmail",
    ()=>sendEmail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/resend/dist/index.mjs [app-route] (ecmascript)");
;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev";
const SENDER_NAME = process.env.RESEND_SENDER_NAME || "WWEmbed";
let _client = null;
function getClient() {
    if (!RESEND_API_KEY) return null;
    if (!_client) _client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Resend"](RESEND_API_KEY);
    return _client;
}
async function sendEmail(params) {
    const client = getClient();
    if (!client) {
        return {
            ok: false,
            error: "RESEND_API_KEY not configured"
        };
    }
    try {
        const { data, error } = await client.emails.send({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [
                params.to
            ],
            subject: params.subject,
            html: params.html,
            text: params.text,
            replyTo: params.replyTo
        });
        if (error) return {
            ok: false,
            error: error.message || String(error)
        };
        return {
            ok: true,
            id: data?.id
        };
    } catch (e) {
        return {
            ok: false,
            error: e?.message || String(e)
        };
    }
}
}),
"[project]/lib/email/templates.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * HTML email templates for WWEmbed.
 * Inline-CSS only, table-based layout for max compat across email clients.
 */ __turbopack_context__.s([
    "passwordResetTemplate",
    ()=>passwordResetTemplate
]);
function passwordResetTemplate({ username, resetUrl, expiresInMinutes }) {
    const subject = "Réinitialisation de ton mot de passe — WWEmbed";
    const text = `Bonjour ${username},

On a reçu une demande de réinitialisation de mot de passe pour ton compte WWEmbed.

Pour choisir un nouveau mot de passe, ouvre ce lien (valable ${expiresInMinutes} minutes) :
${resetUrl}

Si tu n'es pas à l'origine de cette demande, ignore simplement cet email — ton mot de passe restera inchangé.

— L'équipe WWEmbed`;
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:linear-gradient(180deg,#11151c 0%,#0d1117 100%);border:1px solid rgba(120,200,255,0.12);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <div style="display:inline-block;padding:8px 14px;background:rgba(120,200,255,0.08);border:1px solid rgba(120,200,255,0.18);border-radius:999px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#7cd3ff;">WWEmbed</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:600;color:#f1f5f9;">Bonjour ${escapeHtml(username)},</h1>
              <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#9ca3af;">
                On a reçu une demande de réinitialisation de mot de passe pour ton compte. Clique sur le bouton ci-dessous pour en choisir un nouveau.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:#7cd3ff;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#0d1117;text-decoration:none;border-radius:12px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                Le lien expire dans <strong style="color:#9ca3af;">${expiresInMinutes} minutes</strong>.<br/>
                Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe ne sera pas modifié.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 28px 40px;">
              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br/>
                <a href="${resetUrl}" style="color:#7cd3ff;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 16px 0;" />
              <p style="margin:0;font-size:12px;color:#4b5563;">
                Cet email a été envoyé automatiquement par WWEmbed. Merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return {
        subject,
        html,
        text
    };
}
function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
}),
"[project]/app/api/auth/forgot-password/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Response: { ok: true } regardless of whether the email exists
 *           (avoid leaking which emails are registered).
 *
 * On success: stores a single-use token in `password_reset_tokens` and
 * sends a Resend email with the reset link.
 */ __turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mongo/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2f$resend$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/email/resend.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2f$templates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/email/templates.ts [app-route] (ecmascript)");
;
;
;
;
;
const TOKEN_TTL_MINUTES = 30;
function getBaseUrl(req) {
    return (process.env.PUBLIC_APP_URL || process.env.REACT_APP_BACKEND_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`).replace(/\/$/, "");
}
async function POST(req) {
    const body = await req.json().catch(()=>({}));
    const rawEmail = body?.email;
    if (!rawEmail || typeof rawEmail !== "string") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Email requis"
        }, {
            status: 400
        });
    }
    const email = rawEmail.toLowerCase().trim();
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mongo$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const user = await db.collection("users").findOne({
        email
    });
    // Always respond OK to avoid email enumeration.
    if (!user) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true
        });
    }
    // Generate token (URL-safe), hash before storing.
    const rawToken = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(32).toString("base64url");
    const tokenHash = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60_000);
    // Invalidate previous tokens for this user.
    await db.collection("password_reset_tokens").deleteMany({
        user_id: user._id
    });
    await db.collection("password_reset_tokens").insertOne({
        user_id: user._id,
        email,
        token_hash: tokenHash,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        used_at: null
    });
    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;
    const tpl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2f$templates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["passwordResetTemplate"])({
        username: user.username || email.split("@")[0],
        resetUrl,
        expiresInMinutes: TOKEN_TTL_MINUTES
    });
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2f$resend$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendEmail"])({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text
    });
    if (!result.ok) {
        // Log server-side, still respond ok to user (don't leak provider state).
        console.error("[forgot-password] Resend error:", result.error);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: true
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__460dcbcb._.js.map