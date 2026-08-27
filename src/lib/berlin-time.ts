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

/** e.g. "10:00 AM PDT" — a Berlin-local session date + time, formatted in an arbitrary IANA zone. */
export function formatSessionTimeInZone(dateISO: string, timeHHmm: string, timeZone: string): string {
  const instant = berlinLocalToUtc(dateISO, timeHHmm);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(instant);
}

/**
 * Timestamps reach us in two shapes, and both live in `open_group_signups`:
 *   - `datetime('now')` columns  -> '2026-08-19 15:08:15' (UTC, space-separated, unzoned)
 *   - `expires_at`               -> '2026-08-22T15:08:15.914Z' (toISOString, see api/signup.ts)
 * V8 parses the first as *local* time, so a bare space-separated string has to be
 * normalised before it means anything. Returns null rather than an Invalid Date.
 */
export function parseStoredTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(' ', 'T');
  const zoned = /([Zz]|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  const parsed = new Date(zoned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** e.g. "Aug 19, 17:08" — a stored UTC timestamp read in Berlin. */
export function formatTimestamp(value: string | null | undefined, fallback = '—'): string {
  const parsed = parseStoredTimestamp(value);
  // Show the raw value rather than swallowing something we failed to parse.
  if (!parsed) return value ? value : fallback;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(parsed);
}

/** e.g. "September 9, 2026" — the year-bearing sibling of `formatSessionLabel`. */
export function formatSessionLabelWithYear(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'Europe/Berlin',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** 'YYYY-MM-DD' for "now" in Berlin — en-CA formats as ISO. */
export function berlinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
}
