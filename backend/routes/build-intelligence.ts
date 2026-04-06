import { WATCHLIST, RELATIONS } from "@/data/watchlist";
import type { CompanyIntelligence, CompanyProfile, CompanyRelation, IntelligenceResponse, ProcessedSignalItem, TrendingCompany, SentimentLabel } from "@/data/contracts";
import { buildAlerts, buildSentimentSnapshot } from "@/backend/engines/sentiment-engine";
import { buildPrediction } from "@/backend/engines/prediction-engine";
import { persistSignalItems, persistSnapshot } from "@/backend/repositories/intelligence-repository";
import { processSignalItem } from "@/services/ai/gemini-service";
import { fetchNewsApiItems } from "@/services/news/newsapi-service";
import { fetchRssNews } from "@/services/news/rss-service";
import { fetchRedditMentions } from "@/services/social/reddit-service";
import { fetchStockSnapshot } from "@/services/stocks/market-service";

function getCompany(symbol: string): CompanyProfile {
  return WATCHLIST.find((company) => company.symbol === symbol.toUpperCase()) ?? {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Company`,
    exchange: "US",
    sector: "Unknown",
  };
}

function getRelations(symbol: string): CompanyRelation[] {
  return RELATIONS.filter((relation) => relation.sourceSymbol === symbol.toUpperCase() || relation.targetSymbol === symbol.toUpperCase());
}

function getRelatedCompanies(symbol: string): CompanyProfile[] {
  const connected = new Set<string>();
  for (const relation of getRelations(symbol)) {
    if (relation.sourceSymbol !== symbol.toUpperCase()) connected.add(relation.sourceSymbol);
    if (relation.targetSymbol !== symbol.toUpperCase()) connected.add(relation.targetSymbol);
  }
  return [...connected].map(getCompany);
}

function dedupe(items: ProcessedSignalItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url === "#" ? `${item.source}-${item.title}` : item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildWhyMoving(symbol: string, items: ProcessedSignalItem[]) {
  const drivers = items.slice(0, 3).map((item) => `${item.financialEvent} from ${item.source} (${item.sentiment}, ${item.impact} impact)`);
  return drivers.length
    ? `${symbol} is moving because of ${drivers.join("; ")}.`
    : `${symbol} does not have enough recent catalysts yet, so the system is leaning on market structure and stock behavior.`;
}

function buildTrending(allSignals: ProcessedSignalItem[]): TrendingCompany[] {
  const bucket = new Map<string, { score: number; mentions: number; pos: number; neg: number }>();
  for (const item of allSignals) {
    for (const tag of item.companyTags) {
      const current = bucket.get(tag) ?? { score: 0, mentions: 0, pos: 0, neg: 0 };
      current.mentions += 1;
      current.score += item.impact === "high" ? 16 : item.impact === "medium" ? 10 : 4;
      if (item.sentiment === "positive") current.pos += 1;
      if (item.sentiment === "negative") current.neg += 1;
      bucket.set(tag, current);
    }
  }

  return [...bucket.entries()]
    .map(([symbol, value]) => {
      const sentiment: SentimentLabel = value.pos > value.neg ? "positive" : value.neg > value.pos ? "negative" : "neutral";
      return {
        symbol,
        name: getCompany(symbol).name,
        buzzScore: value.score + value.mentions * 2,
        mentionVolume: value.mentions,
        sentiment,
      };
    })
    .sort((left, right) => right.buzzScore - left.buzzScore)
    .slice(0, 6);
}

async function fetchSignalsForCompany(company: CompanyProfile): Promise<ProcessedSignalItem[]> {
  const raw = await Promise.all([
    fetchRssNews(company.symbol, company.name),
    fetchNewsApiItems(company.symbol, company.name),
    fetchRedditMentions(company.symbol, company.name),
  ]).then((batches) => batches.flat());

  const processed = await Promise.all(raw.slice(0, 18).map((item) => processSignalItem(item, company)));
  return dedupe(processed).sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export async function buildCompanyIntelligence(symbol: string): Promise<IntelligenceResponse> {
  const company = getCompany(symbol);
  const relations = getRelations(company.symbol);
  const relatedCompanies = getRelatedCompanies(company.symbol);

  const [processedItems, stock, relatedStocks] = await Promise.all([
    fetchSignalsForCompany(company),
    fetchStockSnapshot(company.symbol, company.name),
    Promise.all(relatedCompanies.slice(0, 4).map((item) => fetchStockSnapshot(item.symbol, item.name))),
  ]);

  const sentiment = buildSentimentSnapshot(company.symbol, processedItems);
  const dominantDrivers = [...new Set(processedItems.slice(0, 5).map((item) => item.financialEvent))];
  const prediction = await buildPrediction(company, sentiment, dominantDrivers);
  const alerts = buildAlerts(company.symbol, processedItems, sentiment);
  const whyMoving = buildWhyMoving(company.symbol, processedItems);

  const primary: CompanyIntelligence = {
    company,
    processedItems,
    stock,
    sentiment,
    prediction,
    relations,
    relatedCompanies,
    relatedStocks,
    alerts,
    whyMoving,
    generatedAt: new Date().toISOString(),
  };

  await Promise.all([persistSignalItems(processedItems), persistSnapshot(primary)]);

  const relatedSignals = await Promise.all(relatedCompanies.slice(0, 4).map(fetchSignalsForCompany));
  const allSignals = [processedItems, ...relatedSignals].flat();

  return {
    symbol: company.symbol,
    requestedAt: new Date().toISOString(),
    primary,
    comparison: [stock, ...relatedStocks],
    trending: buildTrending(allSignals),
    workflow: [
      { id: "news", label: "News", value: `${processedItems.length} items` },
      { id: "sentiment", label: "Sentiment", value: `${sentiment.score}/100` },
      { id: "prediction", label: "Prediction", value: `${prediction.direction} • ${Math.round(prediction.confidence * 100)}%` },
      { id: "relations", label: "Related Companies", value: `${relatedCompanies.length} links` },
    ],
  };
}

export async function buildTrendingSnapshot() {
  const companies = WATCHLIST.slice(0, 6);
  const signals = (await Promise.all(companies.map(fetchSignalsForCompany))).flat();
  return buildTrending(signals);
}
