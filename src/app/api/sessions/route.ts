import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { PROJECTS_DIR, parseIntParam } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Anthropic 공식 가격 (USD per 1M tokens, 2026-03 기준)
const MODEL_PRICING: Record<string, { input: number; cacheCreation: number; cacheRead: number; output: number }> = {
  "claude-opus-4-6":        { input: 15,  cacheCreation: 18.75, cacheRead: 1.5,   output: 75 },
  "claude-sonnet-4-6":      { input: 3,   cacheCreation: 3.75,  cacheRead: 0.3,   output: 15 },
  "claude-haiku-4-5":       { input: 0.8, cacheCreation: 1,     cacheRead: 0.08,  output: 4 },
  // fallback aliases
  "claude-opus-4-5":        { input: 15,  cacheCreation: 18.75, cacheRead: 1.5,   output: 75 },
  "claude-sonnet-4-5":      { input: 3,   cacheCreation: 3.75,  cacheRead: 0.3,   output: 15 },
};

const DEFAULT_PRICING = { input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 };

function getPricing(model: string) {
  // 정확한 매칭 시도 → 접두사 매칭
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  for (const [key, val] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key)) return val;
  }
  if (model.includes("opus")) return MODEL_PRICING["claude-opus-4-6"];
  if (model.includes("haiku")) return MODEL_PRICING["claude-haiku-4-5"];
  return DEFAULT_PRICING;
}

interface SessionSummary {
  sessionId: string;
  project: string;
  startedAt: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  messageCount: number;
  userMessageCount: number;
  estimatedCostUsd: number;
  models: string[];
  tools: string[];
  entrypoint: string;
  durationMin: number;
}

async function parseSession(filePath: string, project: string): Promise<SessionSummary | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);

    let startedAt = "";
    let lastTimestamp = "";
    let sessionId = "";
    let entrypoint = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationTokens = 0;
    let cacheReadTokens = 0;
    let messageCount = 0;
    let userMessageCount = 0;
    let totalCost = 0;
    const modelSet = new Set<string>();
    const toolSet = new Set<string>();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!startedAt && entry.timestamp) startedAt = entry.timestamp;
        if (entry.timestamp) lastTimestamp = entry.timestamp;
        if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
        if (!entrypoint && entry.entrypoint) entrypoint = entry.entrypoint;

        if (entry.type === "user") userMessageCount++;

        if (entry.type === "assistant" && entry.message) {
          // tool_use 수집
          if (Array.isArray(entry.message.content)) {
            for (const block of entry.message.content) {
              if (block?.type === "tool_use" && block.name) {
                toolSet.add(block.name);
              }
            }
          }

          if (entry.message.usage) {
            const u = entry.message.usage;
            const mInput = u.input_tokens || 0;
            const mOutput = u.output_tokens || 0;
            const mCacheCreate = u.cache_creation_input_tokens || 0;
            const mCacheRead = u.cache_read_input_tokens || 0;

            inputTokens += mInput;
            outputTokens += mOutput;
            cacheCreationTokens += mCacheCreate;
            cacheReadTokens += mCacheRead;
            messageCount++;

            const model = entry.message.model || "";
            if (model) modelSet.add(model);

            const pricing = getPricing(model);
            totalCost +=
              (mInput * pricing.input +
               mCacheCreate * pricing.cacheCreation +
               mCacheRead * pricing.cacheRead +
               mOutput * pricing.output) / 1_000_000;
          }
        }
      } catch {
        continue;
      }
    }

    if (!startedAt || messageCount === 0) return null;

    let durationMin = 0;
    if (startedAt && lastTimestamp) {
      durationMin = Math.round(
        (new Date(lastTimestamp).getTime() - new Date(startedAt).getTime()) / 60000
      );
    }

    return {
      sessionId,
      project,
      startedAt,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      messageCount,
      userMessageCount,
      estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      models: Array.from(modelSet),
      tools: Array.from(toolSet),
      entrypoint,
      durationMin,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseIntParam(searchParams.get("days"), 7, 1, 90);
    const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();

    const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);

    // 프로젝트별 파일 목록을 병렬로 수집
    const projectFiles = await Promise.all(
      projectDirs.map(async (projectDir) => {
        const projectPath = join(PROJECTS_DIR, projectDir);
        const files = await readdir(projectPath).catch(() => [] as string[]);
        return files
          .filter((f) => f.endsWith(".jsonl") && !f.includes("/"))
          .map((f) => ({ filePath: join(projectPath, f), project: projectDir }));
      })
    );

    // 세션 파일을 병렬로 파싱
    const results = await Promise.all(
      projectFiles.flat().map(({ filePath, project }) => parseSession(filePath, project))
    );

    const sessions = results
      .filter((s): s is SessionSummary => s !== null && s.startedAt >= cutoff)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json([]);
  }
}
