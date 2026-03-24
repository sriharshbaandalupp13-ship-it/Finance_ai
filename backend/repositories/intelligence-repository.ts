import type { CompanyIntelligence, ProcessedSignalItem } from "@/data/contracts";
import { createSupabaseAdmin } from "@/services/supabase/admin";

export async function persistSignalItems(items: ProcessedSignalItem[]) {
  const supabase = createSupabaseAdmin();
  if (!supabase || !items.length) return;

  await supabase.from("signal_items").upsert(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      source: item.source,
      source_kind: item.sourceKind,
      published_at: item.publishedAt,
      company_tags: item.companyTags,
      summary: item.summary,
      sentiment: item.sentiment,
      financial_event: item.financialEvent,
      impact: item.impact,
      explanation: item.explanation,
      confidence: item.confidence,
    })),
  );
}

export async function persistSnapshot(snapshot: CompanyIntelligence) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("company_snapshots").insert({
    symbol: snapshot.company.symbol,
    sentiment_score: snapshot.sentiment.score,
    sentiment_trend: snapshot.sentiment.trend,
    mention_volume: snapshot.sentiment.mentionVolume,
    prediction_direction: snapshot.prediction.direction,
    prediction_confidence: snapshot.prediction.confidence,
    why_moving: snapshot.whyMoving,
    generated_at: snapshot.generatedAt,
    payload: snapshot,
  });
}
