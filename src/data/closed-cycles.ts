import { berlinLocalToUtc } from '../lib/berlin-time';
import { monthsFrom, nthWeekdayOfMonth } from '../lib/recurrence';

export interface ClosedGroupCycle {
  /** 'YYYY-MM-DD', Berlin-local — first session of the cycle */
  startDate: string;
  /** 'YYYY-MM-DD', Berlin-local — last day applications are accepted */
  applicationDeadline: string;
}

/**
 * Unlike the open group, a closed cycle is a bounded commitment with an application
 * deadline, so which cycle runs when stays an editorial decision rather than a rule.
 * This list is the hand-maintained part; the sessions within a cycle are derived.
 */
export const CLOSED_GROUP_CYCLES: ClosedGroupCycle[] = [
  { startDate: '2026-09-30', applicationDeadline: '2026-09-23' },
];

export interface ClosedGroupSession {
  /** 'YYYY-MM-DD', Berlin-local */
  date: string;
  /** '19:00', 24h Berlin-local */
  time: string;
  durationMinutes: number;
}

const WEDNESDAY = 3; // Date#getUTCDay: 0=Sunday

/** First and third Wednesday of the month, 19:00 Berlin, six sessions over three months. */
const CLOSED_GROUP_RULE = {
  weekday: WEDNESDAY,
  ordinals: [1, 3],
  time: '19:00',
  durationMinutes: 120,
  sessionsPerCycle: 6,
} as const;

/** Every session runs at the rule's time and length; only the date varies. */
function sessionOn(date: string): ClosedGroupSession {
  return {
    date,
    time: CLOSED_GROUP_RULE.time,
    durationMinutes: CLOSED_GROUP_RULE.durationMinutes,
  };
}

/**
 * The cycle's sessions: its start date, then the rule walked forward from there.
 *
 * The start date is the first session by definition, whether or not it happens to land
 * on the rule — the 2026-09 cycle kicks off on a fifth Wednesday. Seeding it rather
 * than generating it keeps `startDate` honest as "first session of the cycle" and
 * leaves the 1st/3rd-Wednesday rule intact for the rest, which is what the open group
 * alternates against. Rule dates up to and including the start are skipped, so an
 * on-rule start date isn't emitted twice.
 */
export function getClosedSessionsForCycle(cycle: ClosedGroupCycle): ClosedGroupSession[] {
  const [year, month] = cycle.startDate.split('-').map(Number);
  const sessions: ClosedGroupSession[] = [sessionOn(cycle.startDate)];
  for (const period of monthsFrom(year, month, 12)) {
    for (const ordinal of CLOSED_GROUP_RULE.ordinals) {
      const date = nthWeekdayOfMonth(period.year, period.month, CLOSED_GROUP_RULE.weekday, ordinal);
      if (!date || date <= cycle.startDate) continue;
      sessions.push(sessionOn(date));
      if (sessions.length >= CLOSED_GROUP_RULE.sessionsPerCycle) return sessions;
    }
  }
  return sessions;
}

export function getNextClosedCycle(now: Date = new Date()): ClosedGroupCycle | null {
  return (
    CLOSED_GROUP_CYCLES.find((cycle) => berlinLocalToUtc(cycle.applicationDeadline, '23:59') > now) ?? null
  );
}

/**
 * Resolves an arbitrary Closed Group date back to its session and cycle. Unlike the
 * Open Group, cycles are a short, hand-maintained list rather than an open-ended rule,
 * so this just scans every cycle's derived sessions for a match.
 */
export function getClosedSessionByDate(
  dateISO: string,
): { session: ClosedGroupSession; cycle: ClosedGroupCycle } | null {
  for (const cycle of CLOSED_GROUP_CYCLES) {
    const session = getClosedSessionsForCycle(cycle).find((s) => s.date === dateISO);
    if (session) return { session, cycle };
  }
  return null;
}
