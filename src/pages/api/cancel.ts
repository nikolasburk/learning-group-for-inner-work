import type { APIRoute } from 'astro';
import { formatSessionLabel } from '../../lib/berlin-time';
import { sendOpenSignupCancellationEmail } from '../../lib/brevo';
import { countOpenSignups } from '../../lib/signup-counts';
import { clearSignupCookie } from '../../lib/signup-cookie';

export const prerender = false;

type CancellationOutcome = 'ok' | 'already-cancelled' | 'expired' | 'invalid';

// The row details ride along so the host notification can name who left, and
// which session they left — both handlers below need the same two facts.
interface CancellationResult {
  outcome: CancellationOutcome;
  email?: string;
  sessionDate?: string;
}

async function resolveCancellation(db: D1Database, token: string): Promise<CancellationResult> {
  const row = await db
    .prepare(`SELECT id, email, session_date, status, expires_at FROM open_group_signups WHERE token = ? LIMIT 1`)
    .bind(token)
    .first<{ id: number; email: string; session_date: string; status: string; expires_at: string }>();

  if (!row) return { outcome: 'invalid' };

  const details = { email: row.email, sessionDate: row.session_date };

  if (row.status === 'cancelled') return { outcome: 'already-cancelled', ...details };
  if (row.status !== 'pending' && row.status !== 'confirmed') return { outcome: 'expired', ...details };
  // Only the pending (pre-confirmation) window is time-bounded — a confirmed
  // signup's `expires_at` is stale and shouldn't block cancellation.
  if (row.status === 'pending' && new Date(row.expires_at) < new Date()) return { outcome: 'expired', ...details };

  await db
    .prepare(`UPDATE open_group_signups SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`)
    .bind(row.id)
    .run();

  return { outcome: 'ok', ...details };
}

/**
 * Tells the host someone left. Only a cancellation that actually happened here
 * is worth an email — a re-clicked link ('already-cancelled') is not news.
 */
async function notifyCancellation(env: Env, result: CancellationResult): Promise<void> {
  if (result.outcome !== 'ok' || !result.email || !result.sessionDate) return;

  try {
    const { pending, confirmed } = await countOpenSignups(env.DB, result.sessionDate);
    await sendOpenSignupCancellationEmail(env, {
      to: env.NOTIFY_EMAIL,
      email: result.email,
      sessionLabel: formatSessionLabel(result.sessionDate),
      pending,
      confirmed,
    });
  } catch (error) {
    // The row is already cancelled by now — log and move on.
    console.error('Failed to send open signup cancellation email', error);
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Emailed cancel link — top-level navigation, redirects to a human-readable page.
export const GET: APIRoute = async ({ url, locals, redirect, cookies }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return redirect('/confirmed?state=invalid');
  }

  const result = await resolveCancellation(locals.runtime.env.DB, token);
  await notifyCancellation(locals.runtime.env, result);

  if (result.outcome === 'invalid') {
    return redirect('/confirmed?state=invalid');
  }
  if (result.outcome === 'expired') {
    return redirect('/confirmed?state=expired');
  }
  // 'ok' and 'already-cancelled' both land on the same confirmation copy.
  clearSignupCookie(cookies);
  return redirect('/confirmed?state=cancelled');
};

// On-site cancel control — the client reads its own token out of the signup
// cookie and posts it here; the token itself is the sole authorization (same
// model as the emailed link), so this can't be used to cancel someone else's
// signup via CSRF or by knowing only their email/session date.
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request.' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return jsonResponse({ ok: false, error: 'Missing token.' }, 400);
  }

  const result = await resolveCancellation(locals.runtime.env.DB, token);
  await notifyCancellation(locals.runtime.env, result);

  // The token came from the client's own cookie, so it's always safe to
  // clear it here — there's no risk of clobbering an unrelated signup.
  clearSignupCookie(cookies);

  const outcome = result.outcome;
  if (outcome === 'invalid') {
    return jsonResponse({ ok: false, outcome }, 404);
  }
  if (outcome === 'expired') {
    return jsonResponse({ ok: false, outcome }, 410);
  }
  return jsonResponse({ ok: true, outcome });
};
