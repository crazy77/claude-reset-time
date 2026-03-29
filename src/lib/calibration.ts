import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { DATA_DIR, PROJECTS_DIR, WINDOW_5H_MS, WINDOW_7D_MS, calibrateEpochFromResetsAt } from "./constants";

const CALIB_FILE = join(DATA_DIR, "usage-limit-calibration.json");

export interface Calibration {
  fiveHourLimit: number | null;   // 추정 5h 한도 (tokens)
  sevenDayLimit: number | null;   // 추정 7d 한도 (tokens)
  fiveHourConfidence: number;     // 보정 당시 used_percentage (높을수록 정확)
  sevenDayConfidence: number;
  fiveHourEpochMs?: number;       // calibrated 5h epoch (ms)
  sevenDayEpochMs?: number;       // calibrated 7d epoch (ms)
  calibratedAt: number;           // unix seconds
}

export async function loadCalibration(): Promise<Calibration | null> {
  try {
    const raw = await readFile(CALIB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCalibration(c: Calibration) {
  await writeFile(CALIB_FILE, JSON.stringify(c, null, 2));
}

/** window 시작 시각(ms) 기준으로 JSONL에서 토큰 집계 */
async function getWindowTokens(windowStartMs: number, windowMs: number): Promise<number> {
  const windowEndMs = windowStartMs + windowMs;
  let total = 0;

  const projectDirs = await readdir(PROJECTS_DIR).catch(() => [] as string[]);
  for (const dir of projectDirs) {
    const projectPath = join(PROJECTS_DIR, dir);
    const files = await readdir(projectPath).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      try {
        const raw = await readFile(join(projectPath, file), "utf-8");
        for (const line of raw.split("\n")) {
          if (!line.trim()) continue;
          const entry = JSON.parse(line);
          if (entry.type !== "assistant" || !entry.message?.usage || !entry.timestamp) continue;
          const ts = new Date(entry.timestamp).getTime();
          if (ts < windowStartMs || ts >= windowEndMs) continue;
          const u = entry.message.usage;
          total += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
        }
      } catch { continue; }
    }
  }
  return total;
}

/**
 * statusline에서 받은 used_percentage + JSONL 토큰으로 한도 역산 후 저장
 * percentage가 높을수록(=더 많이 쓸수록) 정수 오차 비율이 작아져 정확해짐
 */
export async function updateCalibration(
  fiveHourPct: number | null,
  fiveHourResetsAt: number | null,   // unix seconds
  sevenDayPct: number | null,
  sevenDayResetsAt: number | null
) {
  const existing = await loadCalibration() ?? {
    fiveHourLimit: null, sevenDayLimit: null,
    fiveHourConfidence: 0, sevenDayConfidence: 0,
    calibratedAt: 0,
  };

  let updated = false;

  if (fiveHourPct && fiveHourPct > 0 && fiveHourResetsAt) {
    existing.fiveHourEpochMs = calibrateEpochFromResetsAt(fiveHourResetsAt, WINDOW_5H_MS);
    const windowEndMs = fiveHourResetsAt * 1000;
    const windowStartMs = windowEndMs - WINDOW_5H_MS;
    const tokens = await getWindowTokens(windowStartMs, WINDOW_5H_MS);
    if (tokens > 0 && fiveHourPct > existing.fiveHourConfidence) {
      existing.fiveHourLimit = Math.round(tokens / (fiveHourPct / 100));
      existing.fiveHourConfidence = fiveHourPct;
    }
    updated = true;
  }

  if (sevenDayPct && sevenDayPct > 0 && sevenDayResetsAt) {
    existing.sevenDayEpochMs = calibrateEpochFromResetsAt(sevenDayResetsAt, WINDOW_7D_MS);
    const windowEndMs = sevenDayResetsAt * 1000;
    const windowStartMs = windowEndMs - WINDOW_7D_MS;
    const tokens = await getWindowTokens(windowStartMs, WINDOW_7D_MS);
    if (tokens > 0 && sevenDayPct > existing.sevenDayConfidence) {
      existing.sevenDayLimit = Math.round(tokens / (sevenDayPct / 100));
      existing.sevenDayConfidence = sevenDayPct;
    }
    updated = true;
  }

  if (updated) {
    existing.calibratedAt = Math.floor(Date.now() / 1000);
    await saveCalibration(existing);
  }
}

/** JSONL만으로 현재 윈도우 추정 사용률 계산 */
export async function estimateFromJSONL(
  windowStartMs: number,
  windowMs: number,
  limitTokens: number
): Promise<number | null> {
  if (limitTokens <= 0) return null;
  const tokens = await getWindowTokens(windowStartMs, windowMs);
  return Math.min(100, (tokens / limitTokens) * 100);
}
