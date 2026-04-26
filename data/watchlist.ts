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
  { symbol: "ADANIPORTS.BSE", name: "Adani Ports and Special Economic Zone", exchange: "BSE", sector: "Infrastructure" },
  { symbol: "ADANIGREEN.BSE", name: "Adani Green Energy", exchange: "BSE", sector: "Power" },
  { symbol: "ADANIPOWER.BSE", name: "Adani Power", exchange: "BSE", sector: "Power" },
  { symbol: "ADANIENSOL.BSE", name: "Adani Energy Solutions", exchange: "BSE", sector: "Power" },
  { symbol: "ATGL.BSE", name: "Adani Total Gas", exchange: "BSE", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "AWL.BSE", name: "Adani Wilmar", exchange: "BSE", sector: "FMCG" },
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
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "ADANIPORTS.BSE", relation: "partner", rationale: "Adani Enterprises and Adani Ports share group-level infrastructure and logistics exposure.", strength: 0.82 },
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "ADANIGREEN.BSE", relation: "partner", rationale: "Adani Enterprises has group exposure to renewable energy development through Adani Green.", strength: 0.76 },
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "ADANIPOWER.BSE", relation: "partner", rationale: "Adani Enterprises and Adani Power are linked through energy, coal, and infrastructure cycles.", strength: 0.77 },
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "ADANIENSOL.BSE", relation: "partner", rationale: "Adani Energy Solutions connects the group through transmission, distribution, and power infrastructure.", strength: 0.74 },
  { sourceSymbol: "ADANIGREEN.BSE", targetSymbol: "ADANIENSOL.BSE", relation: "partner", rationale: "Renewable generation and transmission assets can react to similar power-sector catalysts.", strength: 0.79 },
  { sourceSymbol: "ADANIPOWER.BSE", targetSymbol: "ADANIENSOL.BSE", relation: "partner", rationale: "Power generation and transmission businesses are exposed to related electricity demand and policy changes.", strength: 0.78 },
  { sourceSymbol: "ADANIPOWER.BSE", targetSymbol: "ADANIGREEN.BSE", relation: "competitor", rationale: "Both operate in power generation, with different thermal and renewable mixes.", strength: 0.66 },
  { sourceSymbol: "ADANIPORTS.BSE", targetSymbol: "RELIANCE.BSE", relation: "partner", rationale: "Large-scale energy and retail supply chains can depend on port and logistics capacity.", strength: 0.58 },
  { sourceSymbol: "ATGL.BSE", targetSymbol: "ADANIENSOL.BSE", relation: "partner", rationale: "Gas distribution and energy infrastructure share regulatory and urban utility exposure.", strength: 0.62 },
  { sourceSymbol: "AWL.BSE", targetSymbol: "HINDUNILVR.BSE", relation: "competitor", rationale: "Both have consumer staples and packaged-food exposure.", strength: 0.64 },
  { sourceSymbol: "BHARTIARTL.BSE", targetSymbol: "SBIN.BSE", relation: "partner", rationale: "SBI provides major financing for Airtel expansion.", strength: 0.60 },
  { sourceSymbol: "ICICIBANK.BSE", targetSymbol: "SBIN.BSE", relation: "competitor", rationale: "Compete across retail banking, loans and deposits.", strength: 0.83 },
];

function normalizeLookupValue(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const COMPANY_ALIASES: Record<string, string> = {
  ADANI: "ADANIENT.BSE",
  ADANIENT: "ADANIENT.BSE",
  ADANIENTERPRISES: "ADANIENT.BSE",
  RELIANCE: "RELIANCE.BSE",
  HDFC: "HDFCBANK.BSE",
  HDFCBANK: "HDFCBANK.BSE",
  INFOSYS: "INFY.BSE",
  ICICI: "ICICIBANK.BSE",
  ICICIBANK: "ICICIBANK.BSE",
  SBI: "SBIN.BSE",
  STATEBANK: "SBIN.BSE",
  AIRTEL: "BHARTIARTL.BSE",
  BHARTI: "BHARTIARTL.BSE",
  ADANIPORT: "ADANIPORTS.BSE",
  ADANIPORTS: "ADANIPORTS.BSE",
  APSEZ: "ADANIPORTS.BSE",
  ADANIGREEN: "ADANIGREEN.BSE",
  ADANIPOWER: "ADANIPOWER.BSE",
  ADANIENERGY: "ADANIENSOL.BSE",
  ADANIENERGYSOLUTIONS: "ADANIENSOL.BSE",
  ADANITRANSMISSION: "ADANIENSOL.BSE",
  ADANITOTAL: "ATGL.BSE",
  ADANITOTALGAS: "ATGL.BSE",
  ADANIWILMAR: "AWL.BSE",
  TATAMOTORS: "TATAMOTORS.BSE",
  TATAMOTOR: "TATAMOTORS.BSE",
  TATASTEEL: "TATASTEEL.BSE",
};

function scoreCompanyMatch(company: CompanyProfile, normalized: string) {
  const normalizedSymbol = normalizeLookupValue(company.symbol);
  const normalizedName = normalizeLookupValue(company.name);
  const symbolWithoutSuffix = normalizedSymbol.replace(/(BSE|NSE)$/g, "");

  if (normalized === normalizedSymbol) return 120;
  if (normalized === normalizedName) return 115;
  if (normalized === symbolWithoutSuffix) return 110;
  if (normalizedSymbol.startsWith(normalized)) return 92;
  if (normalizedName.startsWith(normalized)) return 88;
  if (symbolWithoutSuffix.startsWith(normalized)) return 84;
  if (normalizedName.includes(normalized)) return 64;
  if (normalizedSymbol.includes(normalized)) return 58;
  return 0;
}

type RankedCompanyMatch = {
  company: CompanyProfile;
  score: number;
};

function rankCompanyMatches(query: string): RankedCompanyMatch[] {
  const normalized = normalizeLookupValue(query);
  if (!normalized) return [];

  return WATCHLIST
    .map((company) => ({ company, score: scoreCompanyMatch(company, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.company.name.localeCompare(right.company.name));
}

export function searchCompanies(query: string, limit = 5): CompanyProfile[] {
  const normalized = normalizeLookupValue(query);
  if (!normalized) return [];

  const aliasSymbol = COMPANY_ALIASES[normalized];
  const aliasMatch = aliasSymbol
    ? WATCHLIST.find((company) => company.symbol === aliasSymbol) ?? null
    : null;

  const rankedMatches = rankCompanyMatches(query).map((entry) => entry.company);

  const merged = aliasMatch ? [aliasMatch, ...rankedMatches.filter((company) => company.symbol !== aliasMatch.symbol)] : rankedMatches;
  return merged.slice(0, limit);
}

export function resolveCompanyQuery(query: string): CompanyProfile | null {
  const normalized = normalizeLookupValue(query);
  if (!normalized) return null;

  const aliasSymbol = COMPANY_ALIASES[normalized];
  if (aliasSymbol) {
    return WATCHLIST.find((company) => company.symbol === aliasSymbol) ?? null;
  }

  const [best, second] = rankCompanyMatches(query);
  if (!best) return null;

  if (best.score >= 110) return best.company;
  if (normalized.length <= 2) return null;

  const hasClearLead = !second || best.score - second.score >= 10;
  const isStrongPrefixMatch = best.score >= 88;
  const isVeryStrongSingleMatch = best.score >= 92;

  if (isVeryStrongSingleMatch || (isStrongPrefixMatch && hasClearLead)) {
    return best.company;
  }

  return null;
}
