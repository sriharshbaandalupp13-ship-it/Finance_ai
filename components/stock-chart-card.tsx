"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StockSnapshot } from "@/data/contracts";
import { formatCompactNumber, formatCurrency, formatPercent } from "@/utils/format";

export function StockChartCard({ stock }: { stock: StockSnapshot }) {
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
        <Metric label="Volume" value={formatCompactNumber(stock.volume)} />
        <Metric label="SMA 5" value={formatCurrency(stock.sma5, stock.currency)} />
        <Metric label="Momentum" value={formatPercent(stock.momentum)} />
      </div>
      <div className="mt-5 h-72 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stock.history}>
            <defs>
              <linearGradient id={`fill-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: 16 }} />
            <Area type="monotone" dataKey="close" stroke="#22d3ee" fill={`url(#fill-${stock.symbol})`} strokeWidth={2} />
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
