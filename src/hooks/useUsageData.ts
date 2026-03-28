"use client";

import { useState, useEffect, useCallback } from "react";
import type { UsageCurrent, UsageHistoryEntry, WindowUsage } from "@/lib/types";

const POLL_INTERVAL = 5000; // 5초

export function useUsageCurrent() {
  const [data, setData] = useState<UsageCurrent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/current");
      const json = await res.json();
      if (json && json.ts) {
        const nowSec = Date.now() / 1000;
        // resets_at이 지났으면 이전 윈도우 데이터 → rate_limits 무효화
        const fh = json.rate_limits?.five_hour;
        const sd = json.rate_limits?.seven_day;
        if (fh && fh.resets_at < nowSec) json.rate_limits.five_hour = undefined;
        if (sd && sd.resets_at < nowSec) json.rate_limits.seven_day = undefined;
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // 네트워크 오류 시 기존 데이터 유지
    }
  }, []);

  useEffect(() => {
    fetch_();
    const timer = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetch_]);

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
