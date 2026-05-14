"use client";

import type { AnalysisReport, StoredReport, WatchlistItem } from "@/lib/types";

const REPORTS_KEY = "qfactor.local.reports";
const WATCHLIST_KEY = "qfactor.local.watchlist";

export function saveLocalReport(report: AnalysisReport) {
  const reports = getLocalReports();
  const stored: StoredReport = {
    id: `${report.symbol}-${Date.now()}`,
    symbol: report.symbol,
    name: report.quote.name,
    signal: report.plan.signalLabel,
    score: report.scores.total,
    payload: report,
    created_at: new Date().toISOString(),
  };
  const next = [
    stored,
    ...reports.filter((item) => item.symbol !== report.symbol).slice(0, 49),
  ];

  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:reports"));
  return stored;
}

export function getLocalReports(): StoredReport[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(REPORTS_KEY) || "[]") as StoredReport[];
  } catch {
    return [];
  }
}

export function removeLocalReport(id: string) {
  const next = getLocalReports().filter((item) => item.id !== id);
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:reports"));
}

export function clearLocalReports() {
  window.localStorage.removeItem(REPORTS_KEY);
  window.dispatchEvent(new Event("qfactor:reports"));
}

export function addLocalWatchlistItem(input: {
  symbol: string;
  name: string;
  note?: string | null;
}) {
  const items = getLocalWatchlist();
  const item: WatchlistItem = {
    id: `${input.symbol}-${Date.now()}`,
    symbol: input.symbol,
    name: input.name,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  };
  const next = [item, ...items.filter((current) => current.symbol !== input.symbol)];

  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:watchlist"));
  return item;
}

export function removeLocalWatchlistItem(symbol: string) {
  const next = getLocalWatchlist().filter((item) => item.symbol !== symbol);
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:watchlist"));
}

export function getLocalWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || "[]") as WatchlistItem[];
  } catch {
    return [];
  }
}
