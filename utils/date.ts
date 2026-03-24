export function isoNow() {
  return new Date().toISOString();
}

export function normalizeAlphaDate(value: string) {
  if (!value) return isoNow();
  if (value.includes("T")) return value;
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  }
  return new Date(value).toISOString();
}
