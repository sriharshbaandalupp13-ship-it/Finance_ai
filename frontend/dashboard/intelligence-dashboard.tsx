"use client";

import { useEffect, useMemo, useState } from "react";
import type { IntelligenceResponse } from "@/data/contracts";
import { resolveCompanyQuery, searchCompanies } from "@/data/watchlist";
import { InsightPanels } from "@/components/insight-panels";
import { StockChartCard } from "@/components/stock-chart-card";
import { WorkflowCanvas } from "@/frontend/workflow/workflow-canvas";
import { formatCompactNumber, formatPercent, formatSignedRupees } from "@/utils/format";

const PRESETS = ["RELIANCE.BSE", "TCS.BSE", "TATAMOTORS.BSE", "TATASTEEL.BSE", "HDFCBANK.BSE"];

const PRESET_LABELS: Record<string, string> = {
  "RELIANCE.BSE": "Reliance",
  "TCS.BSE": "TCS",
  "TATAMOTORS.BSE": "Tata Motors",
  "TATASTEEL.BSE": "Tata Steel",
  "HDFCBANK.BSE": "HDFC Bank",
};

function getPredictionLabel(direction: string, confidence: number, priceChange: number) {
  const pct = Math.round(confidence * 100);
  if (direction === "UP") return `Bullish · ${formatSignedRupees(priceChange)} · ${pct}% confidence`;
  if (direction === "DOWN") return `Bearish · ${formatSignedRupees(priceChange)} · ${pct}% confidence`;
  return `Neutral · ${formatSignedRupees(priceChange)} · ${pct}% confidence`;
}

