import type { CompanyProfile, PredictionSnapshot, SentimentSnapshot, StockSnapshot } from "@/data/contracts";
import { generatePrediction } from "@/services/ai/gemini-service";

export async function buildPrediction(
  company: CompanyProfile,
  sentiment: SentimentSnapshot,
  dominantDrivers: string[],
  stock: StockSnapshot,
): Promise<PredictionSnapshot> {
  return generatePrediction(company, {
    score: sentiment.score,
    trend: sentiment.trend,
    mentionVolume: sentiment.mentionVolume,
    dominantDrivers,
    currentPrice: stock.price,
    history: stock.history,
  });
}
