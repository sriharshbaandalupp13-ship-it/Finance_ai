export function isoNow() {
  return new Date().toISOString();
}

/**
 * Normalises date strings from multiple sources into a valid ISO-8601 string.
 *
 * Alpha Vantage publishes timestamps like "20240115T130000" (no dashes, no
 * colons, no timezone). A raw `new Date("20240115T130000")` is invalid in
 * most JS environments, so we need to reformat it first.
 */
export function normalizeAlphaDate(value: string): string {
  if (!value) return isoNow();

  if (value.includes("-") && value.includes("T")) return value;

  if (/^\d{8}T\d{6}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    const hour = value.slice(9, 11);
    const min = value.slice(11, 13);
    const sec = value.slice(13, 15);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? isoNow() : parsed.toISOString();
}
