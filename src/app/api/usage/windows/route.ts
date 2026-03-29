import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { DATA_DIR, PROJECTS_DIR, WINDOW_5H_MS, DEFAULT_EPOCH_MS, getWindowStartMs, calibrateEpochFromResetsAt, parseIntParam } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** calibration 파일 → usage-latest.json 순으로 epoch 보정 */
async function getCalibratedEpoch(): Promise<number> {
  // 1) calibration 파일에 저장된 epoch 우선
  try {
    const calibRaw = await readFile(join(DATA_DIR, "usage-limit-calibration.json"), "utf-8");
    const calib = JSON.parse(calibRaw);
    if (calib?.fiveHourEpochMs) return calib.fiveHourEpochMs;
  } catch { /* fallback */ }
  // 2) usage-latest.json의 resets_at으로 역산
  try {
    const raw = await readFile(join(DATA_DIR, "usage-latest.json"), "utf-8");
    const data = JSON.parse(raw);
    const resetsAt: number | undefined = data?.rate_limits?.five_hour?.resets_at;
    if (resetsAt) return calibrateEpochFromResetsAt(resetsAt, WINDOW_5H_MS);
  } catch { /* fallback */ }
  return DEFAULT_EPOCH_MS;
}

interface WindowUsage {
  windowStart: number;
  inputTokens: number;
  cacheTokens: number;
  outputTokens: number;
  messageCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseIntParam(searchParams.get("hours"), 48, 1, 2160);
    const cutoffMs = Date.now() - hours * 3600 * 1000;

    const epoch = await getCalibratedEpoch();
    const windowMap = new Map<number, WindowUsage>();

    const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);

    // 프로젝트별 파일 목록 병렬 수집
    const projectFiles = await Promise.all(
      projectDirs.map(async (dir) => {
        const projectPath = join(PROJECTS_DIR, dir);
        const files = await readdir(projectPath).catch(() => [] as string[]);
        return files.filter((f) => f.endsWith(".jsonl")).map((f) => join(projectPath, f));
      })
    );

    // 파일 읽기 병렬 처리
    const fileResults = await Promise.all(
      projectFiles.flat().map(async (filePath) => {
        try {
          return await readFile(filePath, "utf-8");
        } catch {
          return null;
        }
      })
    );

    for (const raw of fileResults) {
      if (!raw) continue;
      for (const line of raw.split("\n")) {
        if (!line) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type !== "assistant" || !entry.message?.usage || !entry.timestamp) continue;

          const ts = new Date(entry.timestamp).getTime();
          if (ts < cutoffMs) continue;

          const u = entry.message.usage;
          const windowStart = getWindowStartMs(ts, WINDOW_5H_MS, epoch);

          const existing = windowMap.get(windowStart) || {
            windowStart,
            inputTokens: 0,
            cacheTokens: 0,
            outputTokens: 0,
            messageCount: 0,
          };

          existing.inputTokens += u.input_tokens || 0;
          existing.cacheTokens += (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
          existing.outputTokens += u.output_tokens || 0;
          existing.messageCount += 1;

          windowMap.set(windowStart, existing);
        } catch { continue; }
      }
    }

    const windows = Array.from(windowMap.values()).sort(
      (a, b) => a.windowStart - b.windowStart
    );

    return NextResponse.json(windows);
  } catch {
    return NextResponse.json([]);
  }
}
