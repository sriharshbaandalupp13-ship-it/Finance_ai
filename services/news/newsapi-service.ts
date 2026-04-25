import type { RawSourceItem } from "@/data/contracts";

/**
 * Produces a short, stable string key from a URL for use as an article ID.
 * Avoids positional index collisions when the same symbol is fetched twice.
 */
function stableId(articleUrl: string | undefined, publishedAt: string | undefined, symbol: string, fallbackIndex: number): string {
  const base = articleUrl && articleUrl !== "#" ? articleUrl : `${symbol}-${publishedAt ?? ""}-${fallbackIndex}`;
  // Simple djb2-style hash — consistent across runs for the same input
  let hash = 5381;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) + hash) ^ base.charCodeAt(i);
  }
  return `newsapi-${symbol}-${(hash >>> 0).toString(36)}`;
}

export async function fetchNewsApiItems(symbol: string, companyName: string): Promise<RawSourceItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", `"${companyName}" OR ${symbol}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "8");

  const response = await fetch(url, { headers: { "X-Api-Key": apiKey }, next: { revalidate: 300 } });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    articles?: Array<{
      title?: string;
      url?: string;
      publishedAt?: string;
      description?: string;
      content?: string;
      source?: { name?: string };
    }>;
  };

  return (payload.articles ?? []).map((article, index) => ({
    id: stableId(article.url, article.publishedAt, symbol, index),
    title: article.title ?? `${companyName} news`,
    url: article.url ?? "#",
    source: article.source?.name ?? "News API",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    body: article.content ?? article.description ?? article.title ?? "",
    sourceKind: "news_api" as const,
    companyTags: [symbol],
  }));
}
