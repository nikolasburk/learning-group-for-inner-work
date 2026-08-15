import type { APIRoute } from 'astro';
import { OPEN_GROUP_SESSIONS } from '../../data/sessions';
import { formatSessionLabel } from '../../lib/berlin-time';
import { sendCalendarInviteEmail } from '../../lib/brevo';
import { buildGoogleCalendarLink, buildSessionIcs } from '../../lib/ics';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		return redirect('/confirmed?state=invalid');
	}

	const db = locals.runtime.env.DB;
	const row = await db
		.prepare(`SELECT id, email, session_date, status, expires_at FROM open_group_signups WHERE token = ? LIMIT 1`)
		.bind(token)
		.first<{ id: number; email: string; session_date: string; status: string; expires_at: string }>();

	if (!row) {
		return redirect('/confirmed?state=invalid');
	}
	if (row.status === 'confirmed') {
		return redirect('/confirmed?state=ok');
	}
	if (row.status !== 'pending' || new Date(row.expires_at) < new Date()) {
		return redirect('/confirmed?state=expired');
	}

	await db
		.prepare(`UPDATE open_group_signups SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?`)
		.bind(row.id)
		.run();

	const session = OPEN_GROUP_SESSIONS.find((s) => s.date === row.session_date);
	if (session) {
		const env = locals.runtime.env;
		const sessionLabel = formatSessionLabel(session.date);
		const icsContent = buildSessionIcs(session, token, env.ZOOM_LINK);
		const googleCalendarLink = buildGoogleCalendarLink(session, env.ZOOM_LINK);

		try {
			await sendCalendarInviteEmail(env, {
				to: row.email,
				sessionLabel,
				zoomLink: env.ZOOM_LINK,
				icsContent,
				googleCalendarLink,
			});
		} catch (error) {
			console.error('Failed to send calendar invite email', error);
			// The signup is already confirmed at this point — surface success regardless,
			// the email failure is logged for manual follow-up.
		}
	}

	return redirect('/confirmed?state=ok');
};
