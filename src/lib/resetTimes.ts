// Claude Code 사용량 한도 리셋 시간 계산
// 기본 패턴: 매 5시간 / 7일 리셋
// statusline의 resets_at이 있으면 실제 서버 기준으로 자동 보정

import { DEFAULT_EPOCH_MS, WINDOW_5H_MS, WINDOW_7D_MS } from "./constants";

// 동적 epoch: resets_at으로부터 역산된 epoch를 저장
let calibratedEpoch5h: number | null = null;
let calibratedEpoch7d: number | null = null;

/** resets_at (unix seconds) 으로 epoch 보정 */
export function calibrateFromResetsAt(
  fiveHourResetsAt?: number,
  sevenDayResetsAt?: number
) {
  if (fiveHourResetsAt) {
    const roundedSec = Math.round(fiveHourResetsAt / 300) * 300;
    const resetsAtMs = roundedSec * 1000;
    const elapsed = resetsAtMs - DEFAULT_EPOCH_MS;
    const windows = Math.round(elapsed / WINDOW_5H_MS);
    calibratedEpoch5h = resetsAtMs - windows * WINDOW_5H_MS;
  }
  if (sevenDayResetsAt) {
    const roundedSec = Math.round(sevenDayResetsAt / 300) * 300;
    const resetsAtMs = roundedSec * 1000;
    const elapsed = resetsAtMs - DEFAULT_EPOCH_MS;
    const windows = Math.round(elapsed / WINDOW_7D_MS);
    calibratedEpoch7d = resetsAtMs - windows * WINDOW_7D_MS;
  }
}

/** 현재 보정 상태 반환 */
export function isCalibrated(): { fiveHour: boolean; sevenDay: boolean } {
  return {
    fiveHour: calibratedEpoch5h !== null,
    sevenDay: calibratedEpoch7d !== null,
  };
}

function getEpoch5h(): number {
  return calibratedEpoch5h ?? DEFAULT_EPOCH_MS;
}

function getEpoch7d(): number {
  return calibratedEpoch7d ?? DEFAULT_EPOCH_MS;
}

// ========== 타입 ==========

export interface ResetWindow {
  start: Date;
  end: Date;
  isCurrent: boolean;
  isPast: boolean;
}

// ========== 5시간 윈도우 ==========

export function getWindowStart(date: Date): Date {
  const epoch = getEpoch5h();
  const elapsed = date.getTime() - epoch;
  const windowIndex = Math.floor(elapsed / WINDOW_5H_MS);
  return new Date(epoch + windowIndex * WINDOW_5H_MS);
}

export function getCurrentWindow(now: Date = new Date()): ResetWindow {
  const start = getWindowStart(now);
  const end = new Date(start.getTime() + WINDOW_5H_MS);
  return { start, end, isCurrent: true, isPast: false };
}

export function getWindowProgress(now: Date = new Date()): number {
  const start = getWindowStart(now);
  const elapsed = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / WINDOW_5H_MS));
}

export function getTimeUntilReset(now: Date = new Date()): number {
  const start = getWindowStart(now);
  const end = start.getTime() + WINDOW_5H_MS;
  return Math.max(0, end - now.getTime());
}

export function getResetsForDate(date: Date): Date[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const resets: Date[] = [];
  let current = getWindowStart(dayStart);
  if (current.getTime() < dayStart.getTime()) {
    current = new Date(current.getTime() + WINDOW_5H_MS);
  }
  while (current.getTime() < dayEnd.getTime()) {
    resets.push(new Date(current));
    current = new Date(current.getTime() + WINDOW_5H_MS);
  }
  return resets;
}

export function getWindowsInRange(start: Date, end: Date, now: Date = new Date()): ResetWindow[] {
  const windows: ResetWindow[] = [];
  let windowStart = getWindowStart(start);
  const nowTime = now.getTime();

  while (windowStart.getTime() < end.getTime()) {
    const windowEnd = new Date(windowStart.getTime() + WINDOW_5H_MS);
    const isCurrent = nowTime >= windowStart.getTime() && nowTime < windowEnd.getTime();
    const isPast = nowTime >= windowEnd.getTime();
    windows.push({ start: new Date(windowStart), end: windowEnd, isCurrent, isPast });
    windowStart = new Date(windowStart.getTime() + WINDOW_5H_MS);
  }
  return windows;
}

// ========== 7일 윈도우 ==========

export function getWeeklyWindowStart(date: Date): Date {
  const epoch = getEpoch7d();
  const elapsed = date.getTime() - epoch;
  const windowIndex = Math.floor(elapsed / WINDOW_7D_MS);
  return new Date(epoch + windowIndex * WINDOW_7D_MS);
}

export function getCurrentWeeklyWindow(now: Date = new Date()): ResetWindow {
  const start = getWeeklyWindowStart(now);
  const end = new Date(start.getTime() + WINDOW_7D_MS);
  return { start, end, isCurrent: true, isPast: false };
}

export function getWeeklyWindowProgress(now: Date = new Date()): number {
  const start = getWeeklyWindowStart(now);
  const elapsed = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / WINDOW_7D_MS));
}

export function getTimeUntilWeeklyReset(now: Date = new Date()): number {
  const start = getWeeklyWindowStart(now);
  const end = start.getTime() + WINDOW_7D_MS;
  return Math.max(0, end - now.getTime());
}

// ========== 캘린더 네비게이션 ==========

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

// ========== 포맷 ==========

export function formatTime(date: Date, locale: string = "ko-KR"): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(date: Date, locale: string = "ko-KR"): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function formatRemaining(ms: number, locale: string = "ko-KR"): string {
  const isEn = locale.startsWith("en");
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}h ${mm}m ${ss}s`;
  if (isEn) return `${m}m ${ss}s`;
  if (m > 0) return `${m}분 ${ss}초`;
  return `${s}초`;
}

export function formatRemainingLong(ms: number, locale: string = "ko-KR"): string {
  const isEn = locale.startsWith("en");
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (isEn) {
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function formatDateTime(date: Date, locale: string = "ko-KR"): string {
  return (
    date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      weekday: "short",
    }) +
    " " +
    date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
