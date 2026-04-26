import type { StockPoint, StockSnapshot } from "@/data/contracts";

// Yahoo Finance uses .BO for BSE and .NS for NSE.
// Our app stores symbols with .BSE / .NSE suffixes, so we convert here.
function toYahooSymbol(symbol: string): string {
  if (symbol.endsWith(".BSE")) return symbol.replace(".BSE", ".BO");
  if (symbol.endsWith(".NSE")) return symbol.replace(".NSE", ".NS");
  return symbol;
}

function num(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? value : null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Fallback base prices (approximate real April 2026 levels) used only when
// Yahoo Finance is unreachable.
const INDIAN_BASE_PRICES: Record<string, number> = {
  "RELIANCE.BSE":   1330,
  "TCS.BSE":        3500,
  "TATAMOTORS.BSE": 1020,
  "TATASTEEL.BSE":  162,
  "HDFCBANK.BSE":   1760,
  "INFY.BSE":       1440,
  "ICICIBANK.BSE":  1320,
  "HINDUNILVR.BSE": 2340,
  "SBIN.BSE":        780,
  "BHARTIARTL.BSE": 1740,
  "WIPRO.BSE":       480,
  "ADANIENT.BSE":   2550,
};

function buildFallbackHistory(symbol: string): StockPoint[] {
  const basePrice = INDIAN_BASE_PRICES[symbol] ?? 1000;
  const today = new Date();

  return Array.from({ length: 20 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (19 - index));

    if (date.getDay() === 6) date.setDate(date.getDate() - 1);
    else if (date.getDay() === 0) date.setDate(date.getDate() - 2);

    const trend = index * 0.003;
    const noise = (Math.random() - 0.48) * basePrice * 0.018;
    const close = Number((basePrice * (1 + trend) + noise).toFixed(2));

    return {
      date: date.toISOString().slice(0, 10),
      close,
      volume: Math.floor(500_000 + Math.random() * 3_000_000),
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

// Yahoo Finance chart API response shape (unofficial but stable)
interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose:      number;
        regularMarketVolume: number;
        currency:           string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close:  (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

export async function fetchStockSnapshot(symbol: string, name: string): Promise<StockSnapshot> {
  const yahooSymbol = toYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1mo&includePrePost=false`;

  try {
    const response = await fetch(url, {
      headers: {
        // Some Yahoo Finance endpoints return 401 without a User-Agent.
        "User-Agent": "Mozilla/5.0 (compatible; FinanceSignalStudio/1.0)",
      },
      // Cache for 5 minutes in Next.js ISR.
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance returned HTTP ${response.status} for ${yahooSymbol}, using fallback.`);
      return buildFallbackSnapshot(symbol, name);
    }

    const json = (await response.json()) as YahooChartResponse;
    const result = json.chart.result?.[0];

    if (!result) {
      console.warn(`Yahoo Finance: no result for ${yahooSymbol}, using fallback.`);
      return buildFallbackSnapshot(symbol, name);
    }

    const { meta, timestamp, indicators } = result;
    const rawCloses  = indicators.quote[0]?.close  ?? [];
    const rawVolumes = indicators.quote[0]?.volume ?? [];

    // Build clean daily history, filtering out any null candles.
    const history: StockPoint[] = timestamp
      .map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString().slice(0, 10),
        close:  rawCloses[i],
        volume: rawVolumes[i],
      }))
      .filter((p): p is StockPoint => p.close != null && p.volume != null)
      .slice(-20);

    if (!history.length) {
      console.warn(`Yahoo Finance: empty history for ${yahooSymbol}, using fallback.`);
      return buildFallbackSnapshot(symbol, name);
    }

    const last      = history.at(-1)!;
    const prevClose = num(meta.previousClose) ?? history.at(-2)?.close ?? last.close;
    const price     = num(meta.regularMarketPrice) ?? last.close;
    const change    = Number((price - prevClose).toFixed(2));
    const changePercent = Number(((change / prevClose) * 100).toFixed(2));

    return {
      symbol,
      name,
      currency:      meta.currency ?? "INR",
      price,
      change,
      changePercent,
      volume:  num(meta.regularMarketVolume) ?? last.volume,
      sma5:    average(history.slice(-5).map((item) => item.close)),
      momentum: changePercent,
      history,
    };
  } catch (error) {
    console.error(`Yahoo Finance fetch error for ${symbol}:`, error);
    return buildFallbackSnapshot(symbol, name);
  }
}
