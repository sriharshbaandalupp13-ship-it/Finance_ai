"use client";

import type { AlertItem, PredictionSnapshot, ProcessedSignalItem, SentimentSnapshot, TrendingCompany } from "@/data/contracts";

export function InsightPanels({ prediction, sentiment, whyMoving, alerts, trending, items }: {
  prediction: PredictionSnapshot;
  sentiment: SentimentSnapshot;
  whyMoving: string;
  alerts: AlertItem[];
  trending: TrendingCompany[];
  items: ProcessedSignalItem[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
        <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">AI prediction engine</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">{prediction.direction}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{prediction.explanation}</p>
          </div>
          <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            Confidence {Math.round(prediction.confidence * 100)}%
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Sentiment Score" value={`${sentiment.score}/100`} />
          <StatCard label="Trend Delta" value={sentiment.trend.toFixed(1)} />
          <StatCard label="Mentions" value={`${sentiment.mentionVolume}`} />
        </div>
        <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
          <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/80">Why is this stock moving?</div>
          <div className="mt-2">{whyMoving}</div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.source}</span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.sentiment === "positive" ? "bg-emerald-400/15 text-emerald-200" : item.sentiment === "negative" ? "bg-rose-400/15 text-rose-200" : "bg-amber-300/15 text-amber-100"}`}>{item.sentiment}</span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-white">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-300">
                <span>{item.financialEvent}</span>
                <span>{item.impact} impact</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="grid gap-5">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.length ? alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-rose-200">{alert.severity}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{alert.detail}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No sudden spikes detected right now.</p>}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Trending companies</p>
          <div className="mt-4 space-y-3">
            {trending.map((company) => (
              <div key={company.symbol} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">{company.symbol}</div>
                  <div className="text-xs text-slate-400">{company.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-cyan-200">Buzz {company.buzzScore}</div>
                  <div className="text-xs text-slate-400">{company.mentionVolume} mentions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
