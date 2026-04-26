"use client";

import { useEffect, useMemo, useState } from "react";
import type { IntelligenceResponse, ProcessedSignalItem } from "@/data/contracts";
import { resolveCompanyQuery, searchCompanies } from "@/data/watchlist";
import { InsightPanels } from "@/components/insight-panels";
import { StockChartCard } from "@/components/stock-chart-card";
import { WorkflowCanvas } from "@/frontend/workflow/workflow-canvas";
import { formatCompactNumber, formatPercent, formatSignedRupees } from "@/utils/format";

const PRESETS = ["RELIANCE.BSE", "TCS.BSE", "TATAMOTORS.BSE", "TATASTEEL.BSE", "HDFCBANK.BSE", "ADANIENT.BSE"];

const PRESET_LABELS: Record<string, string> = {
  "RELIANCE.BSE": "Reliance",
  "TCS.BSE": "TCS",
  "TATAMOTORS.BSE": "Tata Motors",
  "TATASTEEL.BSE": "Tata Steel",
  "HDFCBANK.BSE": "HDFC Bank",
  "ADANIENT.BSE": "Adani",
};

type DashboardLens = "overview" | "signals" | "network";
type SignalFilter = "all" | "positive" | "neutral" | "negative" | "high";

function getPredictionLabel(direction: string, confidence: number, priceChange: number) {
  const pct = Math.round(confidence * 100);
  if (direction === "UP") return `Bullish | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
  if (direction === "DOWN") return `Bearish | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
  return `Neutral | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
}

function getDirectionTone(direction?: string) {
  if (direction === "UP") return "emerald";
  if (direction === "DOWN") return "rose";
  return "amber";
}

function filterSignal(item: ProcessedSignalItem, filter: SignalFilter) {
  if (filter === "all") return true;
  if (filter === "high") return item.impact === "high";
  return item.sentiment === filter;
}

export function IntelligenceDashboard({ initialSymbol = "RELIANCE.BSE" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [activeLens, setActiveLens] = useState<DashboardLens>("overview");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [compactMode, setCompactMode] = useState(false);
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
        const payload = (await response.json()) as IntelligenceResponse | { message?: string };
        if (!response.ok) throw new Error("message" in payload && payload.message ? payload.message : "Unable to load intelligence feed.");
        setData(payload as IntelligenceResponse);
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
  const tone = getDirectionTone(primary?.prediction.direction);
  const mentionMeter = useMemo(() => (primary ? Math.min(100, primary.sentiment.mentionVolume * 7) : 0), [primary]);
  const resolvedSelection = useMemo(() => resolveCompanyQuery(query), [query]);
  const suggestions = useMemo(() => searchCompanies(query, 8), [query]);
  const visibleSignals = useMemo(
    () => primary?.processedItems.filter((item) => filterSignal(item, signalFilter)).slice(0, compactMode ? 4 : 8) ?? [],
    [compactMode, primary, signalFilter],
  );
  const riskScore = useMemo(() => {
    if (!primary) return 0;
    const negativeWeight = primary.sentiment.negativeCount * 12;
    const eventWeight = primary.sentiment.highImpactCount * 16;
    const volatilityWeight = Math.abs(primary.stock.changePercent ?? 0) * 6;
    return Math.min(100, Math.round(negativeWeight + eventWeight + volatilityWeight));
  }, [primary]);
  const liveReadout = primary
    ? `${primary.company.name} is ${getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange).toLowerCase()}`
    : "Loading market intelligence";

  function selectCompany(nextSymbol: string, nextName: string) {
    setQuery(nextName.toUpperCase());
    setSymbol(nextSymbol);
    setIsSuggestionOpen(false);
  }

  function submitLookup() {
    setIsSuggestionOpen(false);
    if (!resolvedSelection) {
      setError("No matching company found. Please choose one of the companies shown in the search results.");
      return;
    }
    setError(null);
    setSymbol(resolvedSelection.symbol);
  }

  return (
    <main className="min-h-screen bg-[#070b11] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,#070b11_0%,#111827_42%,#152116_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-45 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d141f]/92 shadow-[0_26px_90px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="grid gap-0 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-center gap-3">
                <StatusDot loading={loading} />
                <p className="text-[11px] uppercase tracking-[0.34em] text-cyan-200">Indian Market Intelligence</p>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Low-glare trading cockpit for signals, price targets, and chain reactions.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{liveReadout}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Coverage" value="News, social, price" accent="cyan" />
                <HeroStat label="Prediction" value="Next trading day" accent="emerald" />
                <HeroStat label="View" value={activeLens} accent="amber" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(["overview", "signals", "network"] as DashboardLens[]).map((lens) => (
                  <button
                    key={lens}
                    type="button"
                    onClick={() => setActiveLens(lens)}
                    className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      activeLens === lens
                        ? "border-cyan-300 bg-cyan-300/14 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-100"
                    }`}
                  >
                    {lens}
                  </button>
                ))}
                <label className="ml-auto inline-flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={(event) => setCompactMode(event.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Compact feed
                </label>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(17,24,39,0.96))] p-5 sm:p-6">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLookup();
                }}
              >
                <div>
                  <label htmlFor="symbol" className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                    Lookup company or symbol
                  </label>
                  <div className="relative mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
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
                      className="min-w-0 rounded-lg border border-white/10 bg-black/28 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                      placeholder="ADANI or RELIANCE.BSE"
                      autoComplete="off"
                    />
                    {query.trim() && isSuggestionOpen && suggestions.length ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-cyan-200/20 bg-[#0b1220] shadow-[0_22px_70px_rgba(0,0,0,0.52)]">
                        {suggestions.map((company) => (
                          <button
                            key={company.symbol}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectCompany(company.symbol, company.name);
                            }}
                            className="flex w-full items-center justify-between gap-3 border-b border-white/8 px-4 py-3 text-left transition hover:bg-cyan-300/10 last:border-b-0"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white">{company.name}</div>
                              <div className="mt-1 text-xs text-slate-400">{company.sector} | {company.exchange}</div>
                            </div>
                            <div className="text-xs font-semibold text-cyan-200">{company.symbol}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200" type="submit">
                      Analyse
                    </button>
                  </div>
                </div>

                {query.trim() && suggestions.length ? (
                  <div className="rounded-xl border border-cyan-300/12 bg-cyan-300/[0.06] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-200">Matches</span>
                      <span className="text-xs font-semibold text-slate-400">{suggestions.length} found</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((company) => (
                        <button
                          key={company.symbol}
                          type="button"
                          onClick={() => selectCompany(company.symbol, company.name)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                            resolvedSelection?.symbol === company.symbol
                              ? "border-cyan-300 bg-cyan-300/14 text-cyan-50"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:bg-white/[0.07]"
                          }`}
                        >
                          <span className="font-semibold">{company.name}</span>
                          <span className="ml-2 text-slate-500">{company.symbol.replace(".BSE", "")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        symbol === preset ? "border-emerald-300 bg-emerald-300/14 text-emerald-100" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                      }`}
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
                <TopMetric label="Mentions" value={primary ? String(primary.sentiment.mentionVolume) : loading ? "..." : "0"} tone="cyan" />
                <TopMetric label="Prediction" value={primary ? getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange) : loading ? "..." : "N/A"} tone={tone} />
                <TopMetric label="Risk heat" value={`${riskScore}/100`} tone={riskScore > 65 ? "rose" : riskScore > 35 ? "amber" : "emerald"} />
                <TopMetric label="Mention heat" value={`${mentionMeter}%`} tone="violet" />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-xl border border-rose-300/25 bg-rose-500/10 p-5 text-rose-100 shadow-[0_20px_60px_rgba(127,29,29,0.2)]">
            {error}
          </section>
        ) : null}

        {primary && (
          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className={`rounded-2xl border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${tone === "emerald" ? "border-emerald-300/22 bg-emerald-300/[0.07]" : tone === "rose" ? "border-rose-300/22 bg-rose-300/[0.07]" : "border-amber-300/22 bg-amber-300/[0.07]"}`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">AI Price Prediction | Tomorrow</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <span className={`grid h-14 w-14 place-items-center rounded-xl border text-3xl font-black ${tone === "emerald" ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-200" : tone === "rose" ? "border-rose-300/40 bg-rose-300/12 text-rose-200" : "border-amber-300/40 bg-amber-300/12 text-amber-200"}`}>
                      {primary.prediction.direction === "UP" ? "^" : primary.prediction.direction === "DOWN" ? "v" : "="}
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">
                        {primary.company.name}
                        <span className="ml-3 text-sm font-medium text-slate-400">({primary.company.symbol})</span>
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{primary.prediction.explanation}</p>
                    </div>
                  </div>
                </div>
                <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
                  <PredictionTile label="Current" value={`INR ${primary.stock.price?.toFixed(2) ?? "N/A"}`} accent="slate" />
                  <PredictionTile label="Target" value={`INR ${primary.prediction.priceTarget.toFixed(2)}`} accent={tone} />
                  <PredictionTile label="Move" value={formatSignedRupees(primary.prediction.priceChange)} accent={primary.prediction.priceChange >= 0 ? "emerald" : "rose"} />
                  <PredictionTile label="Confidence" value={`${Math.round(primary.prediction.confidence * 100)}%`} accent="cyan" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Signal mixer</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{visibleSignals.length} active signals</h3>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Risk</div>
                  <div className="text-lg font-black text-white">{riskScore}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["all", "positive", "neutral", "negative", "high"] as SignalFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSignalFilter(filter)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                      signalFilter === filter ? "border-violet-300 bg-violet-300/14 text-violet-100" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {visibleSignals.slice(0, 4).map((item) => (
                  <SignalMini key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={`grid gap-5 ${activeLens === "signals" ? "xl:grid-cols-[0.82fr_1.18fr]" : "xl:grid-cols-[1.05fr_0.95fr]"}`}>
          <div className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Company intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {primary ? `${primary.company.name} (${primary.company.symbol})` : loading ? "Loading..." : "No data"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{primary ? `${primary.company.sector} | ${primary.company.exchange}` : ""}</p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  {primary?.whyMoving ?? "Fetching AI-generated explanation of the latest price move."}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                  tone === "emerald" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : tone === "rose" ? "border-rose-300/30 bg-rose-300/10 text-rose-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"
                }`}>
                  {primary ? getPredictionLabel(primary.prediction.direction, primary.prediction.confidence, primary.prediction.priceChange) : "Waiting"}
                </div>
                {primary && (
                  <div className="rounded-xl border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-3 text-right">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200">Tomorrow target</p>
                    <p className="mt-1 text-xl font-bold text-white">INR {primary.prediction.priceTarget.toFixed(2)}</p>
                    <p className={`text-sm font-semibold ${primary.prediction.priceChange >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatSignedRupees(primary.prediction.priceChange)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <FeatureCard label="Sentiment score" value={primary ? `${primary.sentiment.score}/100` : "..."} detail={`Trend ${primary ? primary.sentiment.trend.toFixed(1) : "0"}`} />
              <FeatureCard label="Day move" value={primary ? formatPercent(primary.stock.changePercent) : "..."} detail={`Price INR ${primary?.stock.price?.toFixed(2) ?? "..."}`} />
              <FeatureCard label="Tomorrow target" value={primary ? `INR ${primary.prediction.priceTarget.toFixed(2)}` : "..."} detail={primary ? `Expected ${formatSignedRupees(primary.prediction.priceChange)}` : "..."} />
              <FeatureCard label="Event pressure" value={primary ? String(primary.sentiment.highImpactCount) : "..."} detail="High-impact catalysts" />
              <FeatureCard label="Mention heat" value={`${mentionMeter}%`} detail="News and social volume" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {comparison.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => selectCompany(stock.symbol, stock.name)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06]"
                >
                  <div className="truncate text-sm font-bold text-white">{stock.symbol.replace(".BSE", "")}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="truncate text-xs text-slate-400">{stock.name}</div>
                    <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">INR {stock.price?.toFixed(2) ?? "N/A"}</div>
                  <div className="mt-1 text-xs text-slate-500">Volume {formatCompactNumber(stock.volume)}</div>
                </button>
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

function StatusDot({ loading }: { loading: boolean }) {
  return (
    <span className={`h-2.5 w-2.5 rounded-full ${loading ? "animate-pulse bg-amber-300" : "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]"}`} />
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent: "cyan" | "emerald" | "amber" }) {
  const tones = {
    cyan: "border-cyan-300/18 bg-cyan-300/[0.07] text-cyan-100",
    emerald: "border-emerald-300/18 bg-emerald-300/[0.07] text-emerald-100",
    amber: "border-amber-300/18 bg-amber-300/[0.07] text-amber-100",
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[accent]}`}>
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold capitalize">{value}</div>
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
  accent: "slate" | "cyan" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    slate: "border-white/10 bg-white/[0.05] text-slate-100",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
    rose: "border-rose-300/20 bg-rose-300/[0.07] text-rose-100",
    amber: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
  } as const;

  return (
    <div className={`min-w-[126px] rounded-xl border px-4 py-3 ${tones[accent]}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TopMetric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "rose" | "amber" | "violet" }) {
  const tones = {
    cyan: "border-cyan-300/16 bg-cyan-300/[0.06]",
    emerald: "border-emerald-300/16 bg-emerald-300/[0.06]",
    rose: "border-rose-300/16 bg-rose-300/[0.06]",
    amber: "border-amber-300/16 bg-amber-300/[0.06]",
    violet: "border-violet-300/16 bg-violet-300/[0.06]",
  } as const;

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-5 text-white">{value}</div>
    </div>
  );
}

function FeatureCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="min-h-[2rem] text-[10px] uppercase leading-tight tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 min-h-[2.5rem] text-sm leading-snug text-slate-400">{detail}</div>
    </div>
  );
}

function SignalMini({ item }: { item: ProcessedSignalItem }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/18 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-xs font-semibold text-slate-300">{item.source}</span>
        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${item.sentiment === "positive" ? "bg-emerald-300/12 text-emerald-100" : item.sentiment === "negative" ? "bg-rose-300/12 text-rose-100" : "bg-amber-300/12 text-amber-100"}`}>
          {item.sentiment}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{item.title}</p>
    </article>
  );
}

function LoadingCard() {
  return <div className="h-72 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_rgba(0,0,0,0.22)]" />;
}
