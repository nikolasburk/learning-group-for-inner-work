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
  /** True for a session held outside OPEN_GROUP_RULE — see OPEN_GROUP_ADDITIONS. */
  oneOff: boolean;
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

/**
 * Sessions held outside OPEN_GROUP_RULE — the one-offs. Same hand-maintained spirit
 * as OPEN_GROUP_OVERRIDES, but these *add* a date rather than adjust one. A date that
 * already matches the rule belongs in OPEN_GROUP_OVERRIDES; listing it here does
 * nothing. Keyed by 'YYYY-MM-DD'.
 */
const OPEN_GROUP_ADDITIONS: Record<
  string,
  Partial<Omit<OpenGroupSession, 'date' | 'oneOff'>>
> = {
  // '2026-10-06': {},                  // extra session, rule's default time
  // '2026-11-20': { time: '18:00' },   // extra session, earlier start
  // '2026-12-02': { coHost: true },    // extra session with Rosa
};

/**
 * Resolves a date into a session, or null when it isn't one. The single place that
 * decides whether a date is on the rule or a one-off, so no caller has to re-derive it.
 */
function buildSession(dateISO: string): OpenGroupSession | null {
  const onRule = matchesRule(dateISO);
  const addition = OPEN_GROUP_ADDITIONS[dateISO];
  if (!onRule && !addition) return null;
  const override = onRule ? OPEN_GROUP_OVERRIDES[dateISO] : undefined;
  if (override?.skip) return null;
  const spec = onRule ? override : addition;
  return {
    date: dateISO,
    time: spec?.time ?? OPEN_GROUP_RULE.time,
    durationMinutes: spec?.durationMinutes ?? OPEN_GROUP_RULE.durationMinutes,
    coHost: spec?.coHost ?? false,
    oneOff: !onRule,
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
  if (dateISO < OPEN_GROUP_RULE.seriesStart) return null;
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
    // Delegated rather than re-deriving the rule here: a one-off can fall before a
    // rule date in the same month, so the month has to be resolved and sorted as a
    // whole before it can be walked in chronological order.
    for (const session of getSessionsInMonth(year, month)) {
      if (berlinLocalToUtc(session.date, session.time) > now) sessions.push(session);
      if (sessions.length >= count) return sessions;
    }
  }
  return sessions;
}

/** Every session falling in a given calendar month — used to build the mini calendar. */
export function getSessionsInMonth(year: number, month: number): OpenGroupSession[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const ruleDates = OPEN_GROUP_RULE.ordinals
    .map((ordinal) => nthWeekdayOfMonth(year, month, OPEN_GROUP_RULE.weekday, ordinal))
    .filter((date): date is string => date !== null);
  const additionDates = Object.keys(OPEN_GROUP_ADDITIONS).filter((date) =>
    date.startsWith(prefix),
  );
  return [...new Set([...ruleDates, ...additionDates])]
    .filter((date) => date >= OPEN_GROUP_RULE.seriesStart)
    .sort()
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
