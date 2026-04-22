// lib/utils/day-boundary.ts
/**
 * Returns midnight of the given date in the local timezone.
 */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns 23:59:59.999 of the given date in the local timezone.
 */
export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * True if `timestamp` falls on the same local calendar day as `day`.
 */
export function belongsToDay(timestamp: Date, day: Date): boolean {
  return (
    timestamp.getFullYear() === day.getFullYear() &&
    timestamp.getMonth() === day.getMonth() &&
    timestamp.getDate() === day.getDate()
  );
}