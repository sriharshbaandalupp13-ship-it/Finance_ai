export type SourceKind = "rss" | "news_api" | "reddit" | "analysis";

export type SentimentLabel = "positive" | "neutral" | "negative";
export type ImpactLevel = "low" | "medium" | "high";
export type PredictionDirection = "UP" | "DOWN" | "NEUTRAL";
export type CompanyRelationType = "competitor" | "supplier" | "partner" | "customer" | "manufacturer";

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
}

export interface RawSourceItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  body: string;
  sourceKind: SourceKind;
  companyTags: string[];
}

export interface ProcessedSignalItem extends RawSourceItem {
  summary: string;
  sentiment: SentimentLabel;
  financialEvent: string;
  impact: ImpactLevel;
  explanation: string;
  confidence: number;
}

export interface CompanyRelation {
  sourceSymbol: string;
  targetSymbol: string;
  relation: CompanyRelationType;
  rationale: string;
  strength: number;
}

export interface StockPoint {
  date: string;
  close: number;
  volume: number;
}

export interface StockSnapshot {
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  sma5: number | null;
  momentum: number | null;
  history: StockPoint[];
}

export interface SentimentSnapshot {
  symbol: string;
  score: number;
  trend: number;
  mentionVolume: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  highImpactCount: number;
  updatedAt: string;
}

export interface PredictionSnapshot {
  symbol: string;
  direction: PredictionDirection;
  confidence: number;
  explanation: string;
  /** Estimated price change in rupees for tomorrow (positive = UP, negative = DOWN) */
  priceChange: number;
  /** Estimated absolute price for tomorrow */
  priceTarget: number;
}

export interface AlertItem {
  id: string;
  symbol: string;
  title: string;
  detail: string;
  severity: ImpactLevel;
  createdAt: string;
}

export interface TrendingCompany {
  symbol: string;
  name: string;
  buzzScore: number;
  mentionVolume: number;
  sentiment: SentimentLabel;
}

export interface CompanyIntelligence {
  company: CompanyProfile;
  processedItems: ProcessedSignalItem[];
  stock: StockSnapshot;
  sentiment: SentimentSnapshot;
  prediction: PredictionSnapshot;
  relations: CompanyRelation[];
  relatedCompanies: CompanyProfile[];
  relatedStocks: StockSnapshot[];
  alerts: AlertItem[];
  whyMoving: string;
  generatedAt: string;
}

export interface IntelligenceResponse {
  symbol: string;
  requestedAt: string;
  primary: CompanyIntelligence;
  comparison: StockSnapshot[];
  trending: TrendingCompany[];
  workflow: Array<{ id: string; label: string; value: string }>;
}
