import type { APIRoute } from 'astro';
import { SIGNUP_COOKIE_NAME } from '../../lib/signup-cookie';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect, cookies }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		return redirect('/confirmed?state=invalid');
	}

	const db = locals.runtime.env.DB;
	const row = await db
		.prepare(`SELECT id, status, expires_at FROM open_group_signups WHERE token = ? LIMIT 1`)
		.bind(token)
		.first<{ id: number; status: string; expires_at: string }>();

	if (!row) {
		return redirect('/confirmed?state=invalid');
	}
	if (row.status === 'cancelled') {
		cookies.delete(SIGNUP_COOKIE_NAME, { path: '/' });
		return redirect('/confirmed?state=cancelled');
	}
	if (row.status !== 'pending' && row.status !== 'confirmed') {
		return redirect('/confirmed?state=expired');
	}
	// Only the pending (pre-confirmation) window is time-bounded — a confirmed
	// signup's `expires_at` is stale and shouldn't block cancellation.
	if (row.status === 'pending' && new Date(row.expires_at) < new Date()) {
		return redirect('/confirmed?state=expired');
	}

	await db
		.prepare(`UPDATE open_group_signups SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`)
		.bind(row.id)
		.run();

	cookies.delete(SIGNUP_COOKIE_NAME, { path: '/' });

	return redirect('/confirmed?state=cancelled');
};
