import type { APIRoute } from 'astro';
import { subscribeToNewsletter } from '../../lib/newsletter';

export const prerender = false;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return jsonResponse({ ok: true });
  }

  const db = locals.runtime.env.DB;
  const row = await db
    .prepare(`SELECT email FROM open_group_signups WHERE token = ? LIMIT 1`)
    .bind(token)
    .first<{ email: string }>();

  // Invalid/tampered token — fail gracefully rather than exposing token validity.
  if (!row) {
    return jsonResponse({ ok: true });
  }

  const result = await subscribeToNewsletter(locals.runtime.env, { email: row.email });
  return jsonResponse({ ok: true, alreadyRegistered: result.status === 'already-subscribed' });
};
