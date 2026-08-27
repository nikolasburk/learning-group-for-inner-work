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
  { startDate: '2026-09-16', applicationDeadline: '2026-09-09' },
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

/**
 * The cycle's sessions, derived from its start date by walking the rule forward.
 * A cycle can start on the third Wednesday rather than the first (the 2026-09 one
 * does), so generation starts at `startDate` rather than at the top of its month.
 */
export function getClosedSessionsForCycle(cycle: ClosedGroupCycle): ClosedGroupSession[] {
  const [year, month] = cycle.startDate.split('-').map(Number);
  const sessions: ClosedGroupSession[] = [];
  for (const period of monthsFrom(year, month, 12)) {
    for (const ordinal of CLOSED_GROUP_RULE.ordinals) {
      const date = nthWeekdayOfMonth(period.year, period.month, CLOSED_GROUP_RULE.weekday, ordinal);
      if (!date || date < cycle.startDate) continue;
      sessions.push({
        date,
        time: CLOSED_GROUP_RULE.time,
        durationMinutes: CLOSED_GROUP_RULE.durationMinutes,
      });
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
