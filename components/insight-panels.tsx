"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Flame,
  ListFilter,
  Newspaper,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { AlertItem, PredictionSnapshot, ProcessedSignalItem, SentimentSnapshot, TrendingCompany } from "@/data/contracts";
import { cn } from "@/utils/cn";
import { formatSignedRupees } from "@/utils/format";

type FeedView = "all" | "positive" | "neutral" | "negative" | "high";
type FeedSort = "latest" | "impact" | "confidence";

const FILTERS: FeedView[] = ["all", "positive", "neutral", "negative", "high"];
const IMPACT_WEIGHT: Record<ProcessedSignalItem["impact"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function InsightPanels({
  prediction,
  sentiment,
  whyMoving,
  alerts,
  trending,
  items,
}: {
  prediction: PredictionSnapshot;
  sentiment: SentimentSnapshot;
  whyMoving: string;
  alerts: AlertItem[];
  trending: TrendingCompany[];
  items: ProcessedSignalItem[];
}) {
  const [feedView, setFeedView] = useState<FeedView>("all");
  const [feedSort, setFeedSort] = useState<FeedSort>("impact");
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (feedView === "all") return true;
      if (feedView === "high") return item.impact === "high";
      return item.sentiment === feedView;
    });

    if (feedSort === "confidence") return [...filtered].sort((left, right) => right.confidence - left.confidence);
    if (feedSort === "latest") return [...filtered].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
    return [...filtered].sort((left, right) => IMPACT_WEIGHT[right.impact] - IMPACT_WEIGHT[left.impact] || right.confidence - left.confidence);
  }, [feedSort, feedView, items]);

  const expandedItem = filteredItems.find((item) => item.id === expandedId) ?? filteredItems[0] ?? null;
  const positiveShare = sentiment.mentionVolume ? Math.round((sentiment.positiveCount / sentiment.mentionVolume) * 100) : 0;
  const negativeShare = sentiment.mentionVolume ? Math.round((sentiment.negativeCount / sentiment.mentionVolume) * 100) : 0;
  const neutralShare = sentiment.mentionVolume ? Math.max(0, 100 - positiveShare - negativeShare) : 0;
  const isUp = prediction.direction === "UP";
  const isDown = prediction.direction === "DOWN";
  const DirectionIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Radio;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">
      <section className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">AI prediction engine</p>
            <div className="mt-3 flex items-center gap-3">
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-black/18", isUp ? "border-emerald-300/35 text-emerald-200" : isDown ? "border-rose-300/35 text-rose-200" : "border-amber-300/35 text-amber-200")}>
                <DirectionIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-2xl font-semibold text-white">{prediction.direction}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{Math.round(prediction.confidence * 100)}% confidence</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{prediction.explanation}</p>
          </div>
          <div className={cn("rounded-lg border px-4 py-3 text-right", prediction.priceChange >= 0 ? "border-emerald-300/18 bg-emerald-300/[0.07]" : "border-rose-300/18 bg-rose-300/[0.07]")}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Tomorrow move</div>
            <div className="mt-1 text-xl font-semibold text-white">{formatSignedRupees(prediction.priceChange)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard icon={BrainCircuit} label="Sentiment score" value={`${sentiment.score}/100`} tone="cyan" />
          <StatCard icon={Radio} label="Trend delta" value={sentiment.trend.toFixed(1)} tone="amber" />
          <StatCard icon={Flame} label="High impact" value={String(sentiment.highImpactCount)} tone={sentiment.highImpactCount ? "rose" : "slate"} />
        </div>

        <div className="mt-5 rounded-lg border border-emerald-300/18 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-50">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-emerald-200">
            <Sparkles className="h-4 w-4" />
            Why it is moving
          </div>
          <div className="mt-3 text-slate-200">{whyMoving}</div>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/18 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Sentiment balance</p>
              <p className="mt-1 text-sm text-slate-300">{positiveShare}% positive | {neutralShare}% neutral | {negativeShare}% negative</p>
            </div>
            <div className="flex h-3 min-w-[220px] flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-300" style={{ width: `${positiveShare}%` }} />
              <div className="h-full bg-amber-300" style={{ width: `${neutralShare}%` }} />
              <div className="h-full bg-rose-300" style={{ width: `${negativeShare}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setFeedView(view)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs font-semibold capitalize transition",
                  feedView === view ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white",
                )}
              >
                {view}
              </button>
            ))}
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-400">
            <ListFilter className="h-4 w-4" />
            <select
              value={feedSort}
              onChange={(event) => setFeedSort(event.target.value as FeedSort)}
              className="bg-transparent text-slate-200 outline-none"
            >
              <option value="impact">Impact</option>
              <option value="confidence">Confidence</option>
              <option value="latest">Latest</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.82fr)_minmax(280px,0.58fr)]">
          <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {filteredItems.slice(0, 12).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExpandedId(item.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition hover:border-cyan-300/25",
                  expandedItem?.id === item.id ? "border-cyan-300/40 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.04]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs uppercase tracking-[0.22em] text-slate-500">{item.source}</span>
                  <span className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold uppercase", getSignalTone(item))}>
                    {item.sentiment} | {item.impact}
                  </span>
                </div>
                <h4 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.title}</h4>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-lg border border-white/10 bg-black/22 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100">
              <Newspaper className="h-4 w-4" />
              Story detail
            </div>
            {expandedItem ? (
              <>
                <h4 className="mt-4 text-base font-semibold leading-6 text-white">{expandedItem.title}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{expandedItem.explanation}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniStat label="Event" value={expandedItem.financialEvent} />
                  <MiniStat label="Confidence" value={`${Math.round(expandedItem.confidence * 100)}%`} />
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">No stories match the active filter.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-rose-100">Alerts</p>
            <Bell className="h-4 w-4 text-rose-200" />
          </div>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-rose-200">{alert.severity}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{alert.detail}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">No sudden spikes detected right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">Trending companies</p>
            <Flame className="h-4 w-4 text-amber-200" />
          </div>
          <div className="mt-4 space-y-3">
            {trending.map((company) => (
              <div key={company.symbol} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-emerald-300/25 hover:bg-emerald-300/[0.05]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold text-white">{company.symbol}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{company.name}</div>
                  </div>
                  <div className={cn("text-right text-xs font-semibold", company.sentiment === "positive" ? "text-emerald-200" : company.sentiment === "negative" ? "text-rose-200" : "text-amber-200")}>
                    {company.sentiment}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, company.buzzScore)}%` }} />
                  </div>
                  <span className="font-mono text-xs text-slate-400">{company.mentionVolume}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function getSignalTone(item: ProcessedSignalItem) {
  if (item.sentiment === "positive") return "border-emerald-300/22 bg-emerald-300/[0.06] text-emerald-100";
  if (item.sentiment === "negative") return "border-rose-300/22 bg-rose-300/[0.06] text-rose-100";
  return "border-amber-300/22 bg-amber-300/[0.06] text-amber-100";
}

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: "cyan" | "amber" | "rose" | "slate" }) {
  const tones = {
    cyan: "border-cyan-300/18 bg-cyan-300/[0.06]",
    amber: "border-amber-300/18 bg-amber-300/[0.06]",
    rose: "border-rose-300/18 bg-rose-300/[0.06]",
    slate: "border-white/10 bg-white/[0.04]",
  } as const;

  return (
    <div className={cn("rounded-lg border p-4", tones[tone])}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white">{value}</div>
    </div>
  );
}
