"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  LineChart,
  Loader2,
  Network,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IntelligenceResponse, ProcessedSignalItem, StockSnapshot } from "@/data/contracts";
import { resolveCompanyQuery, searchCompanies } from "@/data/watchlist";
import { InsightPanels } from "@/components/insight-panels";
import { StockChartCard } from "@/components/stock-chart-card";
import { WorkflowCanvas } from "@/frontend/workflow/workflow-canvas";
import { cn } from "@/utils/cn";
import { formatCompactNumber, formatPercent, formatSignedRupees } from "@/utils/format";

const PRESETS = ["RELIANCE.BSE", "TCS.BSE", "TATAMOTORS.BSE", "TATASTEEL.BSE", "HDFCBANK.BSE", "ADANIENT.BSE"];
const REFRESH_INTERVAL_MS = 45_000;

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
type SignalSort = "latest" | "confidence" | "impact";
type DirectionTone = "emerald" | "rose" | "amber";
type MetricTone = DirectionTone | "cyan" | "slate";

const IMPACT_WEIGHT: Record<ProcessedSignalItem["impact"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const SIGNAL_FILTERS: SignalFilter[] = ["all", "positive", "neutral", "negative", "high"];
const LENSES: Array<{ id: DashboardLens; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "signals", label: "Signals", icon: Radar },
  { id: "network", label: "Network", icon: Network },
];

function getPredictionLabel(direction: string, confidence: number, priceChange: number) {
  const pct = Math.round(confidence * 100);
  if (direction === "UP") return `Bullish | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
  if (direction === "DOWN") return `Bearish | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
  return `Neutral | ${formatSignedRupees(priceChange)} | ${pct}% confidence`;
}

function getDirectionTone(direction?: string): DirectionTone {
  if (direction === "UP") return "emerald";
  if (direction === "DOWN") return "rose";
  return "amber";
}

function getMetricToneClasses(tone: MetricTone) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
    rose: "border-rose-300/20 bg-rose-300/[0.07] text-rose-100",
    amber: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    slate: "border-slate-300/12 bg-slate-300/[0.05] text-slate-100",
  } as const;

  return tones[tone];
}

function getSignalTone(item: ProcessedSignalItem) {
  if (item.sentiment === "positive") return "border-emerald-300/22 bg-emerald-300/[0.06] text-emerald-100";
  if (item.sentiment === "negative") return "border-rose-300/22 bg-rose-300/[0.06] text-rose-100";
  return "border-amber-300/22 bg-amber-300/[0.06] text-amber-100";
}

function filterSignal(item: ProcessedSignalItem, filter: SignalFilter) {
  if (filter === "all") return true;
  if (filter === "high") return item.impact === "high";
  return item.sentiment === filter;
}

