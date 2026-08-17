export const SIGNUP_COOKIE_NAME = 'iw_open_signup';
export const SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export interface SignupCookieValue {
	sessionDate?: string;
	email?: string;
}

// Astro's `cookies.set()` already URL-encodes the value it's given
// (via the underlying `cookie` package) — don't double-encode here.
export function buildSignupCookieValue(sessionDate: string, email: string): string {
	return JSON.stringify({ sessionDate, email });
}

/** Client-side only — reads the signup cookie via `document.cookie`. */
export function readSignupCookie(): SignupCookieValue | null {
	const match = document.cookie
		.split('; ')
		.find((row) => row.startsWith(`${SIGNUP_COOKIE_NAME}=`));
	if (!match) return null;
	try {
		return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')));
	} catch {
		return null;
	}
}
