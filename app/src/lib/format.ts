// Format a date as a short, stable, UTC-only string (no timezone surprises)
export function formatDateUTC(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}
