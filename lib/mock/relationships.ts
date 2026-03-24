import type { CompanyConnection } from "@/lib/types";

const graph: Record<string, CompanyConnection[]> = {
  NVDA: [
    {
      symbol: "TSM",
      name: "Taiwan Semiconductor",
      relation: "manufacturer",
      rationale: "Fabricates advanced Nvidia chips.",
      intensity: 0.96,
    },
    {
      symbol: "ASML",
      name: "ASML Holding",
      relation: "equipment supplier",
      rationale: "Supplies EUV tools used across the leading-edge chip chain.",
      intensity: 0.8,
    },
    {
      symbol: "SMCI",
      name: "Super Micro Computer",
      relation: "infrastructure partner",
      rationale: "Builds AI server systems around Nvidia GPUs.",
      intensity: 0.78,
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      relation: "major customer",
      rationale: "Consumes GPUs heavily for Azure AI workloads.",
      intensity: 0.74,
    },
  ],
  AAPL: [
    {
      symbol: "TSM",
      name: "Taiwan Semiconductor",
      relation: "manufacturer",
      rationale: "Produces Apple silicon at advanced nodes.",
      intensity: 0.95,
    },
    {
      symbol: "QCOM",
      name: "Qualcomm",
      relation: "component supplier",
      rationale: "Provides modem technology and remains a strategic chip peer.",
      intensity: 0.62,
    },
    {
      symbol: "HON",
      name: "Honeywell",
      relation: "industrial customer",
      rationale: "Enterprise devices and automation ecosystems intersect with Apple deployments.",
      intensity: 0.33,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet",
      relation: "platform competitor",
      rationale: "Competes across mobile, AI, and consumer ecosystem attention.",
      intensity: 0.68,
    },
  ],
  TSLA: [
    {
      symbol: "NVDA",
      name: "Nvidia",
      relation: "AI compute supplier",
      rationale: "Autonomy and training workflows depend on high-end compute infrastructure.",
      intensity: 0.66,
    },
    {
      symbol: "PANW",
      name: "Palo Alto Networks",
      relation: "cybersecurity adjacency",
      rationale: "Connected fleets and factories increase security exposure.",
      intensity: 0.31,
    },
    {
      symbol: "ALB",
      name: "Albemarle",
      relation: "battery materials",
      rationale: "Lithium supplier exposure influences EV economics.",
      intensity: 0.72,
    },
    {
      symbol: "F",
      name: "Ford",
      relation: "industry peer",
      rationale: "Tracks investor sentiment across EV and auto manufacturing.",
      intensity: 0.6,
    },
  ],
  MSFT: [
    {
      symbol: "NVDA",
      name: "Nvidia",
      relation: "AI infrastructure supplier",
      rationale: "Cloud AI growth depends on GPU availability and pricing.",
      intensity: 0.88,
    },
    {
      symbol: "AMD",
      name: "AMD",
      relation: "alternative compute supplier",
      rationale: "Provides a diversification path for cloud accelerators.",
      intensity: 0.53,
    },
    {
      symbol: "CRM",
      name: "Salesforce",
      relation: "enterprise software peer",
      rationale: "Shared exposure to enterprise IT spending and AI workflow budgets.",
      intensity: 0.47,
    },
    {
      symbol: "AMZN",
      name: "Amazon",
      relation: "cloud competitor",
      rationale: "Competes directly for infrastructure and AI platform demand.",
      intensity: 0.76,
    },
  ],
};

export function getConnections(symbol: string): CompanyConnection[] {
  return graph[symbol.toUpperCase()] ?? [];
}
