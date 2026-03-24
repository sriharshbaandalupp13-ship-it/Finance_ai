import type { NewsItem, SourceHealth } from "@/lib/types";

interface ApifyDatasetItem {
  text?: string;
  url?: string;
  timestamp?: string;
  ownerUsername?: string;
}

async function callActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<ApifyDatasetItem[]> {
  const token = process.env.APIFY_API_TOKEN;

  if (!token || !actorId) {
    return [];
  }

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!runResponse.ok) {
    throw new Error("Apify actor run failed");
  }

  const runPayload = (await runResponse.json()) as {
    data?: {
      defaultDatasetId?: string;
    };
  };

  const datasetId = runPayload.data?.defaultDatasetId;
  if (!datasetId) {
    return [];
  }

  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${token}`,
    { next: { revalidate: 300 } },
  );

  if (!datasetResponse.ok) {
    throw new Error("Apify dataset read failed");
  }

  return (await datasetResponse.json()) as ApifyDatasetItem[];
}

export async function fetchSocialSignals(symbol: string) {
  const results: NewsItem[] = [];
  const health: SourceHealth[] = [];

  const platformConfigs = [
    {
      key: "x" as const,
      label: "X / Twitter",
      actorId: process.env.X_SEARCH_ACTOR_ID,
      input: { searchTerms: [symbol], maxItems: 5 },
    },
    {
      key: "instagram" as const,
      label: "Instagram",
      actorId: process.env.INSTAGRAM_SEARCH_ACTOR_ID,
      input: { hashtags: [symbol], resultsLimit: 5 },
    },
    {
      key: "facebook" as const,
      label: "Facebook",
      actorId: process.env.FACEBOOK_SEARCH_ACTOR_ID,
      input: { searchQueries: [symbol], resultsLimit: 5 },
    },
  ];

  for (const config of platformConfigs) {
    if (!process.env.APIFY_API_TOKEN || !config.actorId) {
      health.push({
        key: config.key,
        label: config.label,
        status: "optional",
        detail: "Connector ready. Add Apify token and actor ID to activate this source.",
      });
      continue;
    }

    try {
      const items = await callActor(config.actorId, config.input);

      items.slice(0, 4).forEach((item, index) => {
        results.push({
          id: `${config.key}-${symbol}-${index}`,
          title: item.text?.slice(0, 120) ?? `${config.label} mention`,
          source: item.ownerUsername ?? config.label,
          url: item.url ?? "#",
          publishedAt: item.timestamp ?? new Date().toISOString(),
          summary: item.text ?? "Social post body unavailable.",
          sentiment: "neutral",
          kind: config.key,
        });
      });

      health.push({
        key: config.key,
        label: config.label,
        status: "live",
        detail: `Fetched ${items.slice(0, 4).length} social items.`,
      });
    } catch {
      health.push({
        key: config.key,
        label: config.label,
        status: "unavailable",
        detail: "Connector failed. Check actor permissions, quotas, or input schema.",
      });
    }
  }

  return {
    items: results,
    health,
  };
}
