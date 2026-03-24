import type { NewsItem, SentimentLabel, StockQuote } from "@/lib/types";

const baseUrl = "https://www.alphavantage.co/query";

function getAlphaKey() {
  return process.env.ALPHA_VANTAGE_API_KEY;
}

function coerceNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sentimentFromScore(value: number | null): SentimentLabel {
  if (value === null) {
    return "neutral";
  }

  if (value >= 0.15) {
    return "bullish";
  }

  if (value <= -0.15) {
    return "bearish";
  }

  return "neutral";
}

export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const trimmed = symbol.trim().toUpperCase();

  if (!getAlphaKey()) {
    return {
      symbol: trimmed,
      name: `${trimmed} Corp`,
      price: null,
      change: null,
      changePercent: null,
      currency: "USD",
    };
  }

  const url = `${baseUrl}?function=GLOBAL_QUOTE&symbol=${trimmed}&apikey=${getAlphaKey()}`;
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage quote failed for ${trimmed}`);
  }

  const payload = (await response.json()) as {
    "Global Quote"?: Record<string, string>;
  };

  const quote = payload["Global Quote"] ?? {};

  return {
    symbol: trimmed,
    name: `${trimmed} Corp`,
    price: coerceNumber(quote["05. price"]),
    change: coerceNumber(quote["09. change"]),
    changePercent: coerceNumber(quote["10. change percent"]?.replace("%", "")),
    currency: "USD",
  };
}

export async function fetchAlphaNews(symbol: string): Promise<NewsItem[]> {
  if (!getAlphaKey()) {
    return [];
  }

  const url = `${baseUrl}?function=NEWS_SENTIMENT&tickers=${symbol.toUpperCase()}&limit=8&apikey=${getAlphaKey()}`;
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage news failed for ${symbol}`);
  }

  const payload = (await response.json()) as {
    feed?: Array<{
      title?: string;
      url?: string;
      time_published?: string;
      summary?: string;
      source?: string;
      overall_sentiment_score?: number;
    }>;
  };

  return (payload.feed ?? []).map((item, index) => ({
    id: `alpha-${symbol}-${index}`,
    title: item.title ?? "Untitled market headline",
    source: item.source ?? "Alpha Vantage",
    url: item.url ?? "#",
    publishedAt: item.time_published ?? new Date().toISOString(),
    summary: item.summary ?? "No summary was returned by the source.",
    sentiment: sentimentFromScore(item.overall_sentiment_score ?? null),
    kind: "news",
  }));
}
