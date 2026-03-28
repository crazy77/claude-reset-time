"use client";

import { useMemo } from "react";
import {
  getWindowStart,
  formatTime,
  formatDate,
  isSameDay,
} from "@/lib/resetTimes";
import type { UsageCurrent, UsageHistoryEntry, WindowUsage } from "@/lib/types";

const WINDOW_MS = 5 * 60 * 60 * 1000;

interface RecentWindowsProps {
  now: Date;
  usage: UsageCurrent | null;
  history: UsageHistoryEntry[];
  windowUsageData: WindowUsage[];
}

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

function getBarColorText(pct: number): string {
  if (pct < 40) return "text-primary-light";
  if (pct < 70) return "text-warning";
  return "text-danger";
}

export default function UpcomingResets({ now, usage, history, windowUsageData }: RecentWindowsProps) {
  const currentWindowStart = getWindowStart(now);

  const windows = useMemo(() => {
    const result = [];
    for (let i = -3; i <= 3; i++) {
      const start = new Date(currentWindowStart.getTime() + i * WINDOW_MS);
      const end = new Date(start.getTime() + WINDOW_MS);
      result.push({ start, end, offset: i });
    }
    return result;
  }, [currentWindowStart]);

  // statusline 이력 → 윈도우별 peak %
  const statuslineUsage = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of history) {
      const entryTime = new Date(entry.ts * 1000);
      const ws = getWindowStart(entryTime).getTime();
      const pct = entry.rate_limits?.five_hour?.used_percentage;
      if (pct !== undefined && pct !== null) {
        map.set(ws, Math.max(map.get(ws) ?? 0, pct));
      }
    }
    return map;
  }, [history]);

  // JSONL 트랜스크립트 → 윈도우별 토큰
  const tokenUsage = useMemo(() => {
    const map = new Map<number, WindowUsage>();
    for (const w of windowUsageData) {
      map.set(w.windowStart, w);
    }
    return map;
  }, [windowUsageData]);

  // 토큰 바 비율 계산용 max
  const maxTokens = useMemo(() => {
    let max = 0;
    for (const w of windowUsageData) {
      max = Math.max(max, w.inputTokens + w.outputTokens);
    }
    return max;
  }, [windowUsageData]);

  const currentLivePct = usage?.rate_limits?.five_hour?.used_percentage ?? null;

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
        최근 리셋
      </h3>
      <div className="space-y-1.5">
        {windows.map(({ start, end, offset }) => {
          const isCurrent = offset === 0;
          const isPast = offset < 0;
          const isNextDay = !isSameDay(start, now);

          // 실시간 사용률 (statusline)
          let pct: number | null = null;
          if (isCurrent && currentLivePct !== null) {
            pct = currentLivePct;
          } else if (isPast) {
            pct = statuslineUsage.get(start.getTime()) ?? null;
          }

          // JSONL 토큰 데이터
          const tokens = (isPast || isCurrent) ? tokenUsage.get(start.getTime()) : null;
          const totalTokens = tokens ? tokens.inputTokens + tokens.outputTokens : 0;

          const elapsed = isCurrent
            ? Math.round(((now.getTime() - start.getTime()) / WINDOW_MS) * 100)
            : null;

          return (
            <div
              key={offset}
              className={`relative rounded-lg transition-colors ${
                isCurrent
                  ? "bg-primary/10 border border-primary/30 p-3"
                  : isPast
                    ? "bg-surface-light/20 p-2.5 px-3"
                    : "p-2.5 px-3 opacity-60"
              }`}
            >
              {/* 상단: 시간 + 수치 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className={`font-mono text-sm font-medium ${
                    isCurrent ? "text-primary-light" : isPast ? "text-text-secondary" : "text-text-dim"
                  }`}>
                    {formatTime(start)} — {formatTime(end)}
                  </span>
                  {isNextDay && (
                    <span className="text-[10px] text-text-dim">{formatDate(start)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pct !== null && (
                    <span className={`text-xs font-mono font-semibold ${getBarColorText(pct)}`}>
                      {Math.round(pct)}%
                    </span>
                  )}
                  {tokens && (
                    <span className="text-[10px] font-mono text-text-dim">
                      {formatTokens(totalTokens)}
                    </span>
                  )}
                  {isCurrent && elapsed !== null && (
                    <span className="text-[10px] text-text-dim">경과 {elapsed}%</span>
                  )}
                </div>
              </div>

              {/* 바 (과거 + 현재) */}
              {(isPast || isCurrent) && (
                <div className="space-y-1">
                  {/* 사용률 바 (statusline) */}
                  {pct !== null && (
                    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarColor(pct)} transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                  {/* 토큰 바 (JSONL) */}
                  {tokens ? (
                    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-accent/60 transition-all duration-500"
                        style={{ width: `${(tokens.inputTokens / (maxTokens || 1)) * 100}%` }}
                      />
                      <div
                        className="h-full bg-teal-500/60 transition-all duration-500"
                        style={{ width: `${(tokens.outputTokens / (maxTokens || 1)) * 100}%` }}
                      />
                    </div>
                  ) : (isPast || isCurrent) && pct === null ? (
                    <div className="h-1.5 bg-surface-light/50 rounded-full" />
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 mt-3 text-[9px] text-text-dim">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> 사용률</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent/60 inline-block" /> 입력</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-500/60 inline-block" /> 출력</span>
      </div>
    </div>
  );
}