function sortSignals(items: ProcessedSignalItem[], sort: SignalSort) {
  const sortable = [...items];
  if (sort === "confidence") return sortable.sort((left, right) => right.confidence - left.confidence);
  if (sort === "impact") return sortable.sort((left, right) => IMPACT_WEIGHT[right.impact] - IMPACT_WEIGHT[left.impact] || right.confidence - left.confidence);
  return sortable.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

function formatTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function IntelligenceDashboard({ initialSymbol = "RELIANCE.BSE" }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [activeLens, setActiveLens] = useState<DashboardLens>("overview");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [signalSort, setSignalSort] = useState<SignalSort>("latest");
  const [minConfidence, setMinConfidence] = useState(35);
  const [compactMode, setCompactMode] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
        if (!response.ok) {
          throw new Error("message" in payload && payload.message ? payload.message : "Unable to load intelligence feed.");
        }
        setData(payload as IntelligenceResponse);
        setLastUpdated(new Date());
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [refreshTick, symbol]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => setRefreshTick((tick) => tick + 1), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const resolvedSelection = useMemo(() => resolveCompanyQuery(query), [query]);
  const suggestions = useMemo(() => searchCompanies(query, 8), [query]);
  const primary = data?.primary ?? null;
  const comparison = data?.comparison ?? [];
  const hasTypedQuery = query.trim().length > 0;
  const invalidDraft = hasTypedQuery && query.trim().length >= 3 && !resolvedSelection && suggestions.length === 0;
  const canShowMarketData = Boolean(primary) && !invalidDraft;
  const displayPrimary = canShowMarketData ? primary : null;
  const tone = getDirectionTone(displayPrimary?.prediction.direction);

  const filteredSignals = useMemo(() => {
    const items = displayPrimary?.processedItems ?? [];
    return sortSignals(
      items.filter((item) => filterSignal(item, signalFilter)).filter((item) => Math.round(item.confidence * 100) >= minConfidence),
      signalSort,
    );
  }, [displayPrimary, minConfidence, signalFilter, signalSort]);

  const visibleSignals = useMemo(
    () => filteredSignals.slice(0, compactMode ? 5 : 10),
    [compactMode, filteredSignals],
  );

  const selectedSignal = useMemo(
    () => filteredSignals.find((item) => item.id === selectedSignalId) ?? filteredSignals[0] ?? displayPrimary?.processedItems[0] ?? null,
    [displayPrimary, filteredSignals, selectedSignalId],
  );

  const sentimentBalance = useMemo(() => {
    if (!displayPrimary?.sentiment.mentionVolume) return { positive: 0, negative: 0, neutral: 0 };
    const { sentiment } = displayPrimary;
    return {
      positive: Math.round((sentiment.positiveCount / sentiment.mentionVolume) * 100),
      negative: Math.round((sentiment.negativeCount / sentiment.mentionVolume) * 100),
      neutral: Math.round((sentiment.neutralCount / sentiment.mentionVolume) * 100),
    };
  }, [displayPrimary]);

  const mentionMeter = useMemo(
    () => (displayPrimary ? Math.min(100, displayPrimary.sentiment.mentionVolume * 7) : 0),
    [displayPrimary],
  );

  const riskScore = useMemo(() => {
    if (!displayPrimary) return 0;
    const negativeWeight = displayPrimary.sentiment.negativeCount * 12;
    const eventWeight = displayPrimary.sentiment.highImpactCount * 16;
    const volatilityWeight = Math.abs(displayPrimary.stock.changePercent ?? 0) * 6;
    return Math.min(100, Math.round(negativeWeight + eventWeight + volatilityWeight));
  }, [displayPrimary]);

  const liveReadout = invalidDraft
    ? "No supported company matches that lookup."
    : displayPrimary
      ? `${displayPrimary.company.name} is ${getPredictionLabel(displayPrimary.prediction.direction, displayPrimary.prediction.confidence, displayPrimary.prediction.priceChange).toLowerCase()}`
      : "Loading market intelligence";

  function selectCompany(nextSymbol: string, nextName: string) {
    setQuery(nextName);
    setSymbol(nextSymbol);
    setSelectedSignalId(null);
    setError(null);
    setIsSuggestionOpen(false);
  }

  function submitLookup() {
    setIsSuggestionOpen(false);
    if (!resolvedSelection) {
      setData(null);
      setError("No supported company matched that lookup. Choose one of the listed companies before analysing.");
      return;
    }
    setQuery(resolvedSelection.name);
    setSelectedSignalId(null);
    setError(null);
    setSymbol(resolvedSelection.symbol);
  }

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-7">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#081118]/88 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur">
            <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(103,232,249,0.11),rgba(251,191,36,0.06),transparent)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <StatusDot loading={loading} />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100">Finance Signal Studio</p>
                    <h1 className="mt-1 text-2xl font-semibold text-white sm:text-4xl">Market intelligence cockpit</h1>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoRefresh((value) => !value)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      autoRefresh ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30",
                    )}
                    title="Toggle automatic refresh"
                  >
                    <Activity className="h-4 w-4" />
                    Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefreshTick((tick) => tick + 1)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
                    title="Refresh market intelligence"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                  </button>
                </div>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-300 sm:text-base">{liveReadout}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  icon={LineChart}
                  label="Tomorrow call"
                  value={displayPrimary ? displayPrimary.prediction.direction : loading ? "Loading" : "No signal"}
                  detail={displayPrimary ? getPredictionLabel(displayPrimary.prediction.direction, displayPrimary.prediction.confidence, displayPrimary.prediction.priceChange) : "Waiting for a valid company"}
                  tone={tone}
                />
                <KpiCard
                  icon={Gauge}
                  label="Risk heat"
                  value={`${riskScore}/100`}
                  detail={riskScore > 65 ? "Aggressive catalyst load" : riskScore > 35 ? "Watch for volatility" : "Controlled pressure"}
                  tone={riskScore > 65 ? "rose" : riskScore > 35 ? "amber" : "emerald"}
                />
                <KpiCard
                  icon={Radar}
                  label="Mention heat"
                  value={`${mentionMeter}%`}
                  detail={displayPrimary ? `${displayPrimary.sentiment.mentionVolume} monitored mentions` : "News and social volume"}
                  tone="cyan"
                />
                <KpiCard
                  icon={Bell}
                  label="Alerts"
                  value={displayPrimary ? String(displayPrimary.alerts.length) : "0"}
                  detail={displayPrimary?.alerts[0]?.title ?? "No active spike detected"}
                  tone={displayPrimary?.alerts.length ? "amber" : "slate"}
                />
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
              <nav className="border-b border-white/10 bg-black/18 p-3 lg:border-b-0 lg:border-r">
                <div className="grid gap-2">
                  {LENSES.map((lens) => {
                    const Icon = lens.icon;
                    return (
                      <button
                        key={lens.id}
                        type="button"
                        onClick={() => setActiveLens(lens.id)}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition",
                          activeLens === lens.id
                            ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                            : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {lens.label}
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_350px]">
                <PredictionPanel primary={displayPrimary} tone={tone} loading={loading} />
                <SignalDrilldown signal={selectedSignal} sentimentBalance={sentimentBalance} />
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-[#091118]/88 p-4 shadow-[0_26px_80px_rgba(0,0,0,0.32)] backdrop-blur">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitLookup();
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="symbol" className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">
                    Lookup
                  </label>
                  <span className="text-xs text-slate-500">Updated {formatTime(lastUpdated?.toISOString())}</span>
                </div>
                <div className="relative mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_46px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="symbol"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setIsSuggestionOpen(true);
                        if (error) setError(null);
                      }}
                      onFocus={() => setIsSuggestionOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsSuggestionOpen(false), 120);
                      }}
                      className={cn(
                        "h-12 w-full min-w-0 rounded-lg border bg-black/28 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:ring-4",
                        invalidDraft ? "border-rose-300/45 focus:ring-rose-300/10" : "border-white/10 focus:border-cyan-300 focus:ring-cyan-300/10",
                      )}
                      placeholder="RELIANCE, TCS, ADANI..."
                      autoComplete="off"
                    />
                    {hasTypedQuery && isSuggestionOpen && suggestions.length ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 overflow-hidden rounded-lg border border-cyan-200/20 bg-[#071018] shadow-[0_22px_70px_rgba(0,0,0,0.55)]">
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
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{company.name}</div>
                              <div className="mt-1 truncate text-xs text-slate-400">{company.sector} | {company.exchange}</div>
                            </div>
                            <div className="shrink-0 font-mono text-xs font-semibold text-cyan-200">{company.symbol}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-200 text-slate-950 transition hover:bg-cyan-100 disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                    type="submit"
                    disabled={loading && symbol === resolvedSelection?.symbol}
                    title="Analyse selected company"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  </button>
                </div>
                {invalidDraft ? (
                  <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
                    No supported company matches this text. Pick a result or try a listed symbol.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cn(
                      "min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition",
                      symbol === preset
                        ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-100"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/25 hover:text-white",
                    )}
                    onClick={() => selectCompany(preset, PRESET_LABELS[preset])}
                  >
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" />
                  Signal controls
                </div>
                <div className="grid gap-3">
                  <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
                    Compact feed
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(event) => setCompactMode(event.target.checked)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </label>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Min confidence</span>
                      <span className="font-mono text-cyan-100">{minConfidence}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={95}
                      step={5}
                      value={minConfidence}
                      onChange={(event) => setMinConfidence(Number(event.target.value))}
                      className="w-full accent-cyan-300"
                    />
                  </div>
                  <select
                    value={signalSort}
                    onChange={(event) => setSignalSort(event.target.value as SignalSort)}
                    className="h-10 rounded-lg border border-white/10 bg-[#071018] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300"
                  >
                    <option value="latest">Latest first</option>
                    <option value="confidence">Highest confidence</option>
                    <option value="impact">Highest impact</option>
                  </select>
                </div>
              </div>
            </form>
          </aside>
        </section>

        {(error || invalidDraft) && !displayPrimary ? (
          <NoMatchState query={query} message={error ?? "No supported company matches that lookup."} suggestions={suggestions} onSelect={selectCompany} />
        ) : null}

        {displayPrimary ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
              <div className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">Company intelligence</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {displayPrimary.company.name}
                      <span className="ml-2 font-mono text-sm text-slate-500">{displayPrimary.company.symbol}</span>
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">{displayPrimary.company.sector} | {displayPrimary.company.exchange}</p>
                  </div>
                  <div className={cn("rounded-lg border px-4 py-3 text-sm font-semibold", getMetricToneClasses(tone))}>
                    {getPredictionLabel(displayPrimary.prediction.direction, displayPrimary.prediction.confidence, displayPrimary.prediction.priceChange)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <FeatureCard icon={BrainCircuit} label="Sentiment" value={`${displayPrimary.sentiment.score}/100`} detail={`Trend ${displayPrimary.sentiment.trend.toFixed(1)}`} tone="cyan" />
                  <FeatureCard icon={BarChart3} label="Day move" value={formatPercent(displayPrimary.stock.changePercent)} detail={`Price INR ${displayPrimary.stock.price?.toFixed(2) ?? "..."}`} tone={displayPrimary.stock.changePercent !== null && displayPrimary.stock.changePercent >= 0 ? "emerald" : "rose"} />
                  <FeatureCard icon={LineChart} label="Target" value={`INR ${displayPrimary.prediction.priceTarget.toFixed(2)}`} detail={formatSignedRupees(displayPrimary.prediction.priceChange)} tone={tone} />
                  <FeatureCard icon={AlertTriangle} label="Pressure" value={String(displayPrimary.sentiment.highImpactCount)} detail="High-impact catalysts" tone={riskScore > 55 ? "amber" : "slate"} />
                  <FeatureCard icon={Layers3} label="Feed" value={String(displayPrimary.processedItems.length)} detail={`${visibleSignals.length} shown after filters`} tone="slate" />
                </div>

                <PeerTicker stocks={comparison} activeSymbol={displayPrimary.company.symbol} onSelect={selectCompany} />
              </div>

              <SignalConsole
                signals={visibleSignals}
                selectedSignalId={selectedSignal?.id ?? null}
                signalFilter={signalFilter}
                onSignalFilterChange={setSignalFilter}
                onSelectSignal={setSelectedSignalId}
              />
            </section>

            <section className={cn("grid gap-4", activeLens === "signals" ? "xl:grid-cols-[0.85fr_1.15fr]" : "xl:grid-cols-[1.06fr_0.94fr]")}>
              <StockChartCard stock={displayPrimary.stock} prediction={displayPrimary.prediction} />
              <CatalystBoard signal={selectedSignal} sentimentBalance={sentimentBalance} riskScore={riskScore} mentionMeter={mentionMeter} />
            </section>

            {data ? (
              activeLens === "signals" ? (
                <>
                  <InsightPanels
                    prediction={displayPrimary.prediction}
                    sentiment={displayPrimary.sentiment}
                    whyMoving={displayPrimary.whyMoving}
                    alerts={displayPrimary.alerts}
                    trending={data.trending}
                    items={displayPrimary.processedItems}
                  />
                  <WorkflowCanvas
                    workflow={data.workflow}
                    symbol={displayPrimary.company.symbol}
                    companyName={displayPrimary.company.name}
                    priceTarget={displayPrimary.prediction.priceTarget}
                    relations={displayPrimary.relations}
                  />
                </>
              ) : (
                <>
                  <WorkflowCanvas
                    workflow={data.workflow}
                    symbol={displayPrimary.company.symbol}
                    companyName={displayPrimary.company.name}
                    priceTarget={displayPrimary.prediction.priceTarget}
                    relations={displayPrimary.relations}
                  />
                  <InsightPanels
                    prediction={displayPrimary.prediction}
                    sentiment={displayPrimary.sentiment}
                    whyMoving={displayPrimary.whyMoving}
                    alerts={displayPrimary.alerts}
                    trending={data.trending}
                    items={displayPrimary.processedItems}
                  />
                </>
              )
            ) : null}
          </>
        ) : !error && !invalidDraft ? (
          <LoadingCard />
        ) : null}
      </div>
    </main>
  );
}

function StatusDot({ loading }: { loading: boolean }) {
  return (
    <span
      className={cn(
        "h-2.5 w-2.5 shrink-0 rounded-full",
        loading ? "animate-pulse bg-amber-300" : "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.75)]",
      )}
    />
  );
}

function KpiCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: MetricTone }) {
  return (
    <div className={cn("min-h-[126px] rounded-lg border p-4", getMetricToneClasses(tone))}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{label}</span>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{detail}</div>
    </div>
  );
}

