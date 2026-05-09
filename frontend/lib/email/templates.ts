/**
 * HTML email templates for WWEmbed.
 * Inline-CSS only, table-based layout for max compat across email clients.
 */

export interface PasswordResetTemplateProps {
  username: string
  resetUrl: string
  expiresInMinutes: number
}

export function passwordResetTemplate({
  username,
  resetUrl,
  expiresInMinutes,
}: PasswordResetTemplateProps): { subject: string; html: string; text: string } {
  const subject = "Réinitialisation de ton mot de passe — WWEmbed"

  const text = `Bonjour ${username},

On a reçu une demande de réinitialisation de mot de passe pour ton compte WWEmbed.

Pour choisir un nouveau mot de passe, ouvre ce lien (valable ${expiresInMinutes} minutes) :
${resetUrl}

Si tu n'es pas à l'origine de cette demande, ignore simplement cet email — ton mot de passe restera inchangé.

— L'équipe WWEmbed`

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
</html>`

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
