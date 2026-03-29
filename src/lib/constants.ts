import { join } from "path";

export const DATA_DIR = process.env.CLAUDE_DATA_DIR || join(process.env.HOME || "/root", ".claude");
export const PROJECTS_DIR = join(DATA_DIR, "projects");

export const WINDOW_5H_MS = 5 * 60 * 60 * 1000;
export const WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000;

/** 기본 epoch — calibration 없을 때의 fallback */
export const DEFAULT_EPOCH_MS = new Date("2026-03-29T01:00:00+09:00").getTime();

/** 윈도우 시작 시각 계산 (ms 단위) */
export function getWindowStartMs(nowMs: number, windowMs: number, epochMs: number): number {
  const elapsed = nowMs - epochMs;
  const idx = Math.floor(elapsed / windowMs);
  return epochMs + idx * windowMs;
}

/** resets_at (unix seconds)으로 실제 epoch 역산 — 5분 단위로 반올림 */
export function calibrateEpochFromResetsAt(resetsAtSec: number, windowMs: number): number {
  const roundedSec = Math.round(resetsAtSec / 300) * 300; // 5분 단위 반올림
  const resetsAtMs = roundedSec * 1000;
  const elapsed = resetsAtMs - DEFAULT_EPOCH_MS;
  const windows = Math.round(elapsed / windowMs);
  return resetsAtMs - windows * windowMs;
}

/** 쿼리 파라미터를 안전하게 정수로 파싱 */
export function parseIntParam(value: string | null, defaultVal: number, min: number, max: number): number {
  const num = parseInt(value || String(defaultVal), 10);
  if (isNaN(num) || num < min || num > max) return defaultVal;
  return num;
}
