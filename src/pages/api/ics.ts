import type { APIRoute } from 'astro';
import { OPEN_GROUP_SESSIONS } from '../../data/sessions';
import { buildSessionIcs } from '../../lib/ics';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response('Not found', { status: 404 });
  }

  const db = locals.runtime.env.DB;
  const row = await db
    .prepare(`SELECT session_date, status FROM open_group_signups WHERE token = ? LIMIT 1`)
    .bind(token)
    .first<{ session_date: string; status: string }>();

  if (!row || row.status !== 'confirmed') {
    return new Response('Not found', { status: 404 });
  }

  const session = OPEN_GROUP_SESSIONS.find((s) => s.date === row.session_date);
  if (!session) {
    return new Response('Not found', { status: 404 });
  }

  const icsContent = buildSessionIcs(session, token, locals.runtime.env.ZOOM_LINK);

  return new Response(icsContent, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="inner-work-open-group-session.ics"',
    },
  });
};
