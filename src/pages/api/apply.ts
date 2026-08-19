import type { APIRoute } from 'astro';
import { getNextClosedCycle } from '../../data/closed-cycles';
import { sendApplicationNotificationEmail, sendApplicationReceivedEmail } from '../../lib/brevo';
import { subscribeToNewsletter } from '../../lib/newsletter';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMIT_MS = 1500;
const MAX_FIELD_LENGTH = 2000;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: {
    name?: unknown;
    email?: unknown;
    whyNow?: unknown;
    commitment?: unknown;
    anythingElse?: unknown;
    newsletterOptIn?: unknown;
    honeypot?: unknown;
    formLoadedAt?: unknown;
  };
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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const whyNow = typeof body.whyNow === 'string' ? body.whyNow.trim() : '';
  const commitment = typeof body.commitment === 'string' ? body.commitment.trim() : '';
  const anythingElse = typeof body.anythingElse === 'string' ? body.anythingElse.trim() : '';
  const newsletterOptIn = body.newsletterOptIn === true;

  if (!name || name.length > MAX_FIELD_LENGTH) {
    return jsonResponse({ error: 'Please enter your name.' }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
  }
  if (!whyNow || whyNow.length > MAX_FIELD_LENGTH) {
    return jsonResponse({ error: 'Please share why now feels like the right time.' }, 400);
  }
  if (!commitment || commitment.length > MAX_FIELD_LENGTH) {
    return jsonResponse({ error: 'Please answer the commitment question.' }, 400);
  }
  if (anythingElse.length > MAX_FIELD_LENGTH) {
    return jsonResponse({ error: 'That last answer is a bit long — please trim it down.' }, 400);
  }

  const cycle = getNextClosedCycle();
  if (!cycle) {
    return jsonResponse({ error: 'Applications are currently closed.' }, 503);
  }

  const db = locals.runtime.env.DB;

  try {
    await db
      .prepare(
        `INSERT INTO closed_group_applications (name, email, why_now, commitment, anything_else, cycle_start_date) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(name, email, whyNow, commitment, anythingElse || null, cycle.startDate)
      .run();
  } catch {
    // Unique-index hit: this email already applied for this cycle.
    return jsonResponse({ ok: true, alreadyApplied: true });
  }

  const env = locals.runtime.env;
  try {
    await sendApplicationNotificationEmail(env, { to: env.NOTIFY_EMAIL, name, email, whyNow, commitment, anythingElse });
  } catch (error) {
    console.error('Failed to send application notification email', error);
  }
  try {
    await sendApplicationReceivedEmail(env, { to: email, name });
  } catch (error) {
    console.error('Failed to send application received email', error);
  }

  if (newsletterOptIn) {
    try {
      await subscribeToNewsletter(env, { email });
    } catch (error) {
      console.error('Failed to subscribe applicant to newsletter', error);
    }
  }

  return jsonResponse({ ok: true });
};
