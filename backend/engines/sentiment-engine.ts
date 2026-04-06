import type { AlertItem, ProcessedSignalItem, SentimentSnapshot } from "@/data/contracts";

const SENTIMENT_CONTRIBUTION = {
  positive: 1,
  neutral: 0,
  negative: -1,
} as const;

const IMPACT_MULTIPLIER = {
  low: 0.6,
  medium: 1.0,
  high: 1.4,
} as const;

export function buildSentimentSnapshot(symbol: string, items: ProcessedSignalItem[]): SentimentSnapshot {
  const volume = items.length;
  const positiveCount = items.filter((i) => i.sentiment === "positive").length;
  const neutralCount = items.filter((i) => i.sentiment === "neutral").length;
  const negativeCount = items.filter((i) => i.sentiment === "negative").length;
  const highImpactCount = items.filter((i) => i.impact === "high").length;

  let score = 50;

  if (volume > 0) {
    const totalWeight = items.reduce((sum, item) => sum + IMPACT_MULTIPLIER[item.impact], 0);
    const weightedSum = items.reduce(
      (sum, item) => sum + SENTIMENT_CONTRIBUTION[item.sentiment] * IMPACT_MULTIPLIER[item.impact],
      0,
    );
    const mean = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const base = 50 + mean * 50;
    const volumeBonus = Math.min(volume, 30) / 6;
    score = Math.round(Math.max(0, Math.min(100, base + volumeBonus)));
  }

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

  const regulationItem = items.find(
    (item) => item.financialEvent.includes("regulation") || item.financialEvent.includes("layoff"),
  );
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
