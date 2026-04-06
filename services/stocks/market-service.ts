import type { StockPoint, StockSnapshot } from "@/data/contracts";

const BASE_URL = "https://www.alphavantage.co/query";

function alphaKey() {
  return process.env.ALPHA_VANTAGE_API_KEY;
}

function num(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildFallbackHistory(): StockPoint[] {
  const today = new Date();
  return Array.from({ length: 10 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (9 - index));
    return {
      date: date.toISOString().slice(0, 10),
      close: 100 + index * 1.5,
      volume: 1000000 + index * 50000,
    };
  });
}

function buildFallbackSnapshot(symbol: string, name: string): StockSnapshot {
  const history = buildFallbackHistory();
  return {
    symbol,
    name,
    currency: "USD",
    price: history.at(-1)?.close ?? null,
    change: 1.5,
    changePercent: 1.2,
    volume: history.at(-1)?.volume ?? null,
    sma5: average(history.slice(-5).map((item) => item.close)),
    momentum: 1.2,
    history,
  };
}

export async function fetchStockSnapshot(symbol: string, name: string): Promise<StockSnapshot> {
  const key = alphaKey();
  if (!key) {
    return buildFallbackSnapshot(symbol, name);
  }

  try {
    const [quoteResponse, dailyResponse] = await Promise.all([
      fetch(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`, { next: { revalidate: 300 } }),
      fetch(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${key}`, { next: { revalidate: 300 } }),
    ]);

    const quoteJson = quoteResponse.ok ? await quoteResponse.json() : {};
    const dailyJson = dailyResponse.ok ? await dailyResponse.json() : {};

    const quote = (quoteJson as { "Global Quote"?: Record<string, string> })["Global Quote"] ?? {};
    const series = (dailyJson as { "Time Series (Daily)"?: Record<string, Record<string, string>> })["Time Series (Daily)"] ?? {};

    const history = Object.entries(series)
      .slice(0, 20)
      .reverse()
      .map(([date, point]) => ({
        date,
        close: Number(point["4. close"]),
        volume: Number(point["5. volume"]),
      }));

    const last = history.at(-1);
    const prev = history.at(-2);
    const change = last && prev ? last.close - prev.close : num(quote["09. change"]);
    const changePercent = prev && change !== null ? (change / prev.close) * 100 : num(quote["10. change percent"]?.replace("%", ""));

    return {
      symbol,
      name,
      currency: "USD",
      price: num(quote["05. price"]) ?? last?.close ?? null,
      change,
      changePercent,
      volume: last?.volume ?? null,
      sma5: average(history.slice(-5).map((item) => item.close)),
      momentum: changePercent,
      history: history.length ? history : buildFallbackHistory(),
    };
  } catch (error) {
    console.error(`Market data fallback for ${symbol}:`, error);
    return buildFallbackSnapshot(symbol, name);
  }
}
