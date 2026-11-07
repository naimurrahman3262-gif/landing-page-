import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type RangePreset = "today" | "7d" | "30d" | "month" | "all";

/**
 * Date range → UTC instants, computed in the USER's time zone.
 * Old bug: "Today" was the server's (UTC) day, so a user in Dhaka just after
 * midnight saw yesterday. Here "today" starts at 00:00 local time.
 */
export function rangeToInstants(
  range: { preset: RangePreset } | { from: string; to: string },
  timeZone: string,
  now = new Date(),
): { from: string | null; to: string | null } {
  const localDay = (d: Date) => formatInTimeZone(d, timeZone, "yyyy-MM-dd");
  const startOf = (day: string) => fromZonedTime(`${day}T00:00:00`, timeZone);
  const endOf = (day: string) => fromZonedTime(`${day}T23:59:59.999`, timeZone);

  if ("from" in range) return { from: startOf(range.from).toISOString(), to: endOf(range.to).toISOString() };

  const today = localDay(now);
  switch (range.preset) {
    case "today":
      return { from: startOf(today).toISOString(), to: endOf(today).toISOString() };
    case "7d":
    case "30d": {
      const days = range.preset === "7d" ? 7 : 30;
      // Inclusive of today: 7D = today and the 6 days before it.
      // Calendar-day arithmetic on the local date string (no DST drift).
      const [y, m, d] = today.split("-").map(Number) as [number, number, number];
      const first = new Date(Date.UTC(y, m - 1, d - (days - 1))).toISOString().slice(0, 10);
      return { from: startOf(first).toISOString(), to: endOf(today).toISOString() };
    }
    case "month": {
      const first = `${today.slice(0, 7)}-01`;
      return { from: startOf(first).toISOString(), to: endOf(today).toISOString() };
    }
    default:
      return { from: null, to: null };
  }
}

/** Today's date in the user's zone, for <input type="date" max>. */
export function localToday(timeZone: string, now = new Date()): string {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}
