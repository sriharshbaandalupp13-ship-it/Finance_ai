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
  const stroke = isDown ? "#fb7185" : isUp ? "#34d399" : "#fbbf24";
  const fillId = `fill-${stock.symbol.replace(/[^A-Z0-9]/gi, "")}`;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Stock dashboard</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {stock.name} ({stock.symbol})
          </h3>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
          <div className="text-2xl font-semibold text-white">{formatCurrency(stock.price, stock.currency)}</div>
          <div className={`text-sm ${stock.changePercent !== null && stock.changePercent >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
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
          className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
            isUp
              ? "border-emerald-300/24 bg-emerald-300/[0.07]"
              : isDown
                ? "border-rose-300/24 bg-rose-300/[0.07]"
                : "border-amber-300/24 bg-amber-300/[0.07]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-lg border text-xl font-black leading-none ${isUp ? "border-emerald-300/35 text-emerald-200" : isDown ? "border-rose-300/35 text-rose-200" : "border-amber-300/35 text-amber-200"}`}>
              {isUp ? "^" : isDown ? "v" : "="}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">AI Prediction | Tomorrow</p>
              <p className={`text-sm font-semibold ${isUp ? "text-emerald-100" : isDown ? "text-rose-100" : "text-amber-100"}`}>
                {isUp ? "Bullish" : isDown ? "Bearish" : "Neutral"}
                <span className="ml-1.5 font-normal text-slate-400">| {Math.round(prediction.confidence * 100)}% confidence</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Target price</p>
            <p className={`text-lg font-black ${isUp ? "text-emerald-100" : isDown ? "text-rose-100" : "text-amber-100"}`}>
              INR {prediction.priceTarget.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${prediction.priceChange >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {formatSignedRupees(prediction.priceChange)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 h-72 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.72),rgba(15,23,42,0.86))] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stock.history} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.42} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
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
              tickFormatter={(value: number) => (value >= 1000 ? `INR ${(value / 1000).toFixed(1)}K` : `INR ${value.toFixed(0)}`)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#0b1220", border: "1px solid rgba(34,211,238,0.22)", borderRadius: 12, color: "#e2e8f0" }}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return [`INR ${numericValue.toFixed(2)}`, "Price"];
              }}
              labelFormatter={(label) => {
                const rawLabel = typeof label === "string" ? label : String(label ?? "");
                return new Date(rawLabel).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              }}
            />
            <Area type="monotone" dataKey="close" stroke={stroke} fill={`url(#${fillId})`} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: stroke, stroke: "#0f172a", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
