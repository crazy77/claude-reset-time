"use client";

import { createContext, useContext } from "react";

export type Dictionary = {
  locale: string;
  meta: { title: string; description: string };
  header: { subtitle: string; receiving: string; refresh: string };
  nav: { week: string; month: string; prev: string; today: string; next: string };
  status: { available: string; inUse: string; caution: string; danger: string };
  fiveHour: { title: string; usage: string; elapsed: string; untilReset: string; start: string; reset: string };
  sevenDay: { title: string; daysElapsed: string; untilReset: string; actualUsage: string; elapsed: string; day1: string; day7: string };
  chart: { title: string; empty: string; input: string; cache: string; output: string; usageRate: string };
  session: { title: string; sessions: string; input: string; cache: string; output: string; apiCost: string; noData: string; day: string };
  resets: { title: string; elapsed: string; usageRate: string; input: string; output: string };
  calendar: { days: string[]; noResets: string };
  footer: { cycle: string; connected: string; default: string };
  time: { day: string; hour: string; minute: string; second: string; lessThan1Min: string };
};

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  children,
  dictionary,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
}) {
  return (
    <DictionaryContext value={dictionary}>
      {children}
    </DictionaryContext>
  );
}

export function useDict(): Dictionary {
  const dict = useContext(DictionaryContext);
  if (!dict) throw new Error("useDict must be used within DictionaryProvider");
  return dict;
}
