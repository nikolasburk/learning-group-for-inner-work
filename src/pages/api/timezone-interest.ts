import type { APIRoute } from 'astro';
import { sendTimezoneInterestNotificationEmail } from '../../lib/brevo';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMIT_MS = 1500;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
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

  const db = locals.runtime.env.DB;

  try {
    await db.prepare(`INSERT INTO timezone_interest_signups (email) VALUES (?)`).bind(email).run();
  } catch {
    // Unique-index hit: this email already registered interest.
    return jsonResponse({ ok: true, alreadyRegistered: true });
  }

  const env = locals.runtime.env;
  try {
    await sendTimezoneInterestNotificationEmail(env, { to: env.NOTIFY_EMAIL, email });
  } catch (error) {
    console.error('Failed to send timezone interest notification email', error);
  }

  return jsonResponse({ ok: true });
};
