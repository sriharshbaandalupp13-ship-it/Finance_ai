import { z } from "zod";
import type {
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
  priceChangePct: z.number(), // expected % move (positive = up, negative = down)
});

// ---------------------------------------------------------------------------
// Price-target algorithm
//
// Uses a multi-factor model that mirrors techniques used by quant desks:
//   1. ATR (Average True Range) — measures the stock's typical daily volatility
//   2. Sentiment multiplier     — amplifies / dampens move based on news score
//   3. Momentum factor          — recent trend bias (last 5 vs last 20 closes)
//   4. Confidence scaling       — caps the move when AI is less certain
// ---------------------------------------------------------------------------
function computePriceTarget(
  currentPrice: number,
  history: StockPoint[],
  direction: "UP" | "DOWN" | "NEUTRAL",
  sentimentScore: number,   // 0-100
  confidence: number,       // 0-1
): { priceChange: number; priceTarget: number } {
  if (!currentPrice || history.length < 2) {
    return { priceChange: 0, priceTarget: currentPrice ?? 0 };
  }

  // 1. Average True Range over last 14 sessions (daily high-low proxy via close-to-close)
  const closes = history.map((p) => p.close);
  const trueRanges = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
  const atrWindow = Math.min(14, trueRanges.length);
  const atr = trueRanges.slice(-atrWindow).reduce((sum, v) => sum + v, 0) / atrWindow;

  // 2. Sentiment multiplier: neutral = 1.0, strong positive/negative = up to 1.6
  //    Sentiment score is 0-100, neutral centre is 50.
  const sentimentStrength = Math.abs(sentimentScore - 50) / 50; // 0-1
  const sentimentMultiplier = 1.0 + sentimentStrength * 0.6;    // 1.0 – 1.6

  // 3. Short-term momentum: compare SMA-5 vs SMA-20 (or available history)
  const sma5  = closes.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, closes.length);
  const sma20 = closes.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, closes.length);
  const momentumBias = sma5 > sma20 ? 1.1 : sma5 < sma20 ? 0.9 : 1.0;

  // 4. Base expected move = ATR × sentiment × momentum × confidence
  //    Confidence scales the size down when the model is uncertain.
  const baseMoveRaw = atr * sentimentMultiplier * momentumBias * confidence;

  // 5. Cap the move at 5% of current price (prevents extreme outliers)
  const maxMove = currentPrice * 0.05;
  const baseMove = Math.min(baseMoveRaw, maxMove);

  // 6. Apply direction sign
  const sign = direction === "UP" ? 1 : direction === "DOWN" ? -1 : 0;
  const priceChange = Number((sign * baseMove).toFixed(2));
  const priceTarget = Number((currentPrice + priceChange).toFixed(2));

  return { priceChange, priceTarget };
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
  const prompt = `You are processing financial news for ${company.symbol} (${company.name}). Return strict JSON with keys summary, sentiment, financialEvent, impact, explanation, confidence, companyTags. Input title: ${item.title}. Input body: ${item.body}. Allowed sentiment: positive, neutral, negative. Allowed impact: low, medium, high.`;
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

  // ── Fallback: heuristic direction + quantitative price target ──────────────
  if (!geminiText) {
    const direction = context.score >= 62 ? "UP" : context.score <= 42 ? "DOWN" : "NEUTRAL";
    const confidence = Math.min(0.93, 0.45 + Math.abs(context.score - 50) / 100 + Math.min(context.mentionVolume, 12) / 100);
    const { priceChange, priceTarget } = computePriceTarget(
      context.currentPrice ?? 0,
      context.history,
      direction,
      context.score,
      confidence,
    );
    return {
      symbol: company.symbol,
      direction,
      confidence,
      priceChange,
      priceTarget,
      explanation: direction === "UP"
        ? "Stock likely to rise due to positive sentiment, stronger impact events, and rising mention volume."
        : direction === "DOWN"
          ? "Stock likely to weaken due to negative sentiment pressure and adverse event flow."
          : "Signals are mixed, so the stock outlook remains neutral for now.",
    };
  }

  // ── Gemini path: parse direction + use our algorithm for price target ───────
  try {
    const parsed = PredictionSchema.parse(JSON.parse(geminiText));

    // Gemini gives us a % estimate; we also run our own ATR model and blend them.
    const geminiMovePct = parsed.priceChangePct / 100;
    const geminiMoveAbs = context.currentPrice ? context.currentPrice * geminiMovePct : 0;

    const { priceChange: atrMove, priceTarget: atrTarget } = computePriceTarget(
      context.currentPrice ?? 0,
      context.history,
      parsed.direction,
      context.score,
      parsed.confidence,
    );

    // Blend: 60% ATR model + 40% Gemini estimate for a more robust signal
    const blendedChange = Number((atrMove * 0.6 + geminiMoveAbs * 0.4).toFixed(2));
    const blendedTarget = Number(((context.currentPrice ?? 0) + blendedChange).toFixed(2));

    return {
      symbol: company.symbol,
      direction: parsed.direction,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
      priceChange: blendedChange,
      priceTarget: blendedTarget,
    };
  } catch {
    return {
      symbol: company.symbol,
      direction: "NEUTRAL",
      confidence: 0.5,
      priceChange: 0,
      priceTarget: context.currentPrice ?? 0,
      explanation: "AI response could not be parsed cleanly, so the model returned a neutral fallback.",
    };
  }
}
