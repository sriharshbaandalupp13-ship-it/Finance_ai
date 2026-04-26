import { WATCHLIST, RELATIONS, resolveCompanyQuery } from "@/data/watchlist";
import type {
  CompanyIntelligence,
  CompanyProfile,
  CompanyRelation,
  CompanyRelationType,
  IntelligenceResponse,
  ProcessedSignalItem,
  TrendingCompany,
  SentimentLabel,
} from "@/data/contracts";
import { buildAlerts, buildSentimentSnapshot } from "@/backend/engines/sentiment-engine";
import { buildPrediction } from "@/backend/engines/prediction-engine";
import { persistSignalItems, persistSnapshot } from "@/backend/repositories/intelligence-repository";
import { inferRelatedCompaniesFromSignals, processSignalItem, type RelationSuggestion } from "@/services/ai/gemini-service";
import { fetchNewsApiItems } from "@/services/news/newsapi-service";
import { fetchRssNews } from "@/services/news/rss-service";
import { fetchRedditMentions } from "@/services/social/reddit-service";
import { fetchStockSnapshot } from "@/services/stocks/market-service";

function normalizeToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferSector(value: string) {
  const normalized = normalizeToken(value);

  if (/(BANK|FINANCE|INSURANCE)/.test(normalized)) return "Banking";
  if (/(STEEL|METAL|MINING)/.test(normalized)) return "Metals";
  if (/(MOTOR|AUTO|AUTOZONE|TYRE)/.test(normalized)) return "Automotive";
  if (/(TECH|SOFT|INFO|CONSULT|DIGITAL|TCS|INFY|WIPRO)/.test(normalized)) return "IT Services";
  if (/(TELECOM|AIRTEL|JIO|VODA)/.test(normalized)) return "Telecom";
  if (/(OIL|GAS|POWER|ENERGY|PETRO)/.test(normalized)) return "Energy";
  if (/(FMCG|CONSUMER|UNILEVER|FOOD|BEVERAGE)/.test(normalized)) return "FMCG";
  if (/(PHARMA|BIO|HEALTH|HOSPITAL)/.test(normalized)) return "Pharma";
  if (/(CEMENT|BUILD|INFRA|MATERIAL)/.test(normalized)) return "Materials";
  return "Diversified";
}

function buildFallbackCompanyProfile(query: string): CompanyProfile {
  const raw = query.trim();
  const normalized = raw.toUpperCase();
  const hasExchangeSuffix = /\.(BSE|NSE)$/.test(normalized);
  const exchange = normalized.endsWith(".NSE") ? "NSE" : "BSE";
  const baseName = raw.replace(/\.(BSE|NSE)$/i, "").trim();
  const compactSymbol = baseName.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return {
    symbol: hasExchangeSuffix ? normalized : `${compactSymbol || "UNKNOWN"}.${exchange}`,
    name: titleCase(baseName || normalized),
    exchange,
    sector: inferSector(baseName || normalized),
  };
}

function getCompany(query: string): CompanyProfile {
  return resolveCompanyQuery(query) ?? buildFallbackCompanyProfile(query);
}

function getRelationPeerSymbol(symbol: string, relation: CompanyRelation) {
  return relation.targetSymbol === symbol ? relation.sourceSymbol : relation.targetSymbol;
}

function tokensForCompany(company: CompanyProfile) {
  return new Set(normalizeToken(`${company.name} ${company.symbol}`).split(" ").filter(Boolean));
}

function inferRelationType(company: CompanyProfile, peer: CompanyProfile): CompanyRelationType {
  if (company.sector === peer.sector) return "competitor";
  if (company.sector === "Metals" && peer.sector === "Automotive") return "supplier";
  if (company.sector === "Automotive" && peer.sector === "Metals") return "manufacturer";
  return "partner";
}

function buildRelationRationale(company: CompanyProfile, peer: CompanyProfile, relationType: CompanyRelationType) {
  if (relationType === "competitor") {
    return `${company.name} and ${peer.name} operate in the ${company.sector.toLowerCase()} space and may react to similar market catalysts.`;
  }
  if (relationType === "supplier") {
    return `${company.name} is linked to ${peer.name} through materials and manufacturing demand.`;
  }
  if (relationType === "manufacturer") {
    return `${company.name} depends on industrial inputs that can be influenced by ${peer.name}.`;
  }
  return `${company.name} and ${peer.name} share brand, sector, or market exposure that can create spillover moves.`;
}

