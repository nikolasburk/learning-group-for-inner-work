/**
 * Calendar arithmetic for the recurring session schedules, in the same spirit as
 * `berlin-time.ts`: no date library, and no local-time `Date` is ever constructed —
 * everything works in 'YYYY-MM-DD' strings and UTC, so results can't drift with the
 * runtime's timezone. Turning a session into an actual instant is `berlinLocalToUtc`'s
 * job, not this file's.
 */

/** 'YYYY-MM-DD' for a UTC year/month/day. `month` is 1-12. */
function toISODate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * The Nth occurrence of a weekday in a month, e.g. the 2nd Wednesday of Sept 2026.
 * `weekday` is 0=Sunday..6=Saturday (matching `Date#getUTCDay`), `n` is 1-based.
 * Returns null when the month has no Nth such weekday — most months have only four
 * of any given weekday, so n=5 usually falls through.
 */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number,
): string | null {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return day <= daysInMonth(year, month) ? toISODate(year, month, day) : null;
}

/**
 * Which ordinal occurrence of its own weekday a date is — the inverse of
 * `nthWeekdayOfMonth`. The 26th is the 4th of its weekday because days 22-28 are
 * always the 4th week, so this is pure arithmetic on the day-of-month.
 */
export function weekdayOrdinal(dateISO: string): number {
  return Math.floor((Number(dateISO.slice(8, 10)) - 1) / 7) + 1;
}

/** 0=Monday..6=Sunday — the convention `MiniCalendar`'s `MonthSpec.startWeekday` uses. */
export function mondayFirstWeekday(year: number, month: number): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

/** Day 0 of the *next* month is the last day of this one. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** e.g. "September" — the `MonthSpec.label` for a year/month. */
export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
  });
}

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

/** `count` consecutive months starting at (and including) the given one. */
export function monthsFrom(year: number, month: number, count: number): YearMonth[] {
  const months: YearMonth[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = month - 1 + index;
    months.push({ year: year + Math.floor(offset / 12), month: (offset % 12) + 1 });
  }
  return months;
}

/**
 * The Berlin-local calendar month containing `now` — the month the calendar opens on.
 * Read off Intl rather than the UTC month, so the very start of a month doesn't render
 * the previous one for the hour or two Berlin is already ahead of UTC.
 */
export function berlinMonthOf(now: Date): YearMonth {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const valueOf = (type: 'year' | 'month') =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: valueOf('year'), month: valueOf('month') };
}
