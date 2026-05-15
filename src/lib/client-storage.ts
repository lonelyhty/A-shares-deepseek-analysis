"use client";

import { normalizeSymbol } from "@/lib/market/symbol";
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
  const symbol = normalizeWatchlistSymbol(input.symbol);
  const existing = items.find((current) => normalizeWatchlistSymbol(current.symbol) === symbol);
  const item: WatchlistItem = {
    id: `${symbol}-${Date.now()}`,
    symbol,
    name: input.name || existing?.name || symbol,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  };
  const next = [item, ...items.filter((current) => normalizeWatchlistSymbol(current.symbol) !== symbol)];

  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:watchlist"));
  return item;
}

export function removeLocalWatchlistItem(symbol: string) {
  const normalizedSymbol = normalizeWatchlistSymbol(symbol);
  const next = getLocalWatchlist().filter((item) => normalizeWatchlistSymbol(item.symbol) !== normalizedSymbol);
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("qfactor:watchlist"));
}

export function getLocalWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const items = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || "[]") as WatchlistItem[];
    return items
      .map((item) => {
        const symbol = normalizeWatchlistSymbol(item.symbol);
        return {
          ...item,
          symbol,
          name: item.name || symbol,
          note: item.note ?? null,
        };
      })
      .filter((item) => item.symbol);
  } catch {
    return [];
  }
}

export function mergeWatchlistItems(...groups: WatchlistItem[][]) {
  const bySymbol = new Map<string, WatchlistItem>();

  groups.flat().forEach((item) => {
    const symbol = normalizeWatchlistSymbol(item.symbol);
    if (!symbol) {
      return;
    }
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, { ...item, symbol });
    }
  });

  return Array.from(bySymbol.values()).sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

export function normalizeWatchlistSymbol(symbol: string) {
  const value = String(symbol ?? "").trim().toUpperCase();
  try {
    return normalizeSymbol(value).display;
  } catch {
    return value;
  }
}
