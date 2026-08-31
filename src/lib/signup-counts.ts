/**
 * How many people are on the list for one open-group session — the head count
 * the host notifications carry, so the inbox alone answers "who's coming?".
 */
export async function countOpenSignups(
  db: D1Database,
  sessionDate: string,
): Promise<{ pending: number; confirmed: number }> {
  const { results } = await db
    .prepare(
      `SELECT status, COUNT(*) AS count FROM open_group_signups WHERE session_date = ? AND status IN ('pending', 'confirmed') GROUP BY status`,
    )
    .bind(sessionDate)
    .all<{ status: string; count: number }>();

  const counts = { pending: 0, confirmed: 0 };
  for (const row of results ?? []) {
    if (row.status === 'pending') counts.pending = row.count;
    if (row.status === 'confirmed') counts.confirmed = row.count;
  }
  return counts;
}
