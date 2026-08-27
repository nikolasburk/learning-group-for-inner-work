/**
 * The status vocabulary shared by the admin page's frontmatter and its client script.
 * Astro compiles an inline `<script>` as an ES module, so both sides import this file
 * and can't drift apart on what a status is called or how it's ordered.
 */
import { parseStoredTimestamp } from './berlin-time';

/**
 * Render and serialization order for pills, badges and breakdowns. Deliberately not
 * alphabetical: live states first, dead ones last, so a breakdown reads the way you'd
 * say it out loud ("11 confirmed, 3 pending").
 *
 * Two vocabularies overlap here — open_group_signups is
 * pending/confirmed/cancelled/expired, closed_group_applications is
 * pending/accepted/declined. They share 'pending', so one pill toggles both sections.
 */
export const STATUS_ORDER = [
  'confirmed',
  'accepted',
  'pending',
  'declined',
  'cancelled',
  'expired',
] as const;

export type AdminStatus = (typeof STATUS_ORDER)[number];

/** Hidden on first load: dead rows that would otherwise drown the live ones. */
export const DEFAULT_HIDDEN_STATUSES: readonly string[] = ['cancelled', 'expired'];

export function isKnownStatus(value: string): value is AdminStatus {
  return (STATUS_ORDER as readonly string[]).includes(value);
}

export function isVisibleByDefault(status: string): boolean {
  return !DEFAULT_HIDDEN_STATUSES.includes(status);
}

/**
 * 'expired' is in the CHECK constraint but is never written to the database — both
 * api/confirm.ts and api/cancel.ts derive it at read time by comparing `expires_at`
 * to now, leaving the stored status as 'pending' forever. Mirror that here, or the
 * admin page disagrees with the app about which signups are still live.
 *
 * Fails open: an absent or unparseable `expires_at` leaves the row pending. Hiding a
 * row because a timestamp didn't parse would be the worse error.
 */
export function effectiveSignupStatus(
  status: string,
  expiresAt: string | null,
  now: Date,
): string {
  if (status !== 'pending') return status;
  const expiry = parseStoredTimestamp(expiresAt);
  return expiry && expiry < now ? 'expired' : 'pending';
}

/**
 * Complete literal class strings, never interpolated — Tailwind's JIT scans source
 * text for class names, so `bg-solarized-${x}/10` would simply never be emitted.
 */
const BADGE_CLASSES: Record<string, string> = {
  confirmed: 'bg-solarized-green/10 text-solarized-green ring-1 ring-inset ring-solarized-green/25',
  accepted: 'bg-solarized-green/10 text-solarized-green ring-1 ring-inset ring-solarized-green/25',
  pending: 'bg-solarized-amber/10 text-solarized-amber ring-1 ring-inset ring-solarized-amber/25',
  declined: 'bg-solarized-base2 text-solarized-textSecondary',
  cancelled: 'bg-solarized-base2 text-solarized-textSecondary',
  expired: 'bg-solarized-base2 text-solarized-textSecondary line-through',
};

const NEUTRAL_BADGE = 'bg-solarized-base2 text-solarized-textSecondary';

export function statusBadgeClass(status: string): string {
  return BADGE_CLASSES[status] ?? NEUTRAL_BADGE;
}

/**
 * Pill state is driven by CSS off `aria-pressed`, not by swapping classes in JS —
 * so the script only ever flips the attribute and the two states can't fall out of
 * sync. Complete literals again, for the same JIT reason as the badges.
 */
export const PILL_BASE =
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-colors ' +
  'bg-transparent text-solarized-textSecondary border-solarized-base2 opacity-70 ' +
  'aria-pressed:opacity-100 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-solarized-violet focus-visible:ring-offset-2';

const PILL_PRESSED: Record<string, string> = {
  confirmed:
    'aria-pressed:bg-solarized-green/10 aria-pressed:text-solarized-green aria-pressed:border-solarized-green/30',
  accepted:
    'aria-pressed:bg-solarized-green/10 aria-pressed:text-solarized-green aria-pressed:border-solarized-green/30',
  pending:
    'aria-pressed:bg-solarized-amber/10 aria-pressed:text-solarized-amber aria-pressed:border-solarized-amber/30',
  declined:
    'aria-pressed:bg-solarized-base2 aria-pressed:text-solarized-textBody aria-pressed:border-solarized-base2',
  cancelled:
    'aria-pressed:bg-solarized-base2 aria-pressed:text-solarized-textBody aria-pressed:border-solarized-base2',
  expired:
    'aria-pressed:bg-solarized-base2 aria-pressed:text-solarized-textBody aria-pressed:border-solarized-base2',
};

export function pillClass(status: string): string {
  return `${PILL_BASE} ${PILL_PRESSED[status] ?? PILL_PRESSED.cancelled}`;
}

/** "11 confirmed, 3 pending" — STATUS_ORDER decides the reading order. */
export function formatBreakdown(counts: Map<string, number>): string {
  return STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0)
    .map((status) => `${counts.get(status)} ${status}`)
    .join(', ');
}

/** As selected by the admin page — shared with the components that render the rows. */
export interface SignupRow {
  email: string;
  session_date: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
}

/** A signup carrying the read-time expiry derivation from `effectiveSignupStatus`. */
export interface DecoratedSignup extends SignupRow {
  effectiveStatus: string;
}

/** Counts a group's rows by status, honouring the server-side default filter. */
export function tallyVisible<T>(rows: T[], statusOf: (row: T) => string) {
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const status = statusOf(row);
    if (!isVisibleByDefault(status)) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);
    total += 1;
  }
  return { total, breakdown: formatBreakdown(counts) };
}
