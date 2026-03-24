import type { RawSourceItem } from "@/data/contracts";

const SUBREDDITS = ["stocks", "investing", "wallstreetbets"];

export async function fetchRedditMentions(symbol: string, companyName: string): Promise<RawSourceItem[]> {
  const queries = [`${symbol}`, `\"${companyName}\"`];
  const jobs = SUBREDDITS.flatMap((subreddit) =>
    queries.map(async (query) => {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=4`;
      const response = await fetch(url, {
        headers: { "User-Agent": "finance-signal-studio/1.0" },
        next: { revalidate: 300 },
      });
      if (!response.ok) return [] as RawSourceItem[];
      const payload = (await response.json()) as {
        data?: { children?: Array<{ data?: Record<string, unknown> }> };
      };

      return (payload.data?.children ?? []).map((child, index) => {
        const item = child.data ?? {};
        const permalink = typeof item.permalink === "string" ? item.permalink : "";
        const title = typeof item.title === "string" ? item.title : `${companyName} reddit mention`;
        const selfText = typeof item.selftext === "string" ? item.selftext : "";
        const createdUtc = typeof item.created_utc === "number" ? item.created_utc : Date.now() / 1000;
        return {
          id: `reddit-${subreddit}-${symbol}-${index}-${String(item.id ?? index)}`,
          title,
          url: permalink ? `https://www.reddit.com${permalink}` : "#",
          source: `r/${subreddit}`,
          publishedAt: new Date(createdUtc * 1000).toISOString(),
          body: selfText || title,
          sourceKind: "reddit" as const,
          companyTags: [symbol],
        };
      });
    }),
  );

  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}
