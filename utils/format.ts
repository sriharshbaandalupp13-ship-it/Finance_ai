export function formatCurrency(value: number | null, currency = "USD") {
  if (value === null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatCompactNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatSignedCurrency(value: number | null, currency = "USD") {
  if (value === null || Number.isNaN(value)) return "N/A";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

export function formatSignedRupees(value: number | null) {
  return formatSignedCurrency(value, "INR");
}
