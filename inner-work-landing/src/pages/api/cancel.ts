import type { APIRoute } from 'astro';
import { SIGNUP_COOKIE_NAME } from '../../lib/signup-cookie';

export const prerender = false;

type CancellationOutcome = 'ok' | 'already-cancelled' | 'expired' | 'invalid';

async function resolveCancellation(db: D1Database, token: string): Promise<CancellationOutcome> {
	const row = await db
		.prepare(`SELECT id, status, expires_at FROM open_group_signups WHERE token = ? LIMIT 1`)
		.bind(token)
		.first<{ id: number; status: string; expires_at: string }>();

	if (!row) return 'invalid';
	if (row.status === 'cancelled') return 'already-cancelled';
	if (row.status !== 'pending' && row.status !== 'confirmed') return 'expired';
	// Only the pending (pre-confirmation) window is time-bounded — a confirmed
	// signup's `expires_at` is stale and shouldn't block cancellation.
	if (row.status === 'pending' && new Date(row.expires_at) < new Date()) return 'expired';

	await db
		.prepare(`UPDATE open_group_signups SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`)
		.bind(row.id)
		.run();

	return 'ok';
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

	const outcome = await resolveCancellation(locals.runtime.env.DB, token);

	if (outcome === 'invalid') {
		return redirect('/confirmed?state=invalid');
	}
	if (outcome === 'expired') {
		return redirect('/confirmed?state=expired');
	}
	// 'ok' and 'already-cancelled' both land on the same confirmation copy.
	cookies.delete(SIGNUP_COOKIE_NAME, { path: '/' });
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

	const outcome = await resolveCancellation(locals.runtime.env.DB, token);

	// The token came from the client's own cookie, so it's always safe to
	// clear it here — there's no risk of clobbering an unrelated signup.
	cookies.delete(SIGNUP_COOKIE_NAME, { path: '/' });

	if (outcome === 'invalid') {
		return jsonResponse({ ok: false, outcome }, 404);
	}
	if (outcome === 'expired') {
		return jsonResponse({ ok: false, outcome }, 410);
	}
	return jsonResponse({ ok: true, outcome });
};
