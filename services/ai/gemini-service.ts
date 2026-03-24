import { z } from "zod";
import type {
  CompanyProfile,
  PredictionSnapshot,
  ProcessedSignalItem,
  RawSourceItem,
  SentimentLabel,
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
});

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

export async function generatePrediction(company: CompanyProfile, context: { score: number; trend: number; mentionVolume: number; dominantDrivers: string[]; }): Promise<PredictionSnapshot> {
  const prompt = `You are generating a stock direction call for ${company.symbol} (${company.name}). Return strict JSON with keys direction, confidence, explanation. Score: ${context.score}. Trend delta: ${context.trend}. Mention volume: ${context.mentionVolume}. Drivers: ${context.dominantDrivers.join(", ")}. Allowed direction values: UP, DOWN, NEUTRAL.`;
  const geminiText = await callGemini(prompt);
  if (!geminiText) {
    const direction = context.score >= 62 ? "UP" : context.score <= 42 ? "DOWN" : "NEUTRAL";
    return {
      symbol: company.symbol,
      direction,
      confidence: Math.min(0.93, 0.45 + Math.abs(context.score - 50) / 100 + Math.min(context.mentionVolume, 12) / 100),
      explanation: direction === "UP"
        ? "Stock likely to rise due to positive sentiment, stronger impact events, and rising mention volume."
        : direction === "DOWN"
          ? "Stock likely to weaken due to negative sentiment pressure and adverse event flow."
          : "Signals are mixed, so the stock outlook remains neutral for now.",
    };
  }

  try {
    const parsed = PredictionSchema.parse(JSON.parse(geminiText));
    return {
      symbol: company.symbol,
      ...parsed,
    };
  } catch {
    return {
      symbol: company.symbol,
      direction: "NEUTRAL",
      confidence: 0.5,
      explanation: "AI response could not be parsed cleanly, so the model returned a neutral fallback.",
    };
  }
}
