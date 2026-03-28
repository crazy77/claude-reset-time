"use client";

import { useMemo } from "react";
import {
  getResetsForDate,
  formatTime,
  isSameDay,
  getWindowStart,
  getWindowProgress,
} from "@/lib/resetTimes";
import type { UsageCurrent, WindowUsage } from "@/lib/types";

interface WeekViewProps {
  weekStart: Date;
  now: Date;
  usage: UsageCurrent | null;
  windowUsageData: WindowUsage[];
}

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function getBarColor(pct: number): string {
  if (pct < 40) return "bg-primary";
  if (pct < 70) return "bg-warning";
  return "bg-danger";
}

export default function WeekView({ weekStart, now, usage, windowUsageData }: WeekViewProps) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const resets = getResetsForDate(date);
      result.push({ date, resets });
    }
    return result;
  }, [weekStart]);

  const currentWindowStart = getWindowStart(now);
  const currentProgress = getWindowProgress(now);
  const usedPct = usage?.rate_limits?.five_hour?.used_percentage ?? null;

  // JSONL 윈도우별 토큰 맵
  const tokenMap = useMemo(() => {
    const map = new Map<number, WindowUsage>();
    for (const w of windowUsageData) map.set(w.windowStart, w);
    return map;
  }, [windowUsageData]);

  // 바 비율 계산용 max
  const maxTokens = useMemo(() => {
    let max = 0;
    for (const w of windowUsageData) max = Math.max(max, w.inputTokens + w.outputTokens);
    return max;
  }, [windowUsageData]);

  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden animate-fade-in">
      <div className="grid grid-cols-1 divide-y divide-border">
        {days.map(({ date, resets }, dayIdx) => {
          const isToday = isSameDay(date, now);
          const isPast = date.getTime() < now.getTime() && !isToday;

          return (
            <div
              key={dayIdx}
              className={`flex items-stretch transition-colors ${
                isToday
                  ? "bg-window-current"
                  : isPast
                    ? "bg-window-past/50"
                    : ""
              }`}
            >
              {/* Day label */}
              <div
                className={`w-16 md:w-20 shrink-0 flex flex-col items-center justify-center py-4 border-r border-border ${
                  isToday ? "bg-primary/10" : ""
                }`}
              >
                <span className={`text-xs ${isToday ? "text-primary-light" : "text-text-secondary"}`}>
                  {DAY_NAMES[dayIdx]}
                </span>
                <span
                  className={`text-lg font-semibold ${
                    isToday ? "text-primary-light" : isPast ? "text-text-dim" : "text-text"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Reset times */}
              <div className="flex-1 flex items-center gap-2 px-3 py-3 overflow-x-auto">
                {resets.map((reset, idx) => {
                  const isCurrentReset = reset.getTime() === currentWindowStart.getTime();
                  const resetIsPast = reset.getTime() < now.getTime() && !isCurrentReset;
                  const tokens = tokenMap.get(reset.getTime());

                  return (
                    <div key={idx} className="relative shrink-0 group">
                      <div
                        className={`
                          px-3 py-2 rounded-lg text-sm font-mono transition-all min-w-[60px]
                          ${
                            isCurrentReset
                              ? "bg-primary/20 text-white shadow-lg shadow-primary/30 ring-1 ring-primary-light/50"
                              : resetIsPast
                                ? "bg-surface-light/30 text-text-dim"
                                : "bg-surface-light text-text-secondary hover:bg-border hover:text-text"
                          }
                        `}
                      >
                        {formatTime(reset)}

                        {/* 현재 윈도우: 사용률 + 경과 바 */}
                        {isCurrentReset && (
                          <div className="mt-1.5 space-y-1">
                            {usedPct !== null && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getBarColor(usedPct)} transition-all duration-1000`}
                                    style={{ width: `${Math.min(100, usedPct)}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-semibold text-white">{Math.round(usedPct)}%</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white/60 rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.round(currentProgress * 100)}%` }}
                                />
                              </div>
                              {usedPct !== null && (
                                <span className="text-[8px] text-white/60">{Math.round(currentProgress * 100)}%</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 과거 윈도우: 토큰 바 */}
                        {resetIsPast && tokens && (
                          <div className="mt-1.5">
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex" style={{ minWidth: "40px" }}>
                              <div
                                className="h-full bg-accent/70"
                                style={{ width: `${maxTokens > 0 ? (tokens.inputTokens / maxTokens) * 100 : 0}%` }}
                              />
                              <div
                                className="h-full bg-teal-500/70"
                                style={{ width: `${maxTokens > 0 ? (tokens.outputTokens / maxTokens) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 과거 윈도우 툴팁 */}
                      {resetIsPast && tokens && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                          <div className="bg-surface-light border border-border rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-xl">
                            <p className="text-accent">입력: {formatTokens(tokens.inputTokens)}</p>
                            <p className="text-teal-400">출력: {formatTokens(tokens.outputTokens)}</p>
                            <p className="text-text-dim">{tokens.messageCount}msg</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {resets.length === 0 && (
                  <span className="text-sm text-text-dim italic">리셋 없음</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
