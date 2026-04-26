"use client";

import type { AlertItem, PredictionSnapshot, ProcessedSignalItem, SentimentSnapshot, TrendingCompany } from "@/data/contracts";
import { formatSignedRupees } from "@/utils/format";

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
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.35em] text-sky-600">AI prediction engine</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-950">{prediction.direction}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{prediction.explanation}</p>
          </div>
          <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
            Confidence {Math.round(prediction.confidence * 100)}%
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Sentiment Score" value={`${sentiment.score}/100`} />
          <StatCard label="Trend Delta" value={sentiment.trend.toFixed(1)} />
          <StatCard label="Tomorrow Move" value={formatSignedRupees(prediction.priceChange)} />
        </div>
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-700">Why is this stock moving?</div>
          <div className="mt-2">{whyMoving}</div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.source}</span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.sentiment === "positive" ? "bg-emerald-100 text-emerald-700" : item.sentiment === "negative" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.sentiment}
                </span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-slate-950">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.28em] text-sky-600">
                <span>{item.financialEvent}</span>
                <span>{item.impact} impact</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-600">Alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-950">{alert.title}</h4>
                    <span className="text-[11px] uppercase tracking-[0.3em] text-rose-700">{alert.severity}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{alert.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No sudden spikes detected right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-600">Trending companies</p>
          <div className="mt-4 space-y-3">
            {trending.map((company) => (
              <div key={company.symbol} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{company.symbol}</div>
                  <div className="text-xs text-slate-500">{company.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-sky-700">Buzz {company.buzzScore}</div>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
