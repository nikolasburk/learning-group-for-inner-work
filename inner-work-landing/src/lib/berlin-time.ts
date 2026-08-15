/**
 * Berlin (Europe/Berlin) only ever sits at UTC+1 (CET) or UTC+2 (CEST), so the
 * offset for a given date can be read directly off Intl's formatted output —
 * no date library needed.
 */
function getBerlinUtcOffsetMinutes(dateISO: string): number {
	// Use noon UTC as the probe instant so we're never near a DST transition
	// at midnight and always land on the correct calendar day in Berlin.
	const probe = new Date(`${dateISO}T12:00:00Z`);
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Berlin',
		timeZoneName: 'shortOffset',
	}).formatToParts(probe);
	const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+1';
	const match = offsetPart.match(/GMT([+-]\d+)/);
	const hours = match ? Number.parseInt(match[1], 10) : 1;
	return hours * 60;
}

/** Combines a Berlin-local date + time into the correct UTC instant. */
export function berlinLocalToUtc(dateISO: string, timeHHmm: string): Date {
	const [hours, minutes] = timeHHmm.split(':').map(Number);
	const offsetMinutes = getBerlinUtcOffsetMinutes(dateISO);
	const midnightUtc = new Date(`${dateISO}T00:00:00Z`).getTime();
	const localMinutesFromMidnight = hours * 60 + minutes;
	return new Date(midnightUtc + (localMinutesFromMidnight - offsetMinutes) * 60_000);
}

/** e.g. "August 26" — for a 'YYYY-MM-DD' Berlin-local session date. */
export function formatSessionLabel(dateISO: string): string {
	return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('en-US', {
		timeZone: 'Europe/Berlin',
		month: 'long',
		day: 'numeric',
	});
}
