import { berlinLocalToUtc } from '../lib/berlin-time';

export interface ClosedGroupCycle {
  /** 'YYYY-MM-DD', Berlin-local — first session of the cycle */
  startDate: string;
  /** 'YYYY-MM-DD', Berlin-local — last day applications are accepted */
  applicationDeadline: string;
}

// Hand-maintained, same as the closed-group MiniCalendar `highlighted` arrays in
// Join.astro — top this list up and redeploy every so often.
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

// First and third Wednesday of the month, 19:00 Berlin.
// Hand-maintained, same as the closed-group MiniCalendar `highlighted` arrays in
// Join.astro — top this list up and redeploy every so often.
export const CLOSED_GROUP_SESSIONS: ClosedGroupSession[] = [
  { date: '2026-09-16', time: '19:00', durationMinutes: 120 },
  { date: '2026-10-07', time: '19:00', durationMinutes: 120 },
  { date: '2026-10-21', time: '19:00', durationMinutes: 120 },
  { date: '2026-11-04', time: '19:00', durationMinutes: 120 },
  { date: '2026-11-18', time: '19:00', durationMinutes: 120 },
  { date: '2026-12-02', time: '19:00', durationMinutes: 120 },
];

export function getNextClosedCycle(now: Date = new Date()): ClosedGroupCycle | null {
  return (
    CLOSED_GROUP_CYCLES.find((cycle) => berlinLocalToUtc(cycle.applicationDeadline, '23:59') > now) ?? null
  );
}
