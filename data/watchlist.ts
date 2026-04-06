import type { CompanyProfile, CompanyRelation } from "@/data/contracts";

export const WATCHLIST: CompanyProfile[] = [
  { symbol: "RELIANCE.BSE", name: "Reliance Industries", exchange: "BSE", sector: "Conglomerate" },
  { symbol: "TCS.BSE", name: "Tata Consultancy Services", exchange: "BSE", sector: "IT Services" },
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
  { sourceSymbol: "HDFCBANK.BSE", targetSymbol: "ICICIBANK.BSE", relation: "competitor", rationale: "Top two private sector banks competing for retail and corporate banking.", strength: 0.85 },
  { sourceSymbol: "HDFCBANK.BSE", targetSymbol: "SBIN.BSE", relation: "competitor", rationale: "Private vs public sector banking competition.", strength: 0.78 },
  { sourceSymbol: "INFY.BSE", targetSymbol: "WIPRO.BSE", relation: "competitor", rationale: "Both compete in IT services and digital transformation.", strength: 0.80 },
  { sourceSymbol: "ADANIENT.BSE", targetSymbol: "RELIANCE.BSE", relation: "competitor", rationale: "Compete in energy, infrastructure and retail sectors.", strength: 0.72 },
  { sourceSymbol: "BHARTIARTL.BSE", targetSymbol: "SBIN.BSE", relation: "partner", rationale: "SBI provides major financing for Airtel expansion.", strength: 0.60 },
  { sourceSymbol: "ICICIBANK.BSE", targetSymbol: "SBIN.BSE", relation: "competitor", rationale: "Compete across retail banking, loans and deposits.", strength: 0.83 },
];
