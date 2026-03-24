import type { RawSourceItem } from "@/data/contracts";

export async function fetchNewsApiItems(symbol: string, companyName: string): Promise<RawSourceItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", `\"${companyName}\" OR ${symbol}`);
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
    id: `newsapi-${symbol}-${index}`,
    title: article.title ?? `${companyName} news`,
    url: article.url ?? "#",
    source: article.source?.name ?? "News API",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    body: article.content ?? article.description ?? article.title ?? "",
    sourceKind: "news_api" as const,
    companyTags: [symbol],
  }));
}
