import { berlinMonthOf } from './recurrence';

export const SIGNUP_COOKIE_NAME = 'iw_open_signup';
export const SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

/**
 * Backstop behind the calendar-window filter in `pruneConfirmedHistory`. That filter
 * already caps the list at the sessions in a single month, so this only matters if
 * someone hand-edits the cookie.
 */
const MAX_CONFIRMED_HISTORY = 6;

export type SignupCookieStatus = 'pending' | 'confirmed';

export interface SignupCookieValue {
  sessionDate?: string;
  email?: string;
  // Absent on cookies set before this field existed — treat as 'pending'.
  status?: SignupCookieStatus;
  // Absent on cookies set before this field existed — hide any cancel UI when missing.
  token?: string;
  // Previously confirmed sessions, so an earlier one keeps its (grayed-out) check
  // after a later signup replaces `sessionDate`.
  // Absent on cookies set before this field existed — treat as empty.
  confirmed?: string[];
}

/** Safely reads the history off a cookie value that may predate the field, or be junk. */
export function confirmedHistory(value: SignupCookieValue | null): string[] {
  const dates = value?.confirmed;
  if (!Array.isArray(dates)) return [];
  return dates.filter((date): date is string => typeof date === 'string');
}

/** Whether the cookie shows this visitor confirmed for `date` — live or historical. */
export function isConfirmedForDate(value: SignupCookieValue | null, date: string): boolean {
  return (
    (value?.sessionDate === date && value.status === 'confirmed') ||
    confirmedHistory(value).includes(date)
  );
}

/**
 * The calendar only draws the current Berlin month and the months after it, so a
 * date earlier than that can never be rendered — drop it rather than carry it on
 * every request. This, not the 4KB cookie limit, is what bounds the list.
 */
export function pruneConfirmedHistory(dates: string[], now: Date = new Date()): string[] {
  const { year, month } = berlinMonthOf(now);
  const windowStart = `${year}-${String(month).padStart(2, '0')}-01`;
  return [...new Set(dates)]
    .filter((date) => date >= windowStart)
    .sort()
    .slice(-MAX_CONFIRMED_HISTORY);
}

// Astro's `cookies.set()` already URL-encodes the value it's given
// (via the underlying `cookie` package) — don't double-encode here.
export function buildSignupCookieValue(
  sessionDate: string,
  email: string,
  status: SignupCookieStatus,
  token: string,
  confirmed: string[] = [],
): string {
  // Omit the field entirely when empty, so the common cookie keeps its original size.
  return JSON.stringify(
    confirmed.length > 0
      ? { sessionDate, email, status, token, confirmed }
      : { sessionDate, email, status, token },
  );
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

function writeCookie(cookies: import('astro').AstroCookies, value: string): void {
  cookies.set(SIGNUP_COOKIE_NAME, value, {
    path: '/',
    maxAge: SIGNUP_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  });
}

/**
 * Server-side only — sets the signup cookie via Astro's `cookies` API.
 *
 * Reads the cookie it is replacing so a confirmed session that is being superseded
 * rolls into the history rather than being forgotten. The session named by
 * `sessionDate` is tracked by that field, so it never also appears in `confirmed`.
 */
export function setSignupCookie(
  cookies: import('astro').AstroCookies,
  sessionDate: string,
  email: string,
  status: SignupCookieStatus,
  token: string,
  now: Date = new Date(),
): void {
  const existing = readSignupCookieValue(cookies);
  const history = confirmedHistory(existing);
  if (existing?.status === 'confirmed' && existing.sessionDate) {
    history.push(existing.sessionDate);
  }
  const confirmed = pruneConfirmedHistory(history, now).filter((date) => date !== sessionDate);
  writeCookie(cookies, buildSignupCookieValue(sessionDate, email, status, token, confirmed));
}

/**
 * Server-side only — clears the active signup while keeping the confirmed-session
 * history, so cancelling one session doesn't erase the record of earlier ones the
 * calendar still shows. The session being cleared is deliberately *not* added to the
 * history: the visitor is no longer attending it.
 */
export function clearSignupCookie(
  cookies: import('astro').AstroCookies,
  now: Date = new Date(),
): void {
  const confirmed = pruneConfirmedHistory(confirmedHistory(readSignupCookieValue(cookies)), now);
  if (confirmed.length === 0) {
    cookies.delete(SIGNUP_COOKIE_NAME, { path: '/' });
    return;
  }
  writeCookie(cookies, JSON.stringify({ confirmed }));
}
