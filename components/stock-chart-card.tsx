"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, Crosshair, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PredictionSnapshot, StockSnapshot } from "@/data/contracts";
import { cn } from "@/utils/cn";
import { formatCompactNumber, formatCurrency, formatPercent, formatSignedRupees } from "@/utils/format";

interface StockChartCardProps {
  stock: StockSnapshot;
  prediction?: PredictionSnapshot;
}

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "1M", days: 31 },
] as const;

type ChartRange = (typeof RANGE_OPTIONS)[number]["label"];

export function StockChartCard({ stock, prediction }: StockChartCardProps) {
  const [range, setRange] = useState<ChartRange>("1M");
  const isUp = prediction?.direction === "UP";
  const isDown = prediction?.direction === "DOWN";
  const stroke = isDown ? "#fb7185" : isUp ? "#86efac" : "#fbbf24";
  const fillId = `fill-${stock.symbol.replace(/[^A-Z0-9]/gi, "")}`;
  const activeRange = RANGE_OPTIONS.find((option) => option.label === range) ?? RANGE_OPTIONS[2];
  const chartData = useMemo(() => stock.history.slice(-activeRange.days), [activeRange.days, stock.history]);
  const priceDomain = useMemo(() => {
    const values = chartData.map((point) => point.close).filter((value) => Number.isFinite(value));
    if (prediction) values.push(prediction.priceTarget);
    if (!values.length) return [0, 1] as [number, number];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.18, max * 0.015);
    return [Math.floor(min - padding), Math.ceil(max + padding)] as [number, number];
  }, [chartData, prediction]);

  return (
    <section className="rounded-lg border border-white/10 bg-[#081118]/86 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">Price cockpit</p>
          <h3 className="mt-2 truncate text-xl font-semibold text-white">
            {stock.name} <span className="font-mono text-sm text-slate-500">{stock.symbol}</span>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setRange(option.label)}
              className={cn(
                "h-9 rounded-lg border px-3 font-mono text-xs font-semibold transition",
                range === option.label ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white",
              )}
              title={`Show ${option.label} range`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric icon={LineChart} label="Last price" value={formatCurrency(stock.price, stock.currency)} tone={stock.changePercent !== null && stock.changePercent >= 0 ? "emerald" : "rose"} />
        <Metric icon={BarChart3} label="Volume" value={formatCompactNumber(stock.volume)} tone="slate" />
        <Metric icon={Activity} label="SMA 5" value={formatCurrency(stock.sma5, stock.currency)} tone="cyan" />
        <Metric icon={isDown ? TrendingDown : TrendingUp} label="Momentum" value={formatPercent(stock.momentum)} tone={stock.momentum !== null && stock.momentum >= 0 ? "emerald" : "rose"} />
      </div>

      {prediction ? (
        <div
          className={cn(
            "mt-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto]",
            isUp ? "border-emerald-300/24 bg-emerald-300/[0.07]" : isDown ? "border-rose-300/24 bg-rose-300/[0.07]" : "border-amber-300/24 bg-amber-300/[0.07]",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-black/18", isUp ? "border-emerald-300/35 text-emerald-200" : isDown ? "border-rose-300/35 text-rose-200" : "border-amber-300/35 text-amber-200")}>
              <Crosshair className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Target overlay</p>
              <p className={cn("truncate text-sm font-semibold", isUp ? "text-emerald-100" : isDown ? "text-rose-100" : "text-amber-100")}>
                INR {prediction.priceTarget.toFixed(2)}
                <span className="ml-2 font-normal text-slate-400">{formatSignedRupees(prediction.priceChange)}</span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Confidence</p>
            <p className="text-lg font-semibold text-white">{Math.round(prediction.confidence * 100)}%</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 h-[340px] rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(5,13,18,0.9),rgba(12,20,27,0.9))] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.38} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#8fa3b8", fontSize: 11 }}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#8fa3b8", fontSize: 11 }}
              width={72}
              domain={priceDomain}
              tickFormatter={(value: number) => (value >= 1000 ? `INR ${(value / 1000).toFixed(1)}K` : `INR ${value.toFixed(0)}`)}
            />
            {prediction ? (
              <ReferenceLine
                y={prediction.priceTarget}
                stroke={stroke}
                strokeDasharray="6 6"
                label={{ value: "Target", fill: stroke, fontSize: 11, position: "insideTopRight" }}
              />
            ) : null}
            <Tooltip
              contentStyle={{ backgroundColor: "#071018", border: "1px solid rgba(103,232,249,0.22)", borderRadius: 8, color: "#e9eef5" }}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return [`INR ${numericValue.toFixed(2)}`, "Price"];
              }}
              labelFormatter={(label) => {
                const rawLabel = typeof label === "string" ? label : String(label ?? "");
                return new Date(rawLabel).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              }}
            />
            <Area type="monotone" dataKey="close" stroke={stroke} fill={`url(#${fillId})`} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: stroke, stroke: "#050d12", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof LineChart;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "rose" | "slate";
}) {
  const tones = {
    cyan: "border-cyan-300/18 bg-cyan-300/[0.06]",
    emerald: "border-emerald-300/18 bg-emerald-300/[0.06]",
    rose: "border-rose-300/18 bg-rose-300/[0.06]",
    slate: "border-white/10 bg-white/[0.04]",
  } as const;

  return (
    <div className={cn("min-h-[98px] rounded-lg border p-3", tones[tone])}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
