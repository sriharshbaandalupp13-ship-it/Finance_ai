import type { CompanyProfile, CompanyRelation } from "@/data/contracts";

export const WATCHLIST: CompanyProfile[] = [
  { symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "AAPL", name: "Apple", exchange: "NASDAQ", sector: "Consumer Technology" },
  { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ", sector: "Software" },
  { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", sector: "Automotive" },
  { symbol: "AMD", name: "AMD", exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "AMZN", name: "Amazon", exchange: "NASDAQ", sector: "Cloud" },
  { symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ", sector: "Internet" },
  { symbol: "META", name: "Meta", exchange: "NASDAQ", sector: "Internet" },
  { symbol: "TSM", name: "Taiwan Semiconductor", exchange: "NYSE", sector: "Semiconductors" },
  { symbol: "SMCI", name: "Super Micro Computer", exchange: "NASDAQ", sector: "Servers" }
];

export const RELATIONS: CompanyRelation[] = [
  { sourceSymbol: "NVDA", targetSymbol: "TSM", relation: "manufacturer", rationale: "TSMC manufactures Nvidia chips.", strength: 0.97 },
  { sourceSymbol: "NVDA", targetSymbol: "SMCI", relation: "partner", rationale: "Supermicro packages Nvidia AI infrastructure.", strength: 0.81 },
  { sourceSymbol: "NVDA", targetSymbol: "AMD", relation: "competitor", rationale: "Both compete in AI accelerators and data center GPUs.", strength: 0.78 },
  { sourceSymbol: "NVDA", targetSymbol: "MSFT", relation: "customer", rationale: "Microsoft consumes Nvidia compute for Azure AI capacity.", strength: 0.7 },
  { sourceSymbol: "AAPL", targetSymbol: "TSM", relation: "manufacturer", rationale: "TSMC fabricates Apple silicon.", strength: 0.95 },
  { sourceSymbol: "AAPL", targetSymbol: "GOOGL", relation: "competitor", rationale: "Competes across mobile ecosystems and AI surfaces.", strength: 0.66 },
  { sourceSymbol: "MSFT", targetSymbol: "AMZN", relation: "competitor", rationale: "AWS and Azure compete for cloud and AI workloads.", strength: 0.84 },
  { sourceSymbol: "MSFT", targetSymbol: "NVDA", relation: "supplier", rationale: "Microsoft relies on Nvidia for AI hardware supply.", strength: 0.85 },
  { sourceSymbol: "TSLA", targetSymbol: "NVDA", relation: "supplier", rationale: "Compute infrastructure influences autonomy training velocity.", strength: 0.54 },
  { sourceSymbol: "TSLA", targetSymbol: "AAPL", relation: "competitor", rationale: "Both fight for consumer attention, talent, and AI-device narrative share.", strength: 0.29 },
  { sourceSymbol: "META", targetSymbol: "MSFT", relation: "competitor", rationale: "Both invest in AI platforms and enterprise productivity tools.", strength: 0.48 },
  { sourceSymbol: "AMD", targetSymbol: "TSM", relation: "manufacturer", rationale: "TSMC manufactures AMD processors and accelerators.", strength: 0.91 }
];
