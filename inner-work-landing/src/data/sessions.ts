import { berlinLocalToUtc } from '../lib/berlin-time';

export interface OpenGroupSession {
	/** 'YYYY-MM-DD', Berlin-local */
	date: string;
	/** '19:00', 24h Berlin-local */
	time: string;
	durationMinutes: number;
}

// Second and fourth Wednesday of the month, 19:00 Berlin.
// Hand-maintained, same as the MiniCalendar `highlighted` arrays in Join.astro —
// top this list up and redeploy every so often.
export const OPEN_GROUP_SESSIONS: OpenGroupSession[] = [
	{ date: '2026-08-26', time: '19:00', durationMinutes: 120 },
	{ date: '2026-09-09', time: '19:00', durationMinutes: 120 },
	{ date: '2026-09-23', time: '19:00', durationMinutes: 120 },
	{ date: '2026-10-14', time: '19:00', durationMinutes: 120 },
	{ date: '2026-10-28', time: '19:00', durationMinutes: 120 },
	{ date: '2026-11-11', time: '19:00', durationMinutes: 120 },
	{ date: '2026-11-25', time: '19:00', durationMinutes: 120 },
];

/**
 * A session stops being "next" the instant it starts, not when it ends —
 * so nobody gets a confirmation request for a session already underway.
 */
export function getNextOpenSession(now: Date = new Date()): OpenGroupSession | null {
	return (
		OPEN_GROUP_SESSIONS.find((session) => berlinLocalToUtc(session.date, session.time) > now) ?? null
	);
}
