import type { CompanyProfile, CompanyRelation } from "@/data/contracts";

export const WATCHLIST: CompanyProfile[] = [
  { symbol: "RELIANCE.BSE", name: "Reliance Industries", exchange: "BSE", sector: "Conglomerate" },
  { symbol: "TCS.BSE", name: "Tata Consultancy Services", exchange: "BSE", sector: "IT Services" },
  { symbol: "TATAMOTORS.BSE", name: "Tata Motors", exchange: "BSE", sector: "Automotive" },
  { symbol: "TATASTEEL.BSE", name: "Tata Steel", exchange: "BSE", sector: "Metals" },
  { symbol: "HDFCBANK.BSE", name: "HDFC Bank", exchange: "BSE", sector: "Banking" },
  { symbol: "INFY.BSE", name: "Infosys", exchange: "BSE", sector: "IT Services" },
  { symbol: "ICICIBANK.BSE", name: "ICICI Bank", exchange: "BSE", sector: "Banking" },
  { symbol: "HINDUNILVR.BSE", name: "Hindustan Unilever", exchange: "BSE", sector: "FMCG" },
  { symbol: "SBIN.BSE", name: "State Bank of India", exchange: "BSE", sector: "Banking" },
  { symbol: "BHARTIARTL.BSE", name: "Bharti Airtel", exchange: "BSE", sector: "Telecom" },
  { symbol: "WIPRO.BSE", name: "Wipro", exchange: "BSE", sector: "IT Services" },
  { symbol: "ADANIENT.BSE", name: "Adani Enterprises", exchange: "BSE", sector: "Conglomerate" },
];

export const RELATIONS: CompanyRelation[] = [
  { sourceSymbol: "RELIANCE.BSE", targetSymbol: "HDFCBANK.BSE", relation: "partner", rationale: "Major banking partner for Reliance retail and Jio operations.", strength: 0.75 },
  { sourceSymbol: "RELIANCE.BSE", targetSymbol: "BHARTIARTL.BSE", relation: "competitor", rationale: "Jio and Airtel compete directly in telecom sector.", strength: 0.90 },
  { sourceSymbol: "TCS.BSE", targetSymbol: "INFY.BSE", relation: "competitor", rationale: "Both are top Indian IT services exporters competing for global contracts.", strength: 0.88 },
  { sourceSymbol: "TCS.BSE", targetSymbol: "WIPRO.BSE", relation: "competitor", rationale: "Compete across enterprise IT, cloud, and outsourcing.", strength: 0.82 },
  { sourceSymbol: "TATASTEEL.BSE", targetSymbol: "TATAMOTORS.BSE", relation: "supplier", rationale: "Tata Steel supplies steel products used across Tata Motors manufacturing operations.", strength: 0.79 },
  { sourceSymbol: "HDFCBANK.BSE", targetSymbol: "ICICIBANK.BSE", relation: "competitor", rationale: "Top two private sector banks competing for retail and corporate banking.", strength: 0.85 },
  { sourceSymbol: "HDFCBANK.BSE", targetSymbol: "SBIN.BSE", relation: "competitor", rationale: "Private vs public sector banking competition.", strength: 0.78 },
  { sourceSymbol: "INFY.BSE", targetSymbol: "WIPRO.BSE", relation: "competitor", rationale: "Both compete in IT services and digital transformation.", strength: 0.80 },
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "RELIANCE.BSE", relation: "competitor", rationale: "Compete in energy, infrastructure and retail sectors.", strength: 0.72 },
  { sourceSymbol: "BHARTIARTL.BSE", targetSymbol: "SBIN.BSE", relation: "partner", rationale: "SBI provides major financing for Airtel expansion.", strength: 0.60 },
  { sourceSymbol: "ICICIBANK.BSE", targetSymbol: "SBIN.BSE", relation: "competitor", rationale: "Compete across retail banking, loans and deposits.", strength: 0.83 },
];

function normalizeLookupValue(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const COMPANY_ALIASES: Record<string, string> = {
  TATAMOTORS: "TATAMOTORS.BSE",
  TATAMOTOR: "TATAMOTORS.BSE",
  TATASTEEL: "TATASTEEL.BSE",
};

export function resolveCompanyQuery(query: string): CompanyProfile | null {
  const normalized = normalizeLookupValue(query);
  if (!normalized) return null;

  const aliasSymbol = COMPANY_ALIASES[normalized];
  if (aliasSymbol) {
    return WATCHLIST.find((company) => company.symbol === aliasSymbol) ?? null;
  }

  return WATCHLIST.find((company) => {
    const normalizedSymbol = normalizeLookupValue(company.symbol);
    const normalizedName = normalizeLookupValue(company.name);
    const symbolWithoutSuffix = normalizedSymbol.replace(/(BSE|NSE)$/g, "");

    return (
      normalized === normalizedSymbol ||
      normalized === normalizedName ||
      normalized === symbolWithoutSuffix ||
      normalizedName.includes(normalized)
    );
  }) ?? null;
}
