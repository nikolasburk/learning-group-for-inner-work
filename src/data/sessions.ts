import { berlinLocalToUtc } from '../lib/berlin-time';
import { monthsFrom, nthWeekdayOfMonth, weekdayOrdinal } from '../lib/recurrence';

export interface OpenGroupSession {
  /** 'YYYY-MM-DD', Berlin-local */
  date: string;
  /** '19:00', 24h Berlin-local */
  time: string;
  durationMinutes: number;
  /** Whether co-host Rosa Villa is joining this specific session. */
  coHost: boolean;
}

export const HOST_NAME = 'Nikolas Burk';
export const CO_HOST_NAME = 'Rosa Villa';
export const HOST_IMAGE = '/images/nburk.webp';
export const CO_HOST_IMAGE = '/images/rvilla.webp';

const WEDNESDAY = 3; // Date#getUTCDay: 0=Sunday

/**
 * The open group recurs on a rule, so the schedule is derived rather than listed —
 * it can't run out, and it can't drift out of sync with the calendar the way a
 * hand-maintained array did.
 */
const OPEN_GROUP_RULE = {
  weekday: WEDNESDAY,
  /** Second and fourth Wednesday of the month. */
  ordinals: [2, 4],
  time: '19:00',
  durationMinutes: 120,
  /** The first session ever held — nothing before this is a real session. */
  seriesStart: '2026-08-26',
} as const;

/**
 * The only hand-maintained part of the schedule: per-date exceptions to the rule.
 * Everything not listed here follows OPEN_GROUP_RULE. Keyed by 'YYYY-MM-DD'.
 */
const OPEN_GROUP_OVERRIDES: Record<
  string,
  Partial<Omit<OpenGroupSession, 'date'>> & { skip?: boolean }
> = {
  // '2026-12-23': { skip: true },     // holiday — no session
  // '2026-10-14': { coHost: true },   // Rosa joins this one
  // '2026-11-11': { time: '20:00' },  // one-off later start
};

/** Applies the rule's defaults, then any override. Null for a skipped date. */
function buildSession(dateISO: string): OpenGroupSession | null {
  const override = OPEN_GROUP_OVERRIDES[dateISO];
  if (override?.skip) return null;
  return {
    date: dateISO,
    time: override?.time ?? OPEN_GROUP_RULE.time,
    durationMinutes: override?.durationMinutes ?? OPEN_GROUP_RULE.durationMinutes,
    coHost: override?.coHost ?? false,
  };
}

/** Whether a date falls on the rule, ignoring overrides and the series start. */
function matchesRule(dateISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const parsed = new Date(`${dateISO}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Guards against a well-formed but non-existent date like '2026-02-31', which
  // Date rolls over into March rather than rejecting.
  if (parsed.toISOString().slice(0, 10) !== dateISO) return false;
  if (parsed.getUTCDay() !== OPEN_GROUP_RULE.weekday) return false;
  return (OPEN_GROUP_RULE.ordinals as readonly number[]).includes(weekdayOrdinal(dateISO));
}

/**
 * Resolves any session date, however far in the past. Signups are stored in D1 by
 * `session_date`, and a confirmation or an .ics re-download can arrive long after the
 * session — so this must not be limited to an upcoming window.
 */
export function getSessionByDate(dateISO: string): OpenGroupSession | null {
  if (!matchesRule(dateISO) || dateISO < OPEN_GROUP_RULE.seriesStart) return null;
  return buildSession(dateISO);
}

/** The next `count` sessions starting at `now`, in chronological order. */
export function getUpcomingSessions(count: number, now: Date = new Date()): OpenGroupSession[] {
  if (count <= 0) return [];
  const sessions: OpenGroupSession[] = [];
  // A 24-month horizon is far more than any caller needs, and bounds the loop even
  // if every date in range were skipped.
  const start = new Date(now.getTime());
  for (const { year, month } of monthsFrom(start.getUTCFullYear(), start.getUTCMonth() + 1, 24)) {
    for (const ordinal of OPEN_GROUP_RULE.ordinals) {
      const date = nthWeekdayOfMonth(year, month, OPEN_GROUP_RULE.weekday, ordinal);
      if (!date || date < OPEN_GROUP_RULE.seriesStart) continue;
      const session = buildSession(date);
      if (!session) continue;
      if (berlinLocalToUtc(session.date, session.time) > now) sessions.push(session);
      if (sessions.length >= count) return sessions;
    }
  }
  return sessions;
}

/** Every session falling in a given calendar month — used to build the mini calendar. */
export function getSessionsInMonth(year: number, month: number): OpenGroupSession[] {
  return OPEN_GROUP_RULE.ordinals
    .map((ordinal) => nthWeekdayOfMonth(year, month, OPEN_GROUP_RULE.weekday, ordinal))
    .filter((date): date is string => date !== null && date >= OPEN_GROUP_RULE.seriesStart)
    .map(buildSession)
    .filter((session): session is OpenGroupSession => session !== null);
}

/**
 * A session stops being "next" the instant it starts, not when it ends —
 * so nobody gets a confirmation request for a session already underway.
 */
export function getNextOpenSession(now: Date = new Date()): OpenGroupSession | null {
  return getUpcomingSessions(1, now)[0] ?? null;
}
