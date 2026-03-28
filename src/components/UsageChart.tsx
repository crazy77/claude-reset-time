"use client";

import { useMemo } from "react";
import type { UsageHistoryEntry, WindowUsage } from "@/lib/types";
import { getWindowStart } from "@/lib/resetTimes";
import { useDict } from "@/i18n/context";

const WINDOW_MS = 5 * 60 * 60 * 1000;

interface UsageChartProps {
  history: UsageHistoryEntry[];
  windowUsageData: WindowUsage[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function UsageChart({ history, windowUsageData }: UsageChartProps) {
  const dict = useDict();
  const locale = dict.locale;

  const chartData = useMemo(() => {
    const now = new Date();
    const currentWs = getWindowStart(now).getTime();
    const buckets = [];

    const tokenMap = new Map<number, WindowUsage>();
    for (const w of windowUsageData) {
      tokenMap.set(w.windowStart, w);
    }

    const pctMap = new Map<number, { fiveHour: number | null; sevenDay: number | null }>();
    for (const entry of history) {
      const ws = getWindowStart(new Date(entry.ts * 1000)).getTime();
      const existing = pctMap.get(ws);
      const fh = entry.rate_limits?.five_hour?.used_percentage ?? null;
      const sd = entry.rate_limits?.seven_day?.used_percentage ?? null;
      pctMap.set(ws, {
        fiveHour: fh !== null ? Math.max(fh, existing?.fiveHour ?? 0) : existing?.fiveHour ?? null,
        sevenDay: sd !== null ? Math.max(sd, existing?.sevenDay ?? 0) : existing?.sevenDay ?? null,
      });
    }

    for (let i = 9; i >= 0; i--) {
      const ws = currentWs - i * WINDOW_MS;
      const start = new Date(ws);
      const hour = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
      const tokens = tokenMap.get(ws);
      const pct = pctMap.get(ws);

      buckets.push({
        windowStart: ws,
        hour,
        isCurrent: i === 0,
        inputTokens: tokens?.inputTokens ?? 0,
        outputTokens: tokens?.outputTokens ?? 0,
        messageCount: tokens?.messageCount ?? 0,
        fiveHourPct: pct?.fiveHour ?? null,
        sevenDayPct: pct?.sevenDay ?? null,
      });
    }

    return buckets;
  }, [history, windowUsageData, locale]);

  const maxTokens = chartData.reduce((max, b) => Math.max(max, b.inputTokens + b.outputTokens), 0);

  const hasAnyData = chartData.some((b) => b.inputTokens > 0 || b.fiveHourPct !== null);

  if (!hasAnyData) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5 md:p-6">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          {dict.chart.title}
        </h3>
        <div className="flex items-center justify-center h-32 text-text-dim text-sm">
          {dict.chart.empty}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          {dict.chart.title}
        </h3>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent/70 inline-block" />
            <span className="text-text-secondary">{dict.chart.input}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/70 inline-block" />
            <span className="text-text-secondary">{dict.chart.output}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            <span className="text-text-secondary">{dict.chart.usageRate}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-40 flex items-end gap-1">
        {chartData.map((bucket, idx) => {
          const totalTokens = bucket.inputTokens + bucket.outputTokens;
          const tokenHeight = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-stretch relative group" style={{ height: "100%" }}>
              {bucket.fiveHourPct !== null && (
                <div
                  className="absolute w-2 h-2 rounded-full bg-primary left-1/2 -translate-x-1/2 z-10 ring-1 ring-primary/30"
                  style={{ bottom: `${bucket.fiveHourPct}%` }}
                />
              )}

              <div className="flex-1 flex flex-col justify-end">
                <div
                  className={`rounded-t-sm overflow-hidden transition-all duration-500 ${
                    bucket.isCurrent ? "ring-1 ring-primary/40" : ""
                  }`}
                  style={{ height: `${tokenHeight}%`, minHeight: totalTokens > 0 ? "4px" : "0" }}
                >
                  <div className="h-full flex flex-col justify-end">
                    <div
                      className="bg-accent/60 hover:bg-accent/80 transition-colors"
                      style={{ height: maxTokens > 0 ? `${(bucket.inputTokens / (totalTokens || 1)) * 100}%` : "0%" }}
                    />
                    <div
                      className="bg-teal-500/60 hover:bg-teal-500/80 transition-colors"
                      style={{ height: maxTokens > 0 ? `${(bucket.outputTokens / (totalTokens || 1)) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Tooltip */}
              {(totalTokens > 0 || bucket.fiveHourPct !== null) && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                  <div className="bg-surface-light border border-border rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-xl">
                    <p className="text-text-secondary mb-0.5 font-medium">{bucket.hour}</p>
                    {totalTokens > 0 && (
                      <>
                        <p className="text-accent">{dict.chart.input}: {formatTokens(bucket.inputTokens)}</p>
                        <p className="text-teal-400">{dict.chart.output}: {formatTokens(bucket.outputTokens)}</p>
                        <p className="text-text-dim">{bucket.messageCount}msg</p>
                      </>
                    )}
                    {bucket.fiveHourPct !== null && (
                      <p className="text-primary-light">{dict.chart.usageRate}: {Math.round(bucket.fiveHourPct)}%</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* X axis */}
      <div className="flex justify-between mt-1.5">
        {chartData.map((bucket, idx) => (
          <span
            key={idx}
            className={`text-[8px] flex-1 text-center ${
              bucket.isCurrent ? "text-primary-light font-medium" : "text-text-dim"
            }`}
          >
            {bucket.hour}
          </span>
        ))}
      </div>
    </div>
  );
}
