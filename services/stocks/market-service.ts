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

const INDIAN_BASE_PRICES: Record<string, number> = {
  "RELIANCE.BSE": 2850,
  "TCS.BSE": 3920,
  "HDFCBANK.BSE": 1680,
  "INFY.BSE": 1780,
  "ICICIBANK.BSE": 1280,
  "HINDUNILVR.BSE": 2340,
  "SBIN.BSE": 820,
  "BHARTIARTL.BSE": 1650,
  "WIPRO.BSE": 480,
  "ADANIENT.BSE": 2420,
};

function buildFallbackHistory(symbol: string): StockPoint[] {
  const basePrice = INDIAN_BASE_PRICES[symbol] ?? 1000;
  const today = new Date();

  return Array.from({ length: 20 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (19 - index));

    if (date.getDay() === 0) date.setDate(date.getDate() - 2);
    if (date.getDay() === 6) date.setDate(date.getDate() - 1);

    const trend = index * 0.003;
    const noise = (Math.random() - 0.48) * basePrice * 0.018;
    const close = Number((basePrice * (1 + trend) + noise).toFixed(2));

    return {
      date: date.toISOString().slice(0, 10),
      close,
      volume: Math.floor(500000 + Math.random() * 3000000),
    };
  });
}

function buildFallbackSnapshot(symbol: string, name: string): StockSnapshot {
  const history = buildFallbackHistory(symbol);
  const last = history.at(-1)!;
  const prev = history.at(-2)!;
  const change = Number((last.close - prev.close).toFixed(2));
  const changePercent = Number(((change / prev.close) * 100).toFixed(2));

  return {
    symbol,
    name,
    currency: "INR",
    price: last.close,
    change,
    changePercent,
    volume: last.volume,
    sma5: average(history.slice(-5).map((item) => item.close)),
    momentum: changePercent,
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

    if (!history.length || !quote["05. price"]) {
      return buildFallbackSnapshot(symbol, name);
    }

    const last = history.at(-1);
    const prev = history.at(-2);
    const change = last && prev ? Number((last.close - prev.close).toFixed(2)) : num(quote["09. change"]);
    const changePercent = prev && change !== null
      ? Number(((change / prev.close) * 100).toFixed(2))
      : num(quote["10. change percent"]?.replace("%", ""));

    return {
      symbol,
      name,
      currency: "INR",
      price: num(quote["05. price"]) ?? last?.close ?? null,
      change,
      changePercent,
      volume: last?.volume ?? null,
      sma5: average(history.slice(-5).map((item) => item.close)),
      momentum: changePercent,
      history: history.length ? history : buildFallbackHistory(symbol),
    };
  } catch (error) {
    console.error(`Market data fallback for ${symbol}:`, error);
    return buildFallbackSnapshot(symbol, name);
  }
}
