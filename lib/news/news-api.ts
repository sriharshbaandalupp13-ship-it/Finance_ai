import type { NewsItem, SentimentLabel } from "@/lib/types";

const POSITIVE_WORDS = ["beat", "growth", "surge", "wins", "expands", "record", "strong"];
const NEGATIVE_WORDS = ["cuts", "falls", "probe", "lawsuit", "risk", "weak", "delay"];

function deriveSentiment(title: string): SentimentLabel {
  const lower = title.toLowerCase();

  if (POSITIVE_WORDS.some((word) => lower.includes(word))) {
    return "bullish";
  }

  if (NEGATIVE_WORDS.some((word) => lower.includes(word))) {
    return "bearish";
  }

  return "neutral";
}

export async function fetchNewsApiNews(symbol: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", symbol.toUpperCase());
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "8");

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`News API failed for ${symbol}`);
  }

  const payload = (await response.json()) as {
    articles?: Array<{
      title?: string;
      url?: string;
      publishedAt?: string;
      description?: string;
      source?: { name?: string };
    }>;
  };

  return (payload.articles ?? []).map((article, index) => ({
    id: `newsapi-${symbol}-${index}`,
    title: article.title ?? "Untitled news item",
    source: article.source?.name ?? "News API",
    url: article.url ?? "#",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    summary: article.description ?? "No description returned by the source.",
    sentiment: deriveSentiment(article.title ?? ""),
    kind: "news",
  }));
}
