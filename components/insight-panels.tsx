"use client";

import { useMemo, useState } from "react";
import type { AlertItem, PredictionSnapshot, ProcessedSignalItem, SentimentSnapshot, TrendingCompany } from "@/data/contracts";
import { formatSignedRupees } from "@/utils/format";

type FeedView = "all" | "positive" | "negative" | "high";

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
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (feedView === "all") return true;
      if (feedView === "high") return item.impact === "high";
      return item.sentiment === feedView;
    });
  }, [feedView, items]);
  const positiveShare = sentiment.mentionVolume ? Math.round((sentiment.positiveCount / sentiment.mentionVolume) * 100) : 0;
  const negativeShare = sentiment.mentionVolume ? Math.round((sentiment.negativeCount / sentiment.mentionVolume) * 100) : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">AI prediction engine</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{prediction.direction}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{prediction.explanation}</p>
          </div>
          <div className="rounded-lg border border-cyan-300/18 bg-cyan-300/[0.06] px-4 py-2 text-sm font-semibold text-cyan-100">
            Confidence {Math.round(prediction.confidence * 100)}%
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Sentiment Score" value={`${sentiment.score}/100`} tone="cyan" />
          <StatCard label="Trend Delta" value={sentiment.trend.toFixed(1)} tone="violet" />
          <StatCard label="Tomorrow Move" value={formatSignedRupees(prediction.priceChange)} tone={prediction.priceChange >= 0 ? "emerald" : "rose"} />
        </div>

        <div className="mt-5 rounded-xl border border-emerald-300/18 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-50">
          <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">Why is this stock moving?</div>
          <div className="mt-2 text-slate-200">{whyMoving}</div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/18 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Sentiment balance</p>
              <p className="mt-1 text-sm text-slate-300">{positiveShare}% positive | {negativeShare}% negative</p>
            </div>
            <div className="h-3 min-w-[220px] flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[linear-gradient(90deg,#34d399,#22d3ee,#fb7185)]" style={{ width: `${Math.min(100, Math.max(8, positiveShare + negativeShare))}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["all", "positive", "negative", "high"] as FeedView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setFeedView(view)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                feedView === view ? "border-cyan-300 bg-cyan-300/14 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredItems.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.source}</span>
                <span className={`rounded-md px-3 py-1 text-[11px] font-semibold ${item.sentiment === "positive" ? "bg-emerald-300/12 text-emerald-100" : item.sentiment === "negative" ? "bg-rose-300/12 text-rose-100" : "bg-amber-300/12 text-amber-100"}`}>
                  {item.sentiment}
                </span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-white">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                <span>{item.financialEvent}</span>
                <span>{item.impact} impact</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.3em] text-rose-200">Alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-rose-200">{alert.severity}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{alert.detail}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">No sudden spikes detected right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Trending companies</p>
          <div className="mt-4 space-y-3">
            {trending.map((company) => (
              <div key={company.symbol} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-emerald-300/25 hover:bg-emerald-300/[0.05]">
                <div>
                  <div className="text-sm font-semibold text-white">{company.symbol}</div>
                  <div className="text-xs text-slate-400">{company.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-cyan-100">Buzz {company.buzzScore}</div>
                  <div className="text-xs text-slate-500">{company.mentionVolume} mentions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "cyan" | "violet" | "emerald" | "rose" }) {
  const tones = {
    cyan: "border-cyan-300/18 bg-cyan-300/[0.06]",
    violet: "border-violet-300/18 bg-violet-300/[0.06]",
    emerald: "border-emerald-300/18 bg-emerald-300/[0.06]",
    rose: "border-rose-300/18 bg-rose-300/[0.06]",
  } as const;

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
