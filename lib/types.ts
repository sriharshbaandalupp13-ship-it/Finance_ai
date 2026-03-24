export type SourceKind = "news" | "x" | "instagram" | "facebook" | "analysis";

export type SentimentLabel = "bullish" | "neutral" | "bearish";

export interface StockQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  exchange?: string;
}

export interface CompanyConnection {
  symbol: string;
  name: string;
  relation: string;
  rationale: string;
  intensity: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: SentimentLabel;
  kind: SourceKind;
}

export interface SourceHealth {
  key: SourceKind;
  label: string;
  status: "live" | "optional" | "unavailable";
  detail: string;
}

export interface CompanyInsight {
  symbol: string;
  companyName: string;
  headlineScore: number;
  signal: SentimentLabel;
  summary: string;
  risks: string[];
  opportunities: string[];
}

export interface CompanyResponse {
  company: StockQuote;
  related: StockQuote[];
  connections: CompanyConnection[];
  news: NewsItem[];
  sourceHealth: SourceHealth[];
  insight: CompanyInsight;
  generatedAt: string;
}
