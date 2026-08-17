export const SIGNUP_COOKIE_NAME = 'iw_open_signup';
export const SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export type SignupCookieStatus = 'pending' | 'confirmed';

export interface SignupCookieValue {
	sessionDate?: string;
	email?: string;
	// Absent on cookies set before this field existed — treat as 'pending'.
	status?: SignupCookieStatus;
}

// Astro's `cookies.set()` already URL-encodes the value it's given
// (via the underlying `cookie` package) — don't double-encode here.
export function buildSignupCookieValue(sessionDate: string, email: string, status: SignupCookieStatus): string {
	return JSON.stringify({ sessionDate, email, status });
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

/** Server-side only — reads the signup cookie via Astro's `cookies` API. */
export function readSignupCookieValue(cookies: import('astro').AstroCookies): SignupCookieValue | null {
	try {
		return (cookies.get(SIGNUP_COOKIE_NAME)?.json() as SignupCookieValue) ?? null;
	} catch {
		return null;
	}
}

/** Server-side only — sets the signup cookie via Astro's `cookies` API. */
export function setSignupCookie(
	cookies: import('astro').AstroCookies,
	sessionDate: string,
	email: string,
	status: SignupCookieStatus,
): void {
	cookies.set(SIGNUP_COOKIE_NAME, buildSignupCookieValue(sessionDate, email, status), {
		path: '/',
		maxAge: SIGNUP_COOKIE_MAX_AGE_SECONDS,
		sameSite: 'lax',
	});
}