export function IntelligenceDashboard({ initialSymbol = "RELIANCE.BSE" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
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
  const mentionMeter = useMemo(() => (primary ? Math.min(100, primary.sentiment.mentionVolume * 7) : 0), [primary]);
  const resolvedSelection = useMemo(() => resolveCompanyQuery(query), [query]);
  const suggestions = useMemo(() => searchCompanies(query, 6), [query]);

  function selectCompany(nextSymbol: string, nextName: string) {
    setQuery(nextName.toUpperCase());
    setSymbol(nextSymbol);
    setIsSuggestionOpen(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef8ff_38%,#f7fffb_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur">
          <div className="grid gap-8 xl:grid-cols-[1.3fr_0.9fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.38em] text-sky-600">Indian Market Intelligence</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Brighter stock intelligence with next-day price targets, sentiment, and relationship mapping.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Search Indian companies by name or symbol, inspect tomorrow&apos;s predicted move, and explore how peers, suppliers, and competitors may react.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <HeroStat label="Coverage" value="News + Social + Market" />
                <HeroStat label="Prediction Horizon" value="Next trading day" />
                <HeroStat label="Graph Mode" value="Interactive links" />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setIsSuggestionOpen(false);
                  setSymbol(resolvedSelection?.symbol ?? (query.trim().toUpperCase() || "RELIANCE.BSE"));
                }}
              >
                <div>
                  <label htmlFor="symbol" className="text-[11px] uppercase tracking-[0.35em] text-sky-600">
                    Lookup company or symbol
                  </label>
                  <div className="relative mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="symbol"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value.toUpperCase());
                        setIsSuggestionOpen(true);
                      }}
                      onFocus={() => setIsSuggestionOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsSuggestionOpen(false), 120);
                      }}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="TATA MOTORS or RELIANCE.BSE"
                      autoComplete="off"
                    />
                    {query.trim() && isSuggestionOpen && suggestions.length ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(148,163,184,0.18)]">
                        {suggestions.map((company) => (
                          <button
                            key={company.symbol}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectCompany(company.symbol, company.name);
                            }}
                            className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
                          >
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{company.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{company.sector} · {company.exchange}</div>
                            </div>
                            <div className="text-xs font-semibold text-sky-700">{company.symbol}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500" type="submit">
                      Analyse
                    </button>
                  </div>
                </div>
                {query.trim() && resolvedSelection ? (
                  <button
                    type="button"
                    onClick={() => selectCompany(resolvedSelection.symbol, resolvedSelection.name)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-xs text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    <span className="uppercase tracking-[0.22em] text-sky-500">Matched</span>
                    <span className="font-semibold text-slate-800">{resolvedSelection.name}</span>
                    <span className="text-slate-500">({resolvedSelection.symbol})</span>
                  </button>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold ${symbol === preset ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"}`}
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
                <TopMetric label="Prediction" value={primary ? getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange) : loading ? "..." : "N/A"} />
                <TopMetric label="Tomorrow move" value={primary ? formatSignedRupees(primary.prediction.priceChange) : loading ? "..." : "N/A"} />
                <TopMetric label="Tomorrow target" value={primary ? `₹${primary.prediction.priceTarget.toFixed(2)}` : loading ? "..." : "N/A"} />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-[0_20px_50px_rgba(251,113,133,0.12)]">
            {error}
          </section>
        ) : null}

        {primary && (
          <section className={`rounded-[28px] border p-6 shadow-[0_30px_80px_rgba(148,163,184,0.16)] ${
            primary.prediction.direction === "UP"
              ? "border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4,#ffffff_55%,#ecfeff)]"
              : primary.prediction.direction === "DOWN"
                ? "border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffffff_55%,#f8fafc)]"
                : "border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#ffffff_55%,#f0fdf4)]"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">AI Price Prediction · Tomorrow</p>
                <div className="mt-3 flex items-center gap-4">
                  <span className={`text-5xl font-black ${
                    primary.prediction.direction === "UP" ? "text-emerald-600" : primary.prediction.direction === "DOWN" ? "text-rose-600" : "text-amber-600"
                  }`}>
                    {primary.prediction.direction === "UP" ? "↑" : primary.prediction.direction === "DOWN" ? "↓" : "→"}
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-slate-950">
                      {primary.prediction.direction === "UP" ? "Bullish" : primary.prediction.direction === "DOWN" ? "Bearish" : "Neutral"}
                      <span className="ml-3 text-sm font-medium text-slate-500">
                        {Math.round(primary.prediction.confidence * 100)}% confidence
                      </span>
                    </p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{primary.prediction.explanation}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PredictionTile label="Current price" value={`₹${primary.stock.price?.toFixed(2) ?? "N/A"}`} accent="slate" />
                <PredictionTile label="Tomorrow target" value={`₹${primary.prediction.priceTarget.toFixed(2)}`} accent="sky" />
                <PredictionTile label="Expected move" value={formatSignedRupees(primary.prediction.priceChange)} accent={primary.prediction.priceChange >= 0 ? "emerald" : "rose"} />
                <PredictionTile label="Signal profile" value={getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange)} accent="amber" />
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-sky-600">Company intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {primary ? `${primary.company.name} (${primary.company.symbol})` : loading ? "Loading..." : "No data"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{primary ? `${primary.company.sector} · ${primary.company.exchange}` : ""}</p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                  {primary?.whyMoving ?? "Fetching AI-generated explanation of the latest price move."}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  primary?.prediction.direction === "UP"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : primary?.prediction.direction === "DOWN"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                  {primary ? getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange) : "Waiting"}
                </div>
                {primary && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-sky-700">Tomorrow&apos;s target</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">₹{primary.prediction.priceTarget.toFixed(2)}</p>
                    <p className={`text-sm font-semibold ${primary.prediction.priceChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatSignedRupees(primary.prediction.priceChange)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FeatureCard label="Sentiment score" value={primary ? `${primary.sentiment.score}/100` : "..."} detail={`Trend ${primary ? primary.sentiment.trend.toFixed(1) : "0"}`} />
              <FeatureCard label="Day move" value={primary ? formatPercent(primary.stock.changePercent) : "..."} detail={`Price INR ${primary?.stock.price?.toFixed(2) ?? "..."}`} />
              <FeatureCard label="Tomorrow target" value={primary ? `INR ${primary.prediction.priceTarget.toFixed(2)}` : "..."} detail={primary ? `Expected move ${formatSignedRupees(primary.prediction.priceChange)}` : "..."} />
              <FeatureCard label="Event pressure" value={primary ? String(primary.sentiment.highImpactCount) : "..."} detail="High-impact catalysts" />
              <FeatureCard label="Mention heat" value={`${mentionMeter}%`} detail="News and social volume" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {comparison.map((stock) => (
                <article key={stock.symbol} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(148,163,184,0.16)]">
                  <div className="truncate text-sm font-bold text-slate-900">{stock.symbol.replace(".BSE", "")}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="truncate text-xs text-slate-500">{stock.name}</div>
                    <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>
                  <div className="mt-3 text-lg font-semibold text-slate-950">INR {stock.price?.toFixed(2) ?? "N/A"}</div>
                  <div className="mt-1 text-xs text-slate-500">Volume {formatCompactNumber(stock.volume)}</div>
                </article>
              ))}
            </div>
          </div>

          {primary ? <StockChartCard stock={primary.stock} prediction={primary.prediction} /> : <LoadingCard />}
        </section>

        {primary && data ? (
          <WorkflowCanvas
            workflow={data.workflow}
            symbol={primary.company.symbol}
            companyName={primary.company.name}
            priceTarget={primary.prediction.priceTarget}
            relations={primary.relations}
          />
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function PredictionTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "slate" | "sky" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;

  return (
    <div className={`min-w-[180px] rounded-2xl border px-4 py-3 ${tones[accent]}`}>
      <div className="text-[10px] uppercase tracking-[0.28em] opacity-70">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(148,163,184,0.1)]">
      <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function FeatureCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="min-h-[2rem] text-[11px] uppercase leading-tight tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 min-h-[2.5rem] text-sm leading-snug text-slate-600">{detail}</div>
    </div>
  );
}

function LoadingCard() {
  return <div className="h-72 rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_60px_rgba(148,163,184,0.16)]" />;
}
