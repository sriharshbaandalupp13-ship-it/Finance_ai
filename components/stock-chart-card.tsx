"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PredictionSnapshot, StockSnapshot } from "@/data/contracts";
import { formatCompactNumber, formatCurrency, formatPercent, formatSignedRupees } from "@/utils/format";

interface StockChartCardProps {
  stock: StockSnapshot;
  prediction?: PredictionSnapshot;
}

export function StockChartCard({ stock, prediction }: StockChartCardProps) {
  const isUp = prediction?.direction === "UP";
  const isDown = prediction?.direction === "DOWN";

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-600">Stock dashboard</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {stock.name} ({stock.symbol})
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-slate-950">{formatCurrency(stock.price, stock.currency)}</div>
          <div className={`text-sm ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatPercent(stock.changePercent)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Volume" value={formatCompactNumber(stock.volume)} />
        <Metric label="SMA 5" value={formatCurrency(stock.sma5, stock.currency)} />
        <Metric label="Momentum" value={formatPercent(stock.momentum)} />
      </div>

      {prediction && (
        <div
          className={`mt-4 flex items-center justify-between rounded-2xl border px-4 py-3 ${
            isUp
              ? "border-emerald-200 bg-emerald-50"
              : isDown
                ? "border-rose-200 bg-rose-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-black leading-none ${isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-amber-600"}`}>
              {isUp ? "↑" : isDown ? "↓" : "→"}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">AI Prediction · Tomorrow</p>
              <p className={`text-sm font-semibold ${isUp ? "text-emerald-700" : isDown ? "text-rose-700" : "text-amber-700"}`}>
                {isUp ? "Bullish" : isDown ? "Bearish" : "Neutral"}
                <span className="ml-1.5 font-normal text-slate-500">· {Math.round(prediction.confidence * 100)}% confidence</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Target price</p>
            <p className={`text-lg font-black ${isUp ? "text-emerald-700" : isDown ? "text-rose-700" : "text-amber-700"}`}>
              ₹{prediction.priceTarget.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${prediction.priceChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatSignedRupees(prediction.priceChange)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 h-72 rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95))] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stock.history} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              width={72}
              domain={[
                (dataMin: number) => Math.floor(dataMin * 0.98),
                (dataMax: number) => Math.ceil(dataMax * 1.02),
              ]}
              tickFormatter={(value: number) => (value >= 1000 ? `₹${(value / 1000).toFixed(1)}K` : `₹${value.toFixed(0)}`)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #dbeafe", borderRadius: 16, color: "#0f172a" }}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return [`₹${numericValue.toFixed(2)}`, "Price"];
              }}
              labelFormatter={(label) => {
                const rawLabel = typeof label === "string" ? label : String(label ?? "");
                return new Date(rawLabel).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              }}
            />
            <Area type="monotone" dataKey="close" stroke="#0ea5e9" fill={`url(#fill-${stock.symbol})`} strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