function PredictionPanel({
  primary,
  tone,
  loading,
}: {
  primary: IntelligenceResponse["primary"] | null;
  tone: DirectionTone;
  loading: boolean;
}) {
  if (!primary) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4">
        <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Prediction deck</p>
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Loading intelligence..." : "Search a supported company to activate the cockpit."}
        </div>
      </div>
    );
  }

  const isUp = primary.prediction.direction === "UP";
  const isDown = primary.prediction.direction === "DOWN";
  const DirectionIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Activity;

  return (
    <div className={cn("rounded-lg border p-4", getMetricToneClasses(tone))}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] opacity-70">AI price prediction</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/15 bg-black/20">
              <DirectionIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-semibold text-white">{primary.company.name}</h3>
              <p className="mt-1 font-mono text-xs text-slate-400">{primary.company.symbol}</p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{primary.prediction.explanation}</p>
        </div>
        <div className="grid min-w-[260px] gap-2 sm:grid-cols-2">
          <PredictionTile label="Current" value={`INR ${primary.stock.price?.toFixed(2) ?? "N/A"}`} tone="slate" />
          <PredictionTile label="Target" value={`INR ${primary.prediction.priceTarget.toFixed(2)}`} tone={tone} />
          <PredictionTile label="Move" value={formatSignedRupees(primary.prediction.priceChange)} tone={primary.prediction.priceChange >= 0 ? "emerald" : "rose"} />
          <PredictionTile label="Confidence" value={`${Math.round(primary.prediction.confidence * 100)}%`} tone="cyan" />
        </div>
      </div>
    </div>
  );
}

