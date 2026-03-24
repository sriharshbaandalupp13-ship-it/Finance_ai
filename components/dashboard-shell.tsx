"use client";

import { useEffect, useState } from "react";
import type {
  CompanyConnection,
  CompanyResponse,
  NewsItem,
  SourceHealth,
  StockQuote,
} from "@/lib/types";

const demoSymbols = ["NVDA", "AAPL", "MSFT", "TSLA"];

const emptyState: CompanyResponse = {
  company: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: null,
    change: null,
    changePercent: null,
    currency: "USD",
  },
  related: [],
  connections: [],
  news: [],
  sourceHealth: [],
  insight: {
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    headlineScore: 50,
    signal: "neutral",
    summary: "Connect your APIs to turn the graph and signal engine fully live.",
    risks: [],
    opportunities: [],
  },
  generatedAt: new Date().toISOString(),
};

function formatCurrency(value: number | null, currency: string) {
  if (value === null) {
    return "Waiting for API";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "No move";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toneClass(value: string) {
  if (value === "bullish") {
    return "positive";
  }

  if (value === "bearish") {
    return "negative";
  }

  return "neutral";
}

function CompanyGraph({
  company,
  connections,
}: {
  company: StockQuote;
  connections: CompanyConnection[];
}) {
  const nodes = [
    { id: company.symbol, name: company.name, relation: "focus", x: 50, y: 50 },
    ...connections.slice(0, 4).map((item, index) => {
      const positions = [
        { x: 18, y: 22 },
        { x: 82, y: 26 },
        { x: 24, y: 80 },
        { x: 78, y: 78 },
      ];

      return {
        id: item.symbol,
        name: item.name,
        relation: item.relation,
        rationale: item.rationale,
        intensity: item.intensity,
        x: positions[index].x,
        y: positions[index].y,
      };
    }),
  ];

  return (
    <div className="graph-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Relationship workflow</p>
          <h3>Connected company map</h3>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="graph">
        {nodes.slice(1).map((node) => (
          <line
            key={`line-${node.id}`}
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke="rgba(126,200,255,0.34)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        ))}
        {nodes.map((node, index) => (
          <g key={node.id} className="graph-group" style={{ animationDelay: `${index * 0.12}s` }}>
            <circle
              cx={node.x}
              cy={node.y}
              r={index === 0 ? 11 : 8}
              className={index === 0 ? "graph-node graph-node-focus" : "graph-node"}
            />
            <text x={node.x} y={node.y + (index === 0 ? 1.4 : 1)} textAnchor="middle" className="graph-symbol">
              {node.id}
            </text>
          </g>
        ))}
      </svg>
      <div className="graph-legend">
        {connections.map((item) => (
          <div key={item.symbol} className="legend-item">
            <span>{item.symbol}</span>
            <small>
              {item.relation} • {item.rationale}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteCard({ stock }: { stock: StockQuote }) {
  const direction = stock.changePercent !== null && stock.changePercent >= 0 ? "up" : "down";

  return (
    <article className="quote-card">
      <div className="quote-top">
        <div>
          <strong>{stock.symbol}</strong>
          <p>{stock.name}</p>
        </div>
        <span className={`trend ${direction}`}>{formatPercent(stock.changePercent)}</span>
      </div>
      <h4>{formatCurrency(stock.price, stock.currency)}</h4>
    </article>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="news-card">
      <div className="news-meta">
        <span>{item.source}</span>
        <span className={`signal-badge ${toneClass(item.sentiment)}`}>{item.kind}</span>
      </div>
      <h4>{item.title}</h4>
      <p>{item.summary}</p>
    </a>
  );
}

function SourceTile({ source }: { source: SourceHealth }) {
  return (
    <div className="source-tile">
      <div className="source-top">
        <strong>{source.label}</strong>
        <span className={`status-dot ${source.status}`}>{source.status}</span>
      </div>
      <p>{source.detail}</p>
    </div>
  );
}

export function DashboardShell() {
  const [symbol, setSymbol] = useState("NVDA");
  const [query, setQuery] = useState("NVDA");
  const [data, setData] = useState<CompanyResponse>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCompany() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/company/${symbol}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load company data.");
        }

        const payload = (await response.json()) as CompanyResponse;
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCompany();
    return () => controller.abort();
  }, [symbol]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">AI-powered market intelligence</p>
          <h1>Finance Signal Studio</h1>
          <p className="hero-text">
            Track one company, expand into its suppliers, customers, infrastructure partners,
            and competitors, then blend quote changes with multi-source news into an investor
            workflow you can deploy to GitHub and Vercel.
          </p>
        </div>
        <form
          className="search-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setSymbol(query.toUpperCase());
          }}
        >
          <label htmlFor="symbol-search">Company symbol</label>
          <div className="search-row">
            <input
              id="symbol-search"
              value={query}
              onChange={(event) => setQuery(event.target.value.toUpperCase())}
              placeholder="Enter a ticker like NVDA"
            />
            <button type="submit">Run signal</button>
          </div>
          <div className="chip-row">
            {demoSymbols.map((demo) => (
              <button
                type="button"
                key={demo}
                className={`chip ${symbol === demo ? "chip-active" : ""}`}
                onClick={() => {
                  setQuery(demo);
                  setSymbol(demo);
                }}
              >
                {demo}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="overview-grid">
        <article className="focus-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Primary company</p>
              <h2>
                {data.company.symbol} <span>{data.company.name}</span>
              </h2>
            </div>
            <span className={`signal-badge ${toneClass(data.insight.signal)}`}>
              {data.insight.signal}
            </span>
          </div>
          <div className="focus-metrics">
            <div>
              <small>Last price</small>
              <strong>{formatCurrency(data.company.price, data.company.currency)}</strong>
            </div>
            <div>
              <small>Day move</small>
              <strong>{formatPercent(data.company.changePercent)}</strong>
            </div>
            <div>
              <small>Headline score</small>
              <strong>{data.insight.headlineScore}/100</strong>
            </div>
          </div>
          <p className="focus-summary">{data.insight.summary}</p>
          {loading && <p className="helper">Refreshing live company intelligence...</p>}
          {error && <p className="error-text">{error}</p>}
        </article>

        <CompanyGraph company={data.company} connections={data.connections} />
      </section>

      <section className="stack-grid">
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Connected equities</p>
              <h3>Stocks linked to this company</h3>
            </div>
          </div>
          <div className="quote-grid">
            {data.related.length ? (
              data.related.map((stock) => <QuoteCard key={stock.symbol} stock={stock} />)
            ) : (
              <p className="helper">
                No relationship graph exists for this symbol yet. Add more mappings in
                `lib/mock/relationships.ts`.
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Connector health</p>
              <h3>What is feeding the dashboard</h3>
            </div>
          </div>
          <div className="source-grid">
            {data.sourceHealth.map((source) => (
              <SourceTile key={source.label} source={source} />
            ))}
          </div>
        </div>
      </section>

      <section className="news-section panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Signal feed</p>
            <h3>News and social pulse</h3>
          </div>
        </div>
        <div className="news-grid">
          {data.news.length ? (
            data.news.map((item) => <NewsCard key={item.id} item={item} />)
          ) : (
            <p className="helper">
              No live stories yet. Add API keys in `.env.local` and the feed will populate.
            </p>
          )}
        </div>
      </section>

      <section className="panel insight-panel">
        <div>
          <p className="eyebrow">AI insight blocks</p>
          <h3>Decision support</h3>
        </div>
        <div className="insight-columns">
          <div>
            <h4>Risks</h4>
            <ul>
              {data.insight.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Opportunities</h4>
            <ul>
              {data.insight.opportunities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

