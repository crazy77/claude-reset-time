"use client";

import { useEffect, useState } from "react";
import {
  getCurrentWindow,
  getWindowProgress,
  getTimeUntilReset,
  formatTime,
  formatRemaining,
} from "@/lib/resetTimes";
import type { UsageCurrent } from "@/lib/types";
import { useDict } from "@/i18n/context";

interface CurrentStatusProps {
  usage: UsageCurrent | null;
}

export default function CurrentStatus({ usage }: CurrentStatusProps) {
  const dict = useDict();
  const locale = dict.locale;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const window = getCurrentWindow(now);
  const timeProgress = getWindowProgress(now);
  const remaining = getTimeUntilReset(now);

  const fiveHour = usage?.rate_limits?.five_hour;
  const hasRealData = fiveHour !== undefined && fiveHour !== null;
  const isEstimated = fiveHour?.estimated === true;
  const isSynced = fiveHour?.synced === true;
  const usedPct = hasRealData ? Math.round(fiveHour.used_percentage) : null;
  const timePct = Math.round(timeProgress * 100);
  const displayPct = usedPct ?? timePct;

  const getProgressColor = (pct: number) => {
    if (pct < 50) return "from-primary to-accent";
    if (pct < 80) return "from-warning to-orange-500";
    return "from-danger to-red-600";
  };

  const getStatusLabel = (pct: number) => {
    if (pct < 30) return dict.status.available;
    if (pct < 60) return dict.status.inUse;
    if (pct < 85) return dict.status.caution;
    return dict.status.danger;
  };

  const getStatusColor = (pct: number) => {
    if (pct < 30) return "text-success";
    if (pct < 60) return "text-accent";
    if (pct < 85) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface border border-border p-6 md:p-8 animate-pulse-glow">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-accent/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${hasRealData ? "bg-success" : "bg-warning"}`} />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              {dict.fiveHour.title}
            </h2>
            {hasRealData && isSynced && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary-light font-medium">SYNC</span>
            )}
            {hasRealData && !isSynced && !isEstimated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">LIVE</span>
            )}
            {hasRealData && isEstimated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">EST</span>
            )}
          </div>
          <span className={`text-sm font-semibold ${getStatusColor(displayPct)}`}>
            {getStatusLabel(displayPct)}
          </span>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <p className="text-text-secondary text-sm mb-2">
              {hasRealData ? dict.fiveHour.usage : dict.fiveHour.elapsed}
            </p>
            <p className={`text-4xl md:text-5xl font-mono font-bold tracking-tight ${getStatusColor(displayPct)}`}>
              {displayPct}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm mb-2">{dict.fiveHour.untilReset}</p>
            <p className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-text">
              {formatRemaining(remaining, locale)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-4 bg-surface-light rounded-full overflow-hidden" role="progressbar" aria-valuenow={displayPct} aria-valuemin={0} aria-valuemax={100} aria-label={hasRealData ? dict.fiveHour.usage : dict.fiveHour.elapsed}>
            <div
              className={`h-full rounded-full bg-linear-to-r ${getProgressColor(displayPct)} transition-all duration-1000 ease-out relative`}
              style={{ width: `${displayPct}%` }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Time elapsed bar */}
        {hasRealData && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
              <span>{formatTime(window.start, locale)}</span>
              <span className="font-mono">{dict.fiveHour.elapsed} {timePct}%</span>
              <span>{formatTime(window.end, locale)}</span>
            </div>
            <div className="h-2 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-text-dim/40 transition-all duration-1000 ease-linear"
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>
        )}

        {!hasRealData && (
          <div className="flex justify-between text-xs text-text-secondary mb-6 mt-1">
            <span>{formatTime(window.start, locale)}</span>
            <span>{formatTime(window.end, locale)}</span>
          </div>
        )}

        {/* Start/Reset times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-light/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-secondary mb-1">{dict.fiveHour.start}</p>
            <p className="text-base font-mono font-semibold">{formatTime(window.start, locale)}</p>
          </div>
          <div className="bg-surface-light/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-secondary mb-1">{dict.fiveHour.reset}</p>
            <p className="text-base font-mono font-semibold">{formatTime(window.end, locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
