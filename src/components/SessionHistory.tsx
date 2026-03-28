"use client";

import { useState, useEffect, useCallback } from "react";

interface Session {
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatProjectName(raw: string): string {
  return raw
    .replace(/^-home-[^-]+-/, "~/")
    .replace(/--/g, "/")
    .replace(/\/(dev|Documents|Desktop|projects|src|work|code|Sync|repos)\//, "/$1/")
    .replace(/^~\/(dev|Documents|Desktop|projects|src|work|code|Sync|repos)-/, "~/$1/");
}

function formatDuration(min: number): string {
  if (min < 1) return "<1분";
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function modelBadge(model: string): { letter: string; color: string } {
  if (model.includes("opus")) return { letter: "O", color: "bg-amber-500/20 text-amber-400" };
  if (model.includes("sonnet")) return { letter: "S", color: "bg-primary/20 text-primary-light" };
  if (model.includes("haiku")) return { letter: "H", color: "bg-teal-500/20 text-teal-400" };
  return { letter: "?", color: "bg-surface-light text-text-dim" };
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [days, setDays] = useState(7);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?days=${days}`);
      const json = await res.json();
      if (Array.isArray(json)) setSessions(json);
    } catch { /* ignore */ }
  }, [days]);

  useEffect(() => {
    fetch_();
    const timer = setInterval(fetch_, 60000);
    return () => clearInterval(timer);
  }, [fetch_]);

  const maxTokens = sessions.reduce(
    (max, s) => Math.max(max, s.inputTokens + s.cacheCreationTokens + s.outputTokens),
    0
  );

  const totalPureInput = sessions.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalCache = sessions.reduce((sum, s) => sum + s.cacheCreationTokens, 0);
  const totalOutput = sessions.reduce((sum, s) => sum + s.outputTokens, 0);
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCostUsd, 0);

  function getBarWidth(tokens: number): number {
    if (maxTokens === 0) return 0;
    return Math.max(2, (tokens / maxTokens) * 100);
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          세션 이력
        </h3>
        <div className="flex items-center gap-1 bg-surface-light rounded-lg p-0.5">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                days === d
                  ? "bg-primary text-white"
                  : "text-text-dim hover:text-text-secondary"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* 합계 */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          <div className="bg-surface-light/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-text-dim mb-0.5">세션</p>
            <p className="text-sm font-mono font-semibold">{sessions.length}</p>
          </div>
          <div className="bg-surface-light/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-text-dim mb-0.5">입력</p>
            <p className="text-sm font-mono font-semibold">{formatTokens(totalPureInput)}</p>
          </div>
          <div className="bg-surface-light/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-text-dim mb-0.5">캐시</p>
            <p className="text-sm font-mono font-semibold">{formatTokens(totalCache)}</p>
          </div>
          <div className="bg-surface-light/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-text-dim mb-0.5">출력</p>
            <p className="text-sm font-mono font-semibold">{formatTokens(totalOutput)}</p>
          </div>
          <div className="bg-surface-light/50 rounded-lg p-2 text-center" title="API 직접 사용 시 예상 비용 (Pro/Max 구독과 무관)">
            <p className="text-[10px] text-text-dim mb-0.5">API 환산</p>
            <p className="text-sm font-mono font-semibold text-warning">${totalCost.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* 세션 목록 */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-text-dim text-sm">
            세션 데이터 없음
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.sessionId}
              className="group px-3 py-2.5 rounded-lg bg-surface-light/20 hover:bg-surface-light/40 transition-colors"
            >
              {/* 1행: 프로젝트 + 시간 + 비용 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-text truncate max-w-[160px]">
                    {formatProjectName(s.project)}
                  </span>
                  <span className="text-[10px] text-text-dim shrink-0">
                    {formatDuration(s.durationMin)}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-warning shrink-0">
                  ${s.estimatedCostUsd.toFixed(2)}
                </span>
              </div>

              {/* 2행: 배지들 + msg */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  {/* 모델 배지 */}
                  {s.models.map((model) => {
                    const { letter, color } = modelBadge(model);
                    return (
                      <span
                        key={model}
                        className={`text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center ${color}`}
                        title={model}
                      >
                        {letter}
                      </span>
                    );
                  })}
                  {/* 엔트리포인트 */}
                  <span
                    className={`text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold ${
                      s.entrypoint?.includes("vscode")
                        ? "bg-blue-500/20 text-blue-400"
                        : s.entrypoint?.includes("jetbrains")
                          ? "bg-orange-500/20 text-orange-400"
                          : s.entrypoint?.includes("web")
                            ? "bg-violet-500/20 text-violet-400"
                            : s.entrypoint?.includes("slack")
                              ? "bg-pink-500/20 text-pink-400"
                              : "bg-neutral-800 text-white"
                    }`}
                    title={s.entrypoint || "CLI"}
                  >
                    {s.entrypoint?.includes("vscode") ? "VS"
                      : s.entrypoint?.includes("jetbrains") ? "JB"
                      : s.entrypoint?.includes("web") ? "W"
                      : s.entrypoint?.includes("slack") ? "SL"
                      : ">_"}
                  </span>
                  {/* 도구 수 */}
                  <span
                    className="text-[9px] px-1.5 h-4 rounded bg-surface-light text-text-dim flex items-center cursor-default"
                    title={s.tools.join(", ")}
                  >
                    {s.tools.length} tools
                  </span>
                </div>
                <span className="text-[10px] text-text-dim">
                  {s.userMessageCount}req · {s.messageCount}msg
                </span>
              </div>

              {/* 토큰 바 */}
              <div className="h-1.5 bg-surface-light rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${getBarWidth(s.inputTokens)}%` }}
                  title={`입력: ${formatTokens(s.inputTokens)}`}
                />
                <div
                  className="h-full bg-accent/50 transition-all duration-500"
                  style={{ width: `${getBarWidth(s.cacheCreationTokens)}%` }}
                  title={`캐시: ${formatTokens(s.cacheCreationTokens)}`}
                />
                <div
                  className="h-full bg-teal-500/70 transition-all duration-500"
                  style={{ width: `${getBarWidth(s.outputTokens)}%` }}
                  title={`출력: ${formatTokens(s.outputTokens)}`}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 범례 */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-3 mt-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary/70" />
            <span className="text-text-dim">입력</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent/50" />
            <span className="text-text-dim">캐시</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-teal-500/70" />
            <span className="text-text-dim">출력</span>
          </div>
          <span className="text-text-dim ml-1">|</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-3 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold flex items-center justify-center">O</span>
            <span className="text-text-dim">Opus</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-3 rounded bg-primary/20 text-primary-light text-[8px] font-bold flex items-center justify-center">S</span>
            <span className="text-text-dim">Sonnet</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-3 rounded bg-teal-500/20 text-teal-400 text-[8px] font-bold flex items-center justify-center">H</span>
            <span className="text-text-dim">Haiku</span>
          </span>
        </div>
      )}
    </div>
  );
}