function PredictionTile({ label, value, tone }: { label: string; value: string; tone: MetricTone }) {
  return (
    <div className={cn("min-h-[78px] rounded-lg border px-3 py-3", getMetricToneClasses(tone))}>
      <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SignalDrilldown({
  signal,
  sentimentBalance,
}: {
  signal: ProcessedSignalItem | null;
  sentimentBalance: { positive: number; negative: number; neutral: number };
}) {
  return (
    <aside className="rounded-lg border border-white/10 bg-black/22 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-100">Signal drilldown</p>
        <Clock3 className="h-4 w-4 text-slate-500" />
      </div>
      {signal ? (
        <>
          <div className={cn("mt-4 rounded-lg border p-3", getSignalTone(signal))}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{signal.source}</span>
              <span className="font-mono text-xs">{Math.round(signal.confidence * 100)}%</span>
            </div>
            <h3 className="mt-3 text-base font-semibold leading-6 text-white">{signal.title}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-300">{signal.explanation}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <BalanceBar label="Positive" value={sentimentBalance.positive} tone="emerald" />
            <BalanceBar label="Neutral" value={sentimentBalance.neutral} tone="amber" />
            <BalanceBar label="Negative" value={sentimentBalance.negative} tone="rose" />
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
          Signals appear here after a valid company feed loads.
        </p>
      )}
    </aside>
  );
}

function BalanceBar({ label, value, tone }: { label: string; value: number; tone: DirectionTone }) {
  const fill = tone === "emerald" ? "bg-emerald-300" : tone === "rose" ? "bg-rose-300" : "bg-amber-300";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
      <div className="mt-2 font-mono text-xs text-white">{value}%</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: MetricTone }) {
  return (
    <div className={cn("flex min-h-[126px] flex-col rounded-lg border p-4", getMetricToneClasses(tone))}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase leading-tight tracking-[0.2em] opacity-70">{label}</div>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="mt-3 text-xl font-semibold text-white">{value}</div>
      <div className="mt-auto pt-2 text-sm leading-snug text-slate-300">{detail}</div>
    </div>
  );
}

function PeerTicker({
  stocks,
  activeSymbol,
  onSelect,
}: {
  stocks: StockSnapshot[];
  activeSymbol: string;
  onSelect: (symbol: string, name: string) => void;
}) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Peer tape</p>
        <span className="text-xs text-slate-500">{stocks.length} instruments</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {stocks.map((stock) => {
          const isPositive = stock.changePercent !== null && stock.changePercent >= 0;
          return (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => onSelect(stock.symbol, stock.name)}
              className={cn(
                "min-h-[118px] rounded-lg border p-3 text-left transition hover:-translate-y-0.5",
                stock.symbol === activeSymbol
                  ? "border-cyan-300/35 bg-cyan-300/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-cyan-300/25 hover:bg-cyan-300/[0.05]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-semibold text-white">{stock.symbol.replace(".BSE", "")}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">{stock.name}</div>
                </div>
                <span className={cn("shrink-0 text-xs font-semibold", isPositive ? "text-emerald-200" : "text-rose-200")}>
                  {formatPercent(stock.changePercent)}
                </span>
              </div>
              <div className="mt-4 text-lg font-semibold text-white">INR {stock.price?.toFixed(2) ?? "N/A"}</div>
              <div className="mt-1 text-xs text-slate-500">Vol {formatCompactNumber(stock.volume)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SignalConsole({
  signals,
  selectedSignalId,
  signalFilter,
  onSignalFilterChange,
  onSelectSignal,
}: {
  signals: ProcessedSignalItem[];
  selectedSignalId: string | null;
  signalFilter: SignalFilter;
  onSignalFilterChange: (filter: SignalFilter) => void;
  onSelectSignal: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-100">Signal mixer</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{signals.length} filtered signals</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIGNAL_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onSignalFilterChange(filter)}
              className={cn(
                "h-9 rounded-lg border px-3 text-xs font-semibold capitalize transition",
                signalFilter === filter
                  ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-50"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-[430px] space-y-2 overflow-auto pr-1">
        {signals.length ? (
          signals.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSignal(item.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition hover:border-cyan-300/30",
                selectedSignalId === item.id ? "border-cyan-300/45 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.04]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.source}</span>
                <span className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold uppercase", getSignalTone(item))}>
                  {item.sentiment} | {item.impact}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.title}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                </div>
                <span className="font-mono text-xs text-slate-400">{Math.round(item.confidence * 100)}%</span>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
            No signals match the current filter stack.
          </div>
        )}
      </div>
    </section>
  );
}

function CatalystBoard({
  signal,
  sentimentBalance,
  riskScore,
  mentionMeter,
}: {
  signal: ProcessedSignalItem | null;
  sentimentBalance: { positive: number; negative: number; neutral: number };
  riskScore: number;
  mentionMeter: number;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-amber-100">Catalyst board</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{signal?.financialEvent ?? "Waiting for catalyst"}</h3>
        </div>
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100">Risk</div>
          <div className="font-mono text-lg font-semibold text-white">{riskScore}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Meter label="Positive" value={sentimentBalance.positive} tone="emerald" />
        <Meter label="Negative" value={sentimentBalance.negative} tone="rose" />
        <Meter label="Mention heat" value={mentionMeter} tone="cyan" />
      </div>
      <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          Selected catalyst
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {signal?.summary || signal?.explanation || "Select a signal from the mixer to inspect the market driver in detail."}
        </p>
      </div>
    </section>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: DirectionTone | "cyan" }) {
  const fill = tone === "emerald" ? "bg-emerald-300" : tone === "rose" ? "bg-rose-300" : tone === "cyan" ? "bg-cyan-300" : "bg-amber-300";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-white">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function NoMatchState({
  query,
  message,
  suggestions,
  onSelect,
}: {
  query: string;
  message: string;
  suggestions: ReturnType<typeof searchCompanies>;
  onSelect: (symbol: string, name: string) => void;
}) {
  return (
    <section className="rounded-lg border border-rose-300/25 bg-rose-400/[0.08] p-5 shadow-[0_22px_70px_rgba(127,29,29,0.16)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-100">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">No stock loaded for this lookup</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-rose-50/80">
            {message} Current input: <span className="font-mono text-white">{query || "empty"}</span>
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-slate-300">Supported watchlist only</div>
      </div>
      {suggestions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((company) => (
            <button
              key={company.symbol}
              type="button"
              onClick={() => onSelect(company.symbol, company.name)}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100"
            >
              {company.name}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LoadingCard() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-slate-400 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
        Loading market cockpit
      </div>
    </div>
  );
}
