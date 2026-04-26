import { z } from "zod";
import type {
  CompanyRelationType,
  CompanyProfile,
  PredictionSnapshot,
  ProcessedSignalItem,
  RawSourceItem,
  SentimentLabel,
  StockPoint,
} from "@/data/contracts";

const ItemSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  financialEvent: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  companyTags: z.array(z.string()).default([]),
});

const PredictionSchema = z.object({
  direction: z.enum(["UP", "DOWN", "NEUTRAL"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  priceChangePct: z.number(),
});

const RelationInferenceSchema = z.object({
  relations: z.array(z.object({
    target: z.string(),
    relation: z.enum(["competitor", "supplier", "partner", "customer", "manufacturer"]),
    rationale: z.string(),
    strength: z.number().min(0).max(1),
  })).max(5).default([]),
});

export interface RelationSuggestion {
  target: string;
  relation: CompanyRelationType;
  rationale: string;
  strength: number;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatSignedRupees(value: number) {
  return `${value >= 0 ? "+" : "-"}INR ${Math.abs(value).toFixed(2)}`;
}

function computeTomorrowProjection(input: {
  currentPrice: number;
  history: StockPoint[];
  directionHint: "UP" | "DOWN" | "NEUTRAL";
  sentimentScore: number;
  trend: number;
  mentionVolume: number;
  confidence: number;
  aiMovePct?: number | null;
}): { direction: "UP" | "DOWN" | "NEUTRAL"; priceChange: number; priceTarget: number } {
  const {
    currentPrice,
    history,
    directionHint,
    sentimentScore,
    trend,
    mentionVolume,
    confidence,
    aiMovePct,
  } = input;

  if (!currentPrice || history.length < 2) {
    return { direction: "NEUTRAL", priceChange: 0, priceTarget: currentPrice ?? 0 };
  }

  const closes = history.map((point) => point.close);
  const dailyMoves = closes.slice(1).map((close, index) => close - closes[index]);
  const absDailyMoves = dailyMoves.map((move) => Math.abs(move));
  const dailyReturns = closes
    .slice(1)
    .map((close, index) => (closes[index] ? (close - closes[index]) / closes[index] : 0));

  const atr = average(absDailyMoves.slice(-14));
  const realizedVolPct = average(dailyReturns.slice(-10).map((value) => Math.abs(value)));
  const volatilityFloorPct = currentPrice > 0 ? atr / currentPrice : 0;
  const baseVolatilityPct = clamp(Math.max(realizedVolPct, volatilityFloorPct, 0.004), 0.004, 0.06);

  const sma5 = average(closes.slice(-5));
  const sma20 = average(closes.slice(-20));
  const momentumBias = sma20 ? clamp((sma5 - sma20) / sma20, -0.03, 0.03) / 0.03 : 0;
  const sentimentBias = clamp((sentimentScore - 50) / 50, -1, 1);
  const trendBias = clamp(trend / 12, -1, 1);
  const mentionBias = clamp((mentionVolume - 4) / 12, 0, 1);

  const directionalScore = sentimentBias * 0.48 + trendBias * 0.27 + momentumBias * 0.17 + mentionBias * 0.08;
  const modelDirection =
    directionalScore >= 0.08 ? "UP" : directionalScore <= -0.08 ? "DOWN" : "NEUTRAL";
  const direction = directionHint === "NEUTRAL" ? modelDirection : directionHint;

  const directionalStrength = clamp(Math.abs(directionalScore), 0, 1);
  const confidenceFactor = 0.6 + confidence * 0.65;
  const signalFactor = 0.75 + directionalStrength * 0.9;
  const volumeFactor = 0.9 + mentionBias * 0.3;
  const heuristicMovePct = baseVolatilityPct * confidenceFactor * signalFactor * volumeFactor;

  const signedAiMovePct =
    typeof aiMovePct === "number"
      ? clamp(
          directionHint === "DOWN"
            ? -Math.abs(aiMovePct)
            : directionHint === "UP"
              ? Math.abs(aiMovePct)
              : aiMovePct,
          -0.08,
          0.08,
        )
      : null;

  const signedHeuristicMovePct =
    direction === "UP" ? heuristicMovePct : direction === "DOWN" ? -heuristicMovePct : 0;

  const blendedMovePct =
    signedAiMovePct === null
      ? signedHeuristicMovePct
      : signedHeuristicMovePct * 0.7 + signedAiMovePct * 0.3;

  const normalizedMovePct =
    direction === "NEUTRAL"
      ? clamp(blendedMovePct, -0.0025, 0.0025)
      : direction === "UP"
        ? Math.max(blendedMovePct, 0.0015)
        : Math.min(blendedMovePct, -0.0015);

  const cappedMovePct = clamp(normalizedMovePct, -0.07, 0.07);
  const priceChange = Number((currentPrice * cappedMovePct).toFixed(2));
  const priceTarget = Number((currentPrice + priceChange).toFixed(2));

  return {
    direction: priceChange > 0 ? "UP" : priceChange < 0 ? "DOWN" : "NEUTRAL",
    priceChange,
    priceTarget,
  };
}

function heuristics(item: RawSourceItem): ProcessedSignalItem {
  const text = `${item.title} ${item.body}`.toLowerCase();
  const positiveHits = ["beat", "growth", "surge", "partnership", "record", "launch", "strong", "upgrade"].filter((word) => text.includes(word)).length;
  const negativeHits = ["miss", "layoff", "probe", "lawsuit", "delay", "cut", "regulation", "recall"].filter((word) => text.includes(word)).length;
  const sentiment: SentimentLabel = positiveHits > negativeHits ? "positive" : negativeHits > positiveHits ? "negative" : "neutral";
  const financialEvent = text.includes("earnings") || text.includes("revenue")
    ? "earnings"
    : text.includes("merger") || text.includes("acquisition")
      ? "mergers"
      : text.includes("layoff")
        ? "layoffs"
        : text.includes("regulation") || text.includes("probe")
          ? "regulation"
          : text.includes("launch") || text.includes("product")
            ? "product_launch"
            : "market_update";
  const impact = positiveHits + negativeHits >= 2 ? "high" : positiveHits + negativeHits === 1 ? "medium" : "low";

  return {
    ...item,
    summary: item.body.slice(0, 180) || item.title,
    sentiment,
    financialEvent,
    impact,
    explanation: `${item.source} mentions ${item.companyTags.join(", ") || "the company"} with a ${sentiment} tone driven by ${financialEvent.replace("_", " ")}.`,
    confidence: impact === "high" ? 0.78 : impact === "medium" ? 0.63 : 0.54,
  };
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export async function processSignalItem(item: RawSourceItem, company: CompanyProfile): Promise<ProcessedSignalItem> {
  const prompt = `You are processing financial news for ${company.symbol} (${company.name}). Return strict JSON with keys summary, sentiment, financialEvent, impact, explanation, confidence, companyTags. Input title: ${item.title}. Input body: ${item.body}. Allowed sentiment: positive, neutral, negative. Allowed impact: low, medium, high. companyTags must include the primary company symbol and any other companies, brands, suppliers, competitors, customers, or publicly traded entities explicitly mentioned in the article.`;
  const geminiText = await callGemini(prompt);
  if (!geminiText) return heuristics(item);

  try {
    const parsed = ItemSchema.parse(JSON.parse(geminiText));
    return {
      ...item,
      ...parsed,
      companyTags: parsed.companyTags.length ? parsed.companyTags : item.companyTags,
    };
  } catch {
    return heuristics(item);
  }
}

export async function inferRelatedCompaniesFromSignals(
  company: CompanyProfile,
  items: ProcessedSignalItem[],
): Promise<RelationSuggestion[]> {
  const candidateTags = [...new Set(
    items
      .flatMap((item) => item.companyTags)
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag.toUpperCase() !== company.symbol.toUpperCase()),
  )].slice(0, 12);

  const condensedItems = items.slice(0, 8).map((item, index) => (
    `${index + 1}. title=${item.title}; summary=${item.summary}; sentiment=${item.sentiment}; event=${item.financialEvent}; tags=${item.companyTags.join(", ")}`
  )).join("\n");

  const prompt = `You are building a stock chain-reaction map for ${company.symbol} (${company.name}) in the ${company.sector} sector.
Use the news context below to identify up to 5 other companies that could react to the same catalysts.
Prefer companies explicitly mentioned in the articles or tags. If a company is clearly implied, you may infer it.
Return strict JSON with key relations. Each relation must have:
- target: company name or tradable symbol
- relation: one of competitor, supplier, partner, customer, manufacturer
- rationale: one short sentence
- strength: number from 0 to 1
Do not return the primary company itself.

Candidate companies from AI tags: ${candidateTags.join(", ") || "none"}.
News context:
${condensedItems || "No news context available."}`;

  const geminiText = await callGemini(prompt);
  if (geminiText) {
    try {
      const parsed = RelationInferenceSchema.parse(JSON.parse(geminiText));
      return parsed.relations.filter((relation) => relation.target.trim());
    } catch {
      // Fall through to tag-based fallback.
    }
  }

  const tagFrequency = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.companyTags) {
      const normalized = tag.trim();
      if (!normalized || normalized.toUpperCase() === company.symbol.toUpperCase()) continue;
      tagFrequency.set(normalized, (tagFrequency.get(normalized) ?? 0) + 1);
    }
  }

  return [...tagFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([target, count]) => ({
      target,
      relation: "partner" as CompanyRelationType,
      rationale: `${target} was mentioned alongside ${company.name} in recent AI-processed coverage.`,
      strength: Math.min(0.88, Number((0.42 + count * 0.1).toFixed(2))),
    }));
}

export async function generatePrediction(
  company: CompanyProfile,
  context: {
    score: number;
    trend: number;
    mentionVolume: number;
    dominantDrivers: string[];
    currentPrice: number | null;
    history: StockPoint[];
  },
): Promise<PredictionSnapshot> {
  const prompt = `You are a quantitative analyst generating a next-day stock call for ${company.symbol} (${company.name}).
Current price: ${context.currentPrice ?? "unknown"} INR.
Sentiment score: ${context.score}/100 (>62 bullish, <42 bearish).
Trend delta: ${context.trend}.
Mention volume: ${context.mentionVolume} articles.
Key drivers: ${context.dominantDrivers.join(", ")}.
Return strict JSON with keys: direction (UP|DOWN|NEUTRAL), confidence (0-1), explanation (1 sentence), priceChangePct (expected % price change for tomorrow, positive=up, negative=down, e.g. 1.2 means +1.2%).`;

  const geminiText = await callGemini(prompt);

  if (!geminiText) {
    const direction = context.score >= 62 ? "UP" : context.score <= 42 ? "DOWN" : "NEUTRAL";
    const confidence = Math.min(0.93, 0.45 + Math.abs(context.score - 50) / 100 + Math.min(context.mentionVolume, 12) / 100);
    const projection = computeTomorrowProjection({
      currentPrice: context.currentPrice ?? 0,
      history: context.history,
      directionHint: direction,
      sentimentScore: context.score,
      trend: context.trend,
      mentionVolume: context.mentionVolume,
      confidence,
    });

    return {
      symbol: company.symbol,
      direction: projection.direction,
      confidence,
      priceChange: projection.priceChange,
      priceTarget: projection.priceTarget,
      explanation: projection.direction === "UP"
        ? `Positive sentiment, recent momentum, and catalyst volume suggest a move of about ${formatSignedRupees(projection.priceChange)} by tomorrow.`
        : projection.direction === "DOWN"
          ? `Negative sentiment pressure and recent trend weakness point to a move of about ${formatSignedRupees(projection.priceChange)} by tomorrow.`
          : `Signals are mixed, so the model expects a mostly flat session tomorrow around INR ${projection.priceTarget.toFixed(2)}.`,
    };
  }

  try {
    const parsed = PredictionSchema.parse(JSON.parse(geminiText));
    const projection = computeTomorrowProjection({
      currentPrice: context.currentPrice ?? 0,
      history: context.history,
      directionHint: parsed.direction,
      sentimentScore: context.score,
      trend: context.trend,
      mentionVolume: context.mentionVolume,
      confidence: parsed.confidence,
      aiMovePct: parsed.priceChangePct / 100,
    });

    return {
      symbol: company.symbol,
      direction: projection.direction,
      confidence: parsed.confidence,
      explanation: `${parsed.explanation} Estimated move: ${formatSignedRupees(projection.priceChange)} to around INR ${projection.priceTarget.toFixed(2)} tomorrow.`,
      priceChange: projection.priceChange,
      priceTarget: projection.priceTarget,
    };
  } catch {
    return {
      symbol: company.symbol,
      direction: "NEUTRAL",
      confidence: 0.5,
      priceChange: 0,
      priceTarget: context.currentPrice ?? 0,
      explanation: `AI response could not be parsed cleanly, so the model returned a neutral fallback around INR ${(context.currentPrice ?? 0).toFixed(2)}.`,
    };
  }
}
