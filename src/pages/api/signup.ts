import type { APIRoute } from 'astro';
import { getNextOpenSession } from '../../data/sessions';
import { formatSessionLabel } from '../../lib/berlin-time';
import { sendConfirmationRequestEmail } from '../../lib/brevo';
import { setSignupCookie } from '../../lib/signup-cookie';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMIT_MS = 1500;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  let body: { email?: unknown; honeypot?: unknown; formLoadedAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: a real visitor never fills this hidden field.
  if (typeof body.honeypot === 'string' && body.honeypot.trim() !== '') {
    return jsonResponse({ ok: true });
  }
  // Time-trap: bots that submit near-instantly get silently dropped.
  if (typeof body.formLoadedAt === 'number' && Date.now() - body.formLoadedAt < MIN_SUBMIT_MS) {
    return jsonResponse({ ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
  }

  const nextSession = getNextOpenSession();
  if (!nextSession) {
    return jsonResponse({ error: 'Sign-ups are temporarily closed — please check back soon.' }, 503);
  }

  const db = locals.runtime.env.DB;
  const sessionLabel = formatSessionLabel(nextSession.date);

  const existing = await db
    .prepare(
      `SELECT token, status FROM open_group_signups WHERE email = ? AND session_date = ? AND status IN ('pending', 'confirmed') LIMIT 1`,
    )
    .bind(email, nextSession.date)
    .first<{ token: string; status: string }>();

  // Already confirmed — nothing to do, just make sure the UI reflects it.
  if (existing?.status === 'confirmed') {
    setSignupCookie(cookies, nextSession.date, email, 'confirmed', existing.token);
    return jsonResponse({ ok: true, alreadySignedUp: true, sessionLabel });
  }

  // Still pending — reuse the existing token and resend, rather than
  // silently no-op'ing. This is also what repairs a prior failed send
  // (e.g. a Brevo outage) instead of leaving the visitor stuck.
  let token = existing?.token;

  if (!token) {
    token = randomToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60_000).toISOString();
    try {
      await db
        .prepare(
          `INSERT INTO open_group_signups (email, session_date, token, status, expires_at) VALUES (?, ?, ?, 'pending', ?)`,
        )
        .bind(email, nextSession.date, token, expiresAt)
        .run();
    } catch {
      // Unique-index race with a concurrent duplicate request — re-read and fall through to a resend.
      const raced = await db
        .prepare(`SELECT token FROM open_group_signups WHERE email = ? AND session_date = ? LIMIT 1`)
        .bind(email, nextSession.date)
        .first<{ token: string }>();
      if (!raced) {
        return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
      }
      token = raced.token;
    }
  }

  const confirmUrl = new URL(`/api/confirm?token=${token}`, request.url).toString();
  const cancelUrl = new URL(`/api/cancel?token=${token}`, request.url).toString();

  try {
    await sendConfirmationRequestEmail(locals.runtime.env, { to: email, sessionLabel, confirmUrl, cancelUrl });
  } catch (error) {
    console.error('Failed to send confirmation email', error);
    return jsonResponse({ error: 'Something went wrong sending your confirmation email. Please try again.' }, 502);
  }

  setSignupCookie(cookies, nextSession.date, email, 'pending', token);
  return jsonResponse({ ok: true, alreadySignedUp: Boolean(existing), sessionLabel });
};
