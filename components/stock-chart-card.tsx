"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PredictionSnapshot, StockSnapshot } from "@/data/contracts";
import { formatCompactNumber, formatCurrency, formatPercent } from "@/utils/format";

interface StockChartCardProps {
  stock: StockSnapshot;
  prediction?: PredictionSnapshot;
}

export function StockChartCard({ stock, prediction }: StockChartCardProps) {
  const isUp   = prediction?.direction === "UP";
  const isDown = prediction?.direction === "DOWN";

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Stock dashboard</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{stock.name} ({stock.symbol})</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-white">{formatCurrency(stock.price, stock.currency)}</div>
          <div className={`text-sm ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPercent(stock.changePercent)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Volume"   value={formatCompactNumber(stock.volume)} />
        <Metric label="SMA 5"    value={formatCurrency(stock.sma5, stock.currency)} />
        <Metric label="Momentum" value={formatPercent(stock.momentum)} />
      </div>

      {/* ── Tomorrow's target strip ───────────────────────────────────── */}
      {prediction && (
        <div className={`mt-4 flex items-center justify-between rounded-2xl border px-4 py-3 ${
          isUp   ? "border-emerald-400/20 bg-emerald-400/8"
          : isDown ? "border-rose-400/20 bg-rose-400/8"
          : "border-amber-400/20 bg-amber-400/8"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-black leading-none ${isUp ? "text-emerald-300" : isDown ? "text-rose-300" : "text-amber-200"}`}>
              {isUp ? "↑" : isDown ? "↓" : "→"}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">AI Prediction · Tomorrow</p>
              <p className={`text-sm font-semibold ${isUp ? "text-emerald-200" : isDown ? "text-rose-200" : "text-amber-100"}`}>
                {isUp ? "Bullish" : isDown ? "Bearish" : "Neutral"}
                <span className="ml-1.5 font-normal text-slate-400">· {Math.round(prediction.confidence * 100)}% confidence</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Target price</p>
            <p className={`text-lg font-black ${isUp ? "text-emerald-300" : isDown ? "text-rose-300" : "text-amber-200"}`}>
              ₹{prediction.priceTarget.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${prediction.priceChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {prediction.priceChange >= 0 ? "+" : ""}₹{Math.abs(prediction.priceChange).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 h-72 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stock.history} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(value: string) => {
                const d = new Date(value);
                return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              width={72}
              domain={[
                (dataMin: number) => Math.floor(dataMin * 0.98),
                (dataMax: number) => Math.ceil(dataMax * 1.02),
              ]}
              tickFormatter={(value: number) =>
                value >= 1000
                  ? `₹${(value / 1000).toFixed(1)}K`
                  : `₹${value.toFixed(0)}`
              }
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: 16 }}
              formatter={(value: number) => [`₹${value.toFixed(2)}`, "Price"]}
              labelFormatter={(label: string) => new Date(label).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            />
            <Area type="monotone" dataKey="close" stroke="#22d3ee" fill={`url(#fill-${stock.symbol})`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
