import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	if (!context.url.pathname.startsWith('/admin')) {
		return next();
	}

	const { ADMIN_USERNAME, ADMIN_PASSWORD } = context.locals.runtime.env;
	const expected = `Basic ${btoa(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`)}`;
	const provided = context.request.headers.get('authorization');

	if (!ADMIN_USERNAME || !ADMIN_PASSWORD || provided !== expected) {
		return new Response('Authentication required.', {
			status: 401,
			headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
		});
	}

	return next();
});
