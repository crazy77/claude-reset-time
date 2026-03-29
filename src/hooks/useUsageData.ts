"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { UsageCurrent, UsageHistoryEntry, WindowUsage } from "@/lib/types";

/** 데이터 신선도에 따라 polling 간격 조정 (5초~30초) */
function getAdaptiveInterval(lastTs: number | null): number {
  if (!lastTs) return 5000;
  const ageSec = Date.now() / 1000 - lastTs;
  // 최근 데이터(10분 이내)면 5초, 아니면 점진적으로 30초까지
  if (ageSec <= 600) return 5000;
  return Math.min(30000, 5000 + Math.floor(ageSec / 60) * 1000);
}

export function useUsageCurrent() {
  const [data, setData] = useState<UsageCurrent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/usage/current", { signal: controller.signal });
      const json = await res.json();
      if (json && json.ts) {
        const nowSec = Date.now() / 1000;
        const ageSec = nowSec - json.ts;
        // resets_at이 지났으면 이전 윈도우 데이터 → rate_limits 무효화
        const fh = json.rate_limits?.five_hour;
        const sd = json.rate_limits?.seven_day;
        if (fh && fh.resets_at < nowSec) json.rate_limits.five_hour = undefined;
        if (sd && sd.resets_at < nowSec) json.rate_limits.seven_day = undefined;
        setData(json);
        // 10분 이상 오래된 데이터면 수신 중 표시 숨김
        setLastUpdated(ageSec <= 600 ? new Date() : null);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      // 네트워크 오류 시 기존 데이터 유지
    }
  }, []);

  useEffect(() => {
    fetch_();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const interval = getAdaptiveInterval(data?.ts ?? null);
      timer = setTimeout(() => {
        fetch_().then(schedule);
      }, interval);
    };
    schedule();
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetch_, data?.ts]);

  return { data, lastUpdated };
}

export function useUsageHistory(hours: number = 24) {
  const [data, setData] = useState<UsageHistoryEntry[]>([]);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/usage/history?hours=${hours}`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      }
    } catch {
      // 오류 시 기존 데이터 유지
    }
  }, [hours]);

  useEffect(() => {
    fetch_();
    const timer = setInterval(fetch_, 30000); // 30초마다
    return () => clearInterval(timer);
  }, [fetch_]);

  return data;
}

export function useWindowUsage(hours: number = 48) {
  const [data, setData] = useState<WindowUsage[]>([]);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/usage/windows?hours=${hours}`);
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch { /* ignore */ }
  }, [hours]);

  useEffect(() => {
    fetch_();
    const timer = setInterval(fetch_, 60000);
    return () => clearInterval(timer);
  }, [fetch_]);

  return data;
}
