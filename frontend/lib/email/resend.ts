/**
 * Resend client wrapper.
 * - Uses RESEND_API_KEY from /app/frontend/.env
 * - Sender configurable via RESEND_SENDER_EMAIL / RESEND_SENDER_NAME
 * - Falls back to onboarding@resend.dev if domain not yet verified
 *
 * IMPORTANT: in Resend testing mode (default sender = onboarding@resend.dev),
 * emails will only be delivered to the email address that owns the API key
 * account. To deliver to any address, verify the custom domain in Resend.
 */
import { Resend } from "resend"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev"
const SENDER_NAME = process.env.RESEND_SENDER_NAME || "WWEmbed"

let _client: Resend | null = null

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null
  if (!_client) _client = new Resend(RESEND_API_KEY)
  return _client
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = getClient()
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY not configured" }
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    })
    if (error) return { ok: false, error: (error as any).message || String(error) }
    return { ok: true, id: data?.id }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}
