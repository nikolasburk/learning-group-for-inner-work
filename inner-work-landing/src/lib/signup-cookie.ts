export const SIGNUP_COOKIE_NAME = 'iw_open_signup';
export const SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

// Astro's `cookies.set()` already URL-encodes the value it's given
// (via the underlying `cookie` package) — don't double-encode here.
export function buildSignupCookieValue(sessionDate: string): string {
	return JSON.stringify({ sessionDate });
}