function buildHeuristicRelations(company: CompanyProfile): CompanyRelation[] {
  const companyTokens = tokensForCompany(company);
  const primaryToken = normalizeToken(company.name).split(" ")[0] ?? "";

  return WATCHLIST
    .filter((candidate) => candidate.symbol !== company.symbol)
    .map((candidate) => {
      const candidateTokens = tokensForCompany(candidate);
      const overlap = [...companyTokens].filter((token) => candidateTokens.has(token)).length;
      const sameSector = company.sector === candidate.sector;
      const sameBrandFamily = primaryToken && normalizeToken(candidate.name).startsWith(primaryToken);
      const linkedSupplyChain =
        (company.sector === "Metals" && candidate.sector === "Automotive") ||
        (company.sector === "Automotive" && candidate.sector === "Metals");

      let score = overlap * 2;
      if (sameSector) score += 5;
      if (sameBrandFamily) score += 4;
      if (linkedSupplyChain) score += 3;

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ candidate, score }) => {
      const relation = inferRelationType(company, candidate);
      const strength = Math.min(0.92, Number((0.46 + score * 0.06).toFixed(2)));

      return {
        sourceSymbol: company.symbol,
        targetSymbol: candidate.symbol,
        relation,
        rationale: buildRelationRationale(company, candidate, relation),
        strength,
      };
    });
}

function buildGeminiRelations(company: CompanyProfile, suggestions: RelationSuggestion[]): CompanyRelation[] {
  const seenPeers = new Set<string>();

  return suggestions
    .map((suggestion) => {
      const peer = getCompany(suggestion.target);
      if (peer.symbol === company.symbol) return null;
      if (seenPeers.has(peer.symbol)) return null;
      seenPeers.add(peer.symbol);

      return {
        sourceSymbol: company.symbol,
        targetSymbol: peer.symbol,
        relation: suggestion.relation,
        rationale: suggestion.rationale,
        strength: suggestion.strength,
      } satisfies CompanyRelation;
    })
    .filter((relation): relation is CompanyRelation => relation !== null);
}

function getRelations(company: CompanyProfile, suggestions: RelationSuggestion[]): CompanyRelation[] {
  const staticRelations = RELATIONS.filter(
    (relation) => relation.sourceSymbol === company.symbol || relation.targetSymbol === company.symbol,
  );

  const staticPeers = new Set(staticRelations.map((relation) => getRelationPeerSymbol(company.symbol, relation)));
  const geminiRelations = buildGeminiRelations(company, suggestions).filter(
    (relation) => !staticPeers.has(getRelationPeerSymbol(company.symbol, relation)),
  );
  const geminiPeers = new Set(geminiRelations.map((relation) => getRelationPeerSymbol(company.symbol, relation)));
  const heuristicRelations = buildHeuristicRelations(company).filter(
    (relation) => !staticPeers.has(getRelationPeerSymbol(company.symbol, relation)) && !geminiPeers.has(getRelationPeerSymbol(company.symbol, relation)),
  );

  return [...staticRelations, ...geminiRelations, ...heuristicRelations].slice(0, 5);
}

function getRelatedCompanies(company: CompanyProfile, relations: CompanyRelation[]): CompanyProfile[] {
  const connected = new Set<string>();
  for (const relation of relations) {
    connected.add(getRelationPeerSymbol(company.symbol, relation));
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
  const drivers = items
    .slice(0, 3)
    .map((item) => `${item.financialEvent} from ${item.source} (${item.sentiment}, ${item.impact} impact)`);

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
  const [processedItems, stock] = await Promise.all([
    fetchSignalsForCompany(company),
    fetchStockSnapshot(company.symbol, company.name),
  ]);

  const relationSuggestions = await inferRelatedCompaniesFromSignals(company, processedItems);
  const relations = getRelations(company, relationSuggestions);
  const relatedCompanies = getRelatedCompanies(company, relations);

  const [relatedStocks, relatedSignals] = await Promise.all([
    Promise.all(relatedCompanies.slice(0, 4).map((item) => fetchStockSnapshot(item.symbol, item.name))),
    Promise.all(relatedCompanies.slice(0, 4).map(fetchSignalsForCompany)),
  ]);

  const sentiment = buildSentimentSnapshot(company.symbol, processedItems);
  const dominantDrivers = [...new Set(processedItems.slice(0, 5).map((item) => item.financialEvent))];
  const prediction = await buildPrediction(company, sentiment, dominantDrivers, stock);
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

  await Promise.allSettled([persistSignalItems(processedItems), persistSnapshot(primary)]).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Optional persistence failed:", result.reason);
      }
    });
  });

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
      { id: "prediction", label: "Prediction", value: `${prediction.direction} | ${prediction.priceChange >= 0 ? "+" : "-"}INR ${Math.abs(prediction.priceChange).toFixed(2)}` },
      { id: "relations", label: "Related Companies", value: `${relatedCompanies.length} links` },
    ],
  };
}

export async function buildTrendingSnapshot() {
  const companies = WATCHLIST.slice(0, 6);
  const signals = (await Promise.all(companies.map(fetchSignalsForCompany))).flat();
  return buildTrending(signals);
}
