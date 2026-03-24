import Parser from "rss-parser";
import type { RawSourceItem } from "@/data/contracts";
import { normalizeAlphaDate } from "@/utils/date";

const parser = new Parser();

const FEEDS = [
  { source: "Google News", url: "https://news.google.com/rss/search?q={query}+stock&hl=en-US&gl=US&ceid=US:en" },
  { source: "Yahoo Finance", url: "https://finance.yahoo.com/rss/headline?s={query}" },
];

export async function fetchRssNews(symbol: string, companyName: string): Promise<RawSourceItem[]> {
  const query = encodeURIComponent(`${companyName} ${symbol}`);
  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url.replace("{query}", query));
      return (parsed.items ?? []).slice(0, 5).map((item, index) => ({
        id: `rss-${feed.source}-${symbol}-${index}`,
        title: item.title ?? `${companyName} update`,
        url: item.link ?? "#",
        source: feed.source,
        publishedAt: normalizeAlphaDate(item.isoDate ?? item.pubDate ?? new Date().toISOString()),
        body: item.contentSnippet ?? item.content ?? item.title ?? "",
        sourceKind: "rss" as const,
        companyTags: [symbol],
      }));
    }),
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}
