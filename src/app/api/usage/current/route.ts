import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { loadCalibration, updateCalibration, estimateFromJSONL } from "@/lib/calibration";
import { DATA_DIR, WINDOW_5H_MS, WINDOW_7D_MS, DEFAULT_EPOCH_MS, getWindowStartMs, calibrateEpochFromResetsAt } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = join(DATA_DIR, "usage-latest.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);

    const nowSec = Date.now() / 1000;
    const ageSec = nowSec - (data.ts || 0);
    let fh = data.rate_limits?.five_hour;
    let sd = data.rate_limits?.seven_day;

    // 0) claude.ai sync 데이터가 있으면 우선 적용 (가장 정확)
    try {
      const syncRaw = await readFile(join(DATA_DIR, "usage-sync.json"), "utf-8");
      const sync = JSON.parse(syncRaw);
      const syncAge = Date.now() - (sync.synced_at || 0);
      if (syncAge < 120_000) {
        // 2분 이내 sync 데이터 → rate_limits 덮어쓰기
        if (!data.rate_limits) data.rate_limits = {};
        if (sync.five_hour) {
          data.rate_limits.five_hour = {
            used_percentage: sync.five_hour.utilization,
            resets_at: new Date(sync.five_hour.resets_at).getTime() / 1000,
            synced: true,
          };
          fh = data.rate_limits.five_hour;
        }
        if (sync.seven_day) {
          data.rate_limits.seven_day = {
            used_percentage: sync.seven_day.utilization,
            resets_at: new Date(sync.seven_day.resets_at).getTime() / 1000,
            synced: true,
          };
          sd = data.rate_limits.seven_day;
        }
      }
    } catch { /* sync 파일 없음 — 무시 */ }

    // 1) 신선한 데이터에 used_percentage가 있으면 보정값 업데이트 (백그라운드)
    if (ageSec <= 600 && (fh?.used_percentage || sd?.used_percentage)) {
      updateCalibration(
        fh?.used_percentage ?? null,
        fh?.resets_at ?? null,
        sd?.used_percentage ?? null,
        sd?.resets_at ?? null,
      ).catch(() => {});
    }

    // 2) rate_limits가 없거나 stale → JSONL + 보정값으로 추정
    const needFh = !fh || fh.resets_at < nowSec;
    const needSd = !sd || sd.resets_at < nowSec;

    if (needFh || needSd) {
      const calib = await loadCalibration();
      const nowMs = Date.now();

      if (needFh && calib?.fiveHourLimit) {
        const epoch = fh?.resets_at
          ? calibrateEpochFromResetsAt(fh.resets_at, WINDOW_5H_MS)
          : DEFAULT_EPOCH_MS;
        const windowStartMs = getWindowStartMs(nowMs, WINDOW_5H_MS, epoch);
        const estimated = await estimateFromJSONL(windowStartMs, WINDOW_5H_MS, calib.fiveHourLimit);
        if (estimated !== null) {
          if (!data.rate_limits) data.rate_limits = {};
          data.rate_limits.five_hour = {
            used_percentage: estimated,
            resets_at: windowStartMs / 1000 + WINDOW_5H_MS / 1000,
            estimated: true,
          };
        }
      }

      if (needSd && calib?.sevenDayLimit) {
        const windowStartMs = getWindowStartMs(nowMs, WINDOW_7D_MS, DEFAULT_EPOCH_MS);
        const estimated = await estimateFromJSONL(windowStartMs, WINDOW_7D_MS, calib.sevenDayLimit);
        if (estimated !== null) {
          if (!data.rate_limits) data.rate_limits = {};
          data.rate_limits.seven_day = {
            used_percentage: estimated,
            resets_at: windowStartMs / 1000 + WINDOW_7D_MS / 1000,
            estimated: true,
          };
        }
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}
