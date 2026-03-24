import type { CompanyProfile, PredictionSnapshot, SentimentSnapshot } from "@/data/contracts";
import { generatePrediction } from "@/services/ai/gemini-service";

export async function buildPrediction(company: CompanyProfile, sentiment: SentimentSnapshot, dominantDrivers: string[]): Promise<PredictionSnapshot> {
  return generatePrediction(company, {
    score: sentiment.score,
    trend: sentiment.trend,
    mentionVolume: sentiment.mentionVolume,
    dominantDrivers,
  });
}
