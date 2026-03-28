"use client";

import {
  getCurrentWeeklyWindow,
  getWeeklyWindowProgress,
  getTimeUntilWeeklyReset,
  formatDateTime,
  formatRemainingLong,
} from "@/lib/resetTimes";
import type { UsageCurrent } from "@/lib/types";
import { useDict } from "@/i18n/context";

interface WeeklyStatusProps {
  now: Date;
  usage: UsageCurrent | null;
}

export default function WeeklyStatus({ now, usage }: WeeklyStatusProps) {
  const dict = useDict();
  const locale = dict.locale;
  const window = getCurrentWeeklyWindow(now);
  const timeProgress = getWeeklyWindowProgress(now);
  const remaining = getTimeUntilWeeklyReset(now);

  const sevenDay = usage?.rate_limits?.seven_day;
  const hasRealData = sevenDay !== undefined && sevenDay !== null;
  const usedPct = hasRealData ? Math.round(sevenDay.used_percentage) : null;
  const timePct = Math.round(timeProgress * 100);

  const getProgressColor = (pct: number) => {
    if (pct < 50) return "from-emerald-500 to-teal-500";
    if (pct < 75) return "from-amber-500 to-orange-500";
    return "from-rose-500 to-red-500";
  };

  const getStatusColor = (pct: number) => {
    if (pct < 40) return "text-success";
    if (pct < 70) return "text-warning";
    return "text-danger";
  };

  const elapsedDays = Math.floor(
    (now.getTime() - window.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${hasRealData ? "bg-teal-500" : "bg-amber-500"}`} />
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            {dict.sevenDay.title}
          </h3>
          {hasRealData && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-medium">LIVE</span>
          )}
        </div>
        <span className="text-xs font-mono text-text-dim">
          {elapsedDays}{dict.sevenDay.daysElapsed}
        </span>
      </div>

      {/* Countdown */}
      <div className="mb-4">
        <p className="text-xs text-text-secondary mb-1">{dict.sevenDay.untilReset}</p>
        <p className="text-2xl font-mono font-bold tracking-tight text-text">
          {formatRemainingLong(remaining, locale)}
        </p>
      </div>

      {/* Actual usage */}
      {hasRealData && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-text-dim mb-1.5">
            <span>{dict.sevenDay.actualUsage}</span>
            <span className={`font-semibold ${getStatusColor(usedPct!)}`}>{usedPct}%</span>
          </div>
          <div className="h-2.5 bg-surface-light rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-linear-to-r ${getProgressColor(usedPct!)} transition-all duration-1000 ease-out`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Time elapsed */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-text-dim mb-1.5">
          <span>{formatDateTime(window.start, locale)}</span>
          <span>{hasRealData ? `${dict.sevenDay.elapsed} ${timePct}%` : `${timePct}%`}</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              hasRealData ? "bg-text-dim/40" : `bg-linear-to-r ${getProgressColor(timePct)}`
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-text-dim">
            {formatDateTime(window.end, locale)}
          </span>
        </div>
      </div>

      {/* Day markers */}
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < elapsedDays
                ? "bg-teal-500/60"
                : i === elapsedDays
                  ? "bg-teal-400 animate-pulse"
                  : "bg-surface-light"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-text-dim">{dict.sevenDay.day1}</span>
        <span className="text-[9px] text-text-dim">{dict.sevenDay.day7}</span>
      </div>
    </div>
  );
}
