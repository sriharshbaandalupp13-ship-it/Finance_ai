import { generateInsight } from "@/lib/ai/generate-brief";
import { fetchQuote, fetchAlphaNews } from "@/lib/market/alpha-vantage";
import { getConnections } from "@/lib/mock/relationships";
import { fetchNewsApiNews } from "@/lib/news/news-api";
import { fetchSocialSignals } from "@/lib/social/apify";
import type { CompanyResponse, NewsItem, SourceHealth } from "@/lib/types";

function dedupeNews(items: NewsItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.url !== "#" ? item.url : `${item.source}:${item.title}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function getCompanySnapshot(symbol: string): Promise<CompanyResponse> {
  const company = await fetchQuote(symbol);
  const connections = getConnections(symbol);

  const [alphaNews, extraNews, social] = await Promise.all([
    fetchAlphaNews(symbol).catch(() => []),
    fetchNewsApiNews(symbol).catch(() => []),
    fetchSocialSignals(symbol).catch(() => ({ items: [], health: [] })),
  ]);

  const related = await Promise.all(
    connections.map((connection) =>
      fetchQuote(connection.symbol).catch(() => ({
        symbol: connection.symbol,
        name: connection.name,
        price: null,
        change: null,
        changePercent: null,
        currency: "USD",
      })),
    ),
  );

  const sourceHealth: SourceHealth[] = [
    {
      key: "news",
      label: "Alpha Vantage",
      status: process.env.ALPHA_VANTAGE_API_KEY ? "live" : "optional",
      detail: process.env.ALPHA_VANTAGE_API_KEY
        ? "Quote and sentiment connector configured."
        : "Add ALPHA_VANTAGE_API_KEY for live market and news data.",
    },
    {
      key: "analysis",
      label: "News API",
      status: process.env.NEWS_API_KEY ? "live" : "optional",
      detail: process.env.NEWS_API_KEY
        ? "Secondary mainstream news source enabled."
        : "Optional extra news layer. Add NEWS_API_KEY to diversify sources.",
    },
    ...social.health,
  ];

  const news = dedupeNews([...social.items, ...alphaNews, ...extraNews]).sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );

  const insight = await generateInsight(company, news);

  return {
    company,
    related,
    connections,
    news,
    sourceHealth,
    insight,
    generatedAt: new Date().toISOString(),
  };
}
