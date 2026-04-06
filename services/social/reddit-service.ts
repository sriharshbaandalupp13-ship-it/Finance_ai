import type { RawSourceItem } from "@/data/contracts";

const SUBREDDITS = ["stocks", "investing", "wallstreetbets"];

export async function fetchRedditMentions(symbol: string, companyName: string): Promise<RawSourceItem[]> {
  const query = encodeURIComponent(`${symbol} ${companyName}`);

  const jobs = SUBREDDITS.map(async (subreddit): Promise<RawSourceItem[]> => {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&restrict_sr=1&sort=new&limit=5`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "finance-signal-studio/1.0" },
        next: { revalidate: 300 },
      });

      if (!response.ok) return [];

      const payload = (await response.json()) as {
        data?: { children?: Array<{ data?: Record<string, unknown> }> };
      };

      return (payload.data?.children ?? []).map((child, index) => {
        const item = child.data ?? {};
        const permalink = typeof item.permalink === "string" ? item.permalink : "";
        const title = typeof item.title === "string" ? item.title : `${companyName} mention`;
        const selfText = typeof item.selftext === "string" ? item.selftext : "";
        const createdUtc = typeof item.created_utc === "number" ? item.created_utc : Date.now() / 1000;
        const postId = typeof item.id === "string" ? item.id : String(index);

        return {
          id: `reddit-${subreddit}-${symbol}-${postId}`,
          title,
          url: permalink ? `https://www.reddit.com${permalink}` : "#",
          source: `r/${subreddit}`,
          publishedAt: new Date(createdUtc * 1000).toISOString(),
          body: selfText || title,
          sourceKind: "reddit" as const,
          companyTags: [symbol],
        };
      });
    } catch {
      return [];
    }
  });

  const settled = await Promise.allSettled(jobs);
  const all = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const seen = new Set<string>();
  return all.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
