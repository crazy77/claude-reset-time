import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.CLAUDE_DATA_DIR || join(process.env.HOME || "/root", ".claude");
const PROJECTS_DIR = join(DATA_DIR, "projects");

const EPOCH = new Date("2026-03-29T01:00:00+09:00").getTime();
const WINDOW_MS = 5 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

function getWindowStart(ts: number): number {
  const elapsed = ts - EPOCH;
  const idx = Math.floor(elapsed / WINDOW_MS);
  return EPOCH + idx * WINDOW_MS;
}

interface WindowUsage {
  windowStart: number;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "48", 10);
    const cutoffMs = Date.now() - hours * 3600 * 1000;

    const windowMap = new Map<number, WindowUsage>();

    const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);

    for (const projectDir of projectDirs) {
      const projectPath = join(PROJECTS_DIR, projectDir);
      const files = await readdir(projectPath).catch(() => []);

      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const filePath = join(projectPath, file);

        try {
          const raw = await readFile(filePath, "utf-8");
          for (const line of raw.split("\n")) {
            if (!line) continue;
            const entry = JSON.parse(line);

            if (entry.type !== "assistant" || !entry.message?.usage || !entry.timestamp) continue;

            const ts = new Date(entry.timestamp).getTime();
            if (ts < cutoffMs) continue;

            const u = entry.message.usage;
            const windowStart = getWindowStart(ts);

            const existing = windowMap.get(windowStart) || {
              windowStart,
              inputTokens: 0,
              outputTokens: 0,
              messageCount: 0,
            };

            existing.inputTokens += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
            existing.outputTokens += u.output_tokens || 0;
            existing.messageCount += 1;

            windowMap.set(windowStart, existing);
          }
        } catch {
          continue;
        }
      }
    }

    const windows = Array.from(windowMap.values()).sort(
      (a, b) => a.windowStart - b.windowStart
    );

    return NextResponse.json(windows);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
