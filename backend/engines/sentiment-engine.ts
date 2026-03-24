import type { AlertItem, ProcessedSignalItem, SentimentSnapshot } from "@/data/contracts";

const SENTIMENT_WEIGHT = {
  positive: 12,
  neutral: 1,
  negative: -12,
} as const;

const IMPACT_WEIGHT = {
  low: 4,
  medium: 9,
  high: 16,
} as const;

export function buildSentimentSnapshot(symbol: string, items: ProcessedSignalItem[]): SentimentSnapshot {
  const volume = items.length;
  const weighted = items.reduce((score, item) => score + SENTIMENT_WEIGHT[item.sentiment] + IMPACT_WEIGHT[item.impact], 50);
  const positiveCount = items.filter((item) => item.sentiment === "positive").length;
  const neutralCount = items.filter((item) => item.sentiment === "neutral").length;
  const negativeCount = items.filter((item) => item.sentiment === "negative").length;
  const highImpactCount = items.filter((item) => item.impact === "high").length;
  const score = Math.max(0, Math.min(100, weighted + Math.min(volume * 2, 18) - negativeCount * 2));
  const trend = Number(((positiveCount - negativeCount) * 2.8 + highImpactCount * 1.2).toFixed(2));

  return {
    symbol,
    score,
    trend,
    mentionVolume: volume,
    positiveCount,
    neutralCount,
    negativeCount,
    highImpactCount,
    updatedAt: new Date().toISOString(),
  };
}

export function buildAlerts(symbol: string, items: ProcessedSignalItem[], snapshot: SentimentSnapshot): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (snapshot.trend >= 6) {
    alerts.push({
      id: `${symbol}-spike-up`,
      symbol,
      title: "Positive sentiment spike",
      detail: `Mention velocity and positive impact signals accelerated for ${symbol}.`,
      severity: "high",
      createdAt: new Date().toISOString(),
    });
  }

  if (snapshot.trend <= -6) {
    alerts.push({
      id: `${symbol}-spike-down`,
      symbol,
      title: "Negative sentiment spike",
      detail: `Negative coverage is accelerating and may pressure ${symbol}.`,
      severity: "high",
      createdAt: new Date().toISOString(),
    });
  }

  const regulationItem = items.find((item) => item.financialEvent.includes("regulation") || item.financialEvent.includes("layoff"));
  if (regulationItem) {
    alerts.push({
      id: `${symbol}-event-risk`,
      symbol,
      title: "High-attention event detected",
      detail: regulationItem.explanation,
      severity: regulationItem.impact,
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}
