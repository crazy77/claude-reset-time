"use client";

import { useMemo } from "react";
import {
  getResetsForDate,
  formatTime,
  isSameDay,
  getWindowStart,
} from "@/lib/resetTimes";
import type { WindowUsage } from "@/lib/types";
import { useDict } from "@/i18n/context";

interface MonthViewProps {
  year: number;
  month: number;
  now: Date;
  windowUsageData: WindowUsage[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function MonthView({ year, month, now, windowUsageData }: MonthViewProps) {
  const dict = useDict();
  const locale = dict.locale;
  const DAY_HEADERS = dict.calendar.days;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (null | { date: Date; resets: Date[] })[] = [];

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, resets: getResetsForDate(date) });
    }
    return days;
  }, [year, month]);

  const currentWindowStart = getWindowStart(now);

  const tokenMap = useMemo(() => {
    const map = new Map<number, WindowUsage>();
    for (const w of windowUsageData) map.set(w.windowStart, w);
    return map;
  }, [windowUsageData]);

  const dayTokens = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of windowUsageData) {
      const d = new Date(w.windowStart);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + w.inputTokens + w.outputTokens);
    }
    return map;
  }, [windowUsageData]);

  const maxDayTokens = useMemo(() => {
    let max = 0;
    for (const v of dayTokens.values()) max = Math.max(max, v);
    return max;
  }, [dayTokens]);

  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_HEADERS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-text-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="min-h-[80px] md:min-h-[100px] border-b border-r border-border/50 bg-surface/50" />;
          }

          const isToday = isSameDay(day.date, now);
          const isPast = day.date.getTime() < now.getTime() && !isToday;
          const hasCurrentWindow = day.resets.some(
            (r) => r.getTime() === currentWindowStart.getTime()
          );

          const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
          const dayTotal = dayTokens.get(dayKey) ?? 0;
          const dayBarWidth = maxDayTokens > 0 ? (dayTotal / maxDayTokens) * 100 : 0;

          return (
            <div
              key={idx}
              className={`min-h-[80px] md:min-h-[100px] border-b border-r border-border/50 p-1.5 transition-colors ${
                isToday
                  ? "bg-window-current"
                  : hasCurrentWindow
                    ? "bg-primary/5"
                    : isPast
                      ? "bg-window-past/30"
                      : ""
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-white"
                      : isPast
                        ? "text-text-dim"
                        : "text-text-secondary"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {dayTotal > 0 && (
                  <span className="text-[8px] text-text-dim font-mono">{formatTokens(dayTotal)}</span>
                )}
              </div>

              {/* Reset times */}
              <div className="flex flex-wrap gap-0.5">
                {day.resets.map((reset, ri) => {
                  const isCurrentReset = reset.getTime() === currentWindowStart.getTime();
                  const resetIsPast = reset.getTime() < now.getTime() && !isCurrentReset;
                  const tokens = tokenMap.get(reset.getTime());

                  return (
                    <span
                      key={ri}
                      className={`text-[10px] md:text-xs font-mono px-1 py-0.5 rounded ${
                        isCurrentReset
                          ? "bg-primary text-white font-semibold"
                          : resetIsPast && tokens
                            ? "bg-accent/15 text-accent"
                            : resetIsPast
                              ? "text-text-dim/60"
                              : "text-text-secondary"
                      }`}
                      title={tokens ? `${formatTime(reset, locale)} | ${dict.chart.input}: ${formatTokens(tokens.inputTokens)} ${dict.chart.output}: ${formatTokens(tokens.outputTokens)} | ${tokens.messageCount}msg` : formatTime(reset, locale)}
                    >
                      {reset.getHours().toString().padStart(2, "0")}
                    </span>
                  );
                })}
              </div>

              {/* Day token bar */}
              {dayTotal > 0 && (
                <div className="mt-1 h-1 bg-surface-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/50 rounded-full transition-all"
                    style={{ width: `${dayBarWidth}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
