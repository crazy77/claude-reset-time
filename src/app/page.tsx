"use client";

import { useState, useEffect, useCallback } from "react";
import CurrentStatus from "@/components/CurrentStatus";
import WeeklyStatus from "@/components/WeeklyStatus";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import UpcomingResets from "@/components/UpcomingResets";
import UsageChart from "@/components/UsageChart";
import SessionHistory from "@/components/SessionHistory";
import { getWeekRange, getMonthRange, calibrateFromResetsAt } from "@/lib/resetTimes";
import { useUsageCurrent, useUsageHistory, useWindowUsage } from "@/hooks/useUsageData";

type ViewMode = "week" | "month";

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [viewDate, setViewDate] = useState(new Date());
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");

  const { data: usage, lastUpdated } = useUsageCurrent();
  const history = useUsageHistory(48);
  const windowUsageData = useWindowUsage(24 * 35); // 약 5주

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // resets_at으로 epoch 자동 보정
  useEffect(() => {
    if (usage?.rate_limits) {
      calibrateFromResetsAt(
        usage.rate_limits.five_hour?.resets_at,
        usage.rate_limits.seven_day?.resets_at
      );
    }
  }, [usage]);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setSlideDir(direction === 1 ? "left" : "right");
      setViewDate((prev) => {
        const next = new Date(prev);
        if (viewMode === "week") {
          next.setDate(next.getDate() + direction * 7);
        } else {
          next.setMonth(next.getMonth() + direction);
        }
        return next;
      });
    },
    [viewMode]
  );

  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  const weekRange = getWeekRange(viewDate);
  const monthRange = getMonthRange(viewDate);

  const getViewTitle = () => {
    if (viewMode === "week") {
      const start = weekRange.start;
      const end = new Date(weekRange.end);
      end.setDate(end.getDate() - 1);
      const startStr = start.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
      return `${startStr} — ${endStr}`;
    }
    return viewDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  };

  const isCurrentPeriod = () => {
    if (viewMode === "week") {
      const current = getWeekRange(now);
      return current.start.getTime() === weekRange.start.getTime();
    }
    return now.getFullYear() === viewDate.getFullYear() && now.getMonth() === viewDate.getMonth();
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text">
                Claude Code Reset Timer
              </h1>
              <p className="text-sm text-text-secondary">
                5시간 / 7일 사용량 한도 리셋 스케줄 대시보드
              </p>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-text-secondary">데이터 수신 중</span>
              </div>
              <span className="text-[10px] text-text-dim">
                {lastUpdated.toLocaleTimeString("ko-KR")} 갱신
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="lg:col-span-2">
          <CurrentStatus usage={usage} />
        </div>
        <div className="space-y-4 md:space-y-6">
          <WeeklyStatus now={now} usage={usage} />
          <UpcomingResets now={now} usage={usage} history={history} windowUsageData={windowUsageData} />
        </div>
      </div>

      {/* Usage Chart + Session History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <UsageChart history={history} windowUsageData={windowUsageData} />
        <SessionHistory />
      </div>

      {/* View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center bg-surface rounded-xl border border-border p-1">
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "week"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-secondary hover:text-text"
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "month"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-secondary hover:text-text"
            }`}
          >
            월간
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text hover:border-border-light transition-colors"
            aria-label="이전"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isCurrentPeriod()
                ? "bg-primary/10 text-primary-light border border-primary/20"
                : "bg-surface border border-border text-text-secondary hover:text-text hover:border-border-light"
            }`}
          >
            오늘
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text hover:border-border-light transition-colors"
            aria-label="다음"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="ml-2 text-sm font-medium text-text min-w-[140px]">
            {getViewTitle()}
          </span>
        </div>
      </div>

      {/* Calendar View */}
      <div key={`${viewMode}-${viewDate.getTime()}`} className={slideDir === "left" ? "animate-slide-left" : "animate-slide-right"}>
        {viewMode === "week" ? (
          <WeekView weekStart={weekRange.start} now={now} usage={usage} windowUsageData={windowUsageData} />
        ) : (
          <MonthView
            year={monthRange.start.getFullYear()}
            month={monthRange.start.getMonth()}
            now={now}
            windowUsageData={windowUsageData}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-text-dim">
          리셋 주기: 5시간 / 7일 이중 윈도우
          {usage ? " · Statusline 데이터 연동 중" : " · 기본 패턴 사용 중 (Claude Code 세션 시작 시 자동 보정)"}
        </p>
      </footer>
    </main>
  );
}
