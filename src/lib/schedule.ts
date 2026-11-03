/**
 * Tracking schedule helpers. Pure functions so the 60 s tick, the watcher
 * callback and the settings UI all make identical decisions.
 */

/** Minutes-of-day for "HH:MM", clamped into 00:00–23:59. Invalid input → 00:00. */
export function parseClock(value: string): number {
  const [rawHours, rawMinutes] = value.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  const clampedHours = Math.min(23, Math.max(0, Math.trunc(hours)));
  const clampedMinutes = Math.min(59, Math.max(0, Math.trunc(minutes)));
  return clampedHours * 60 + clampedMinutes;
}

/**
 * True when `now` falls inside [start, end). A window that wraps midnight
 * (e.g. 22:00–06:00) counts as active late evening and early morning.
 * Equal start and end is treated as "always active" so a mis-edited
 * schedule can never silently disable tracking.
 */
export function isWithinActiveHours(now: Date, start: string, end: string): boolean {
  const startMinute = parseClock(start);
  const endMinute = parseClock(end);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  if (startMinute === endMinute) return true;
  if (startMinute < endMinute) return nowMinute >= startMinute && nowMinute < endMinute;
  return nowMinute >= startMinute || nowMinute < endMinute;
}

/**
 * Interval gate for incoming fixes: the first fix always passes, later ones
 * only once the configured interval has fully elapsed.
 */
export function shouldProcessPosition(
  now: number,
  lastProcessedAt: number | null,
  intervalMin: number,
): boolean {
  if (lastProcessedAt === null) return true;
  if (intervalMin <= 0) return true;
  return now - lastProcessedAt >= intervalMin * 60_000;
}
