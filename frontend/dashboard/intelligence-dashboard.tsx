"use client";

import { useEffect, useMemo, useState } from "react";
import type { IntelligenceResponse } from "@/data/contracts";
import { InsightPanels } from "@/components/insight-panels";
import { StockChartCard } from "@/components/stock-chart-card";
import { WorkflowCanvas } from "@/frontend/workflow/workflow-canvas";
import { formatCompactNumber, formatCurrency, formatPercent } from "@/utils/format";

const PRESETS = ["RELIANCE.BSE", "TCS.BSE", "HDFCBANK.BSE", "INFY.BSE", "ICICIBANK.BSE"];

const PRESET_LABELS: Record<string, string> = {
  "RELIANCE.BSE": "RELIANCE",
  "TCS.BSE": "TCS",
  "HDFCBANK.BSE": "HDFC",
  "INFY.BSE": "INFY",
  "ICICIBANK.BSE": "ICICI",
};

function getPredictionLabel(direction: string, confidence: number) {
  const pct = Math.round(confidence * 100);
  if (direction === "UP") return `Bullish · ${pct}% confidence`;
  if (direction === "DOWN") return `Bearish · ${pct}% confidence`;
  return `Neutral · ${pct}% confidence`;
}

export function IntelligenceDashboard({ initialSymbol = "RELIANCE.BSE" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/intelligence/${encodeURIComponent(symbol)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load intelligence feed.");
        const payload = (await response.json()) as IntelligenceResponse;
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [symbol]);

  const comparison = data?.comparison ?? [];
  const primary = data?.primary;
  const mentionMeter = useMemo(() => primary ? Math.min(100, primary.sentiment.mentionVolume * 7) : 0, [primary]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,#020617,#0f172a_45%,#020617)] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/40">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-300">Indian Market AI Intelligence</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                BSE & NSE market intelligence with Gemini-driven sentiment, prediction, and chain-reaction analysis.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Track top Indian companies across IT, Banking, Telecom, FMCG and Conglomerates. Multi-source news aggregation with AI-powered sentiment scoring and stock prediction.
              </p>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSymbol(query.trim().toUpperCase() || "RELIANCE.BSE");
                }}
              >
                <div>
                  <label htmlFor="symbol" className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Lookup symbol</label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="symbol"
                      value={query}
                      onChange={(event) => setQuery(event.target.value.toUpperCase())}
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                      placeholder="RELIANCE.BSE"
                    />
                    <button className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200" type="submit">
                      Analyse
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.25em] ${symbol === preset ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300"}`}
                      onClick={() => {
                        setQuery(preset);
                        setSymbol(preset);
                      }}
                    >
                      {PRESET_LABELS[preset]}
                    </button>
                  ))}
                </div>
              </form>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <TopMetric label="Mentions" value={primary ? String(primary.sentiment.mentionVolume) : loading ? "..." : "0"} />
                <TopMetric label="Prediction" value={primary?.prediction.direction ?? (loading ? "..." : "N/A")} />
                <TopMetric label="Price (INR)" value={primary ? formatCurrency(primary.stock.price, "INR") : loading ? "..." : "N/A"} />
                <TopMetric label="Volume" value={primary ? formatCompactNumber(primary.stock.volume) : loading ? "..." : "N/A"} />
              </div>
            </div>
          </div>
        </section>

        {error ? <section className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-5 text-rose-100">{error}</section> : null}

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Company intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {primary ? `${primary.company.name} (${primary.company.symbol})` : loading ? "Loading..." : "No data"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{primary ? `${primary.company.sector} | ${primary.company.exchange}` : ""}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{primary?.whyMoving ?? "Fetching AI-generated explanation of the latest price move."}</p>
              </div>
              <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                primary?.prediction.direction === "UP"
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                  : primary?.prediction.direction === "DOWN"
                    ? "border-rose-300/30 bg-rose-300/10 text-rose-200"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-100"
              }`}>
                {primary ? getPredictionLabel(primary.prediction.direction, primary.prediction.confidence) : "Waiting"}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <FeatureCard label="Sentiment score" value={primary ? `${primary.sentiment.score}/100` : "..."} detail={`Trend ${primary ? primary.sentiment.trend.toFixed(1) : "0"}`} />
              <FeatureCard label="Day move" value={primary ? formatPercent(primary.stock.changePercent) : "..."} detail={`Price INR ${primary?.stock.price?.toFixed(2) ?? "..."}`} />
              <FeatureCard label="Event pressure" value={primary ? String(primary.sentiment.highImpactCount) : "..."} detail="High-impact catalysts" />
              <FeatureCard label="Mention heat" value={`${mentionMeter}%`} detail="News and social volume" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {comparison.map((stock) => (
                <article key={stock.symbol} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{stock.symbol.replace(".BSE", "")}</div>
                      <div className="truncate text-xs text-slate-400">{stock.name}</div>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">INR {stock.price?.toFixed(2) ?? "N/A"}</div>
                  <div className="mt-1 text-xs text-slate-400">Volume {formatCompactNumber(stock.volume)}</div>
                </article>
              ))}
            </div>
          </div>
          {primary ? <StockChartCard stock={primary.stock} /> : <LoadingCard />}
        </section>

        {primary && data ? (
          <WorkflowCanvas workflow={data.workflow} symbol={primary.company.symbol} relations={primary.relations} />
        ) : (
          <LoadingCard />
        )}

        {primary && data ? (
          <InsightPanels
            prediction={primary.prediction}
            sentiment={primary.sentiment}
            whyMoving={primary.whyMoving}
            alerts={primary.alerts}
            trending={data.trending}
            items={primary.processedItems}
          />
        ) : (
          <LoadingCard />
        )}
      </div>
    </main>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="text-[11px] uppercase tracking-[0.32em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function FeatureCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="min-h-[2rem] text-[11px] uppercase leading-tight tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      <div className="min-h-[2.5rem] mt-1 text-sm leading-snug text-slate-400">{detail}</div>
    </div>
  );
}

function LoadingCard() {
  return <div className="h-72 rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30" />;
}
