"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Clock3, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalysisLoadingOverlay } from "@/components/dashboard/analysis-loading-overlay";
import type { StockSearchResult } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

const recentSymbols = [
  { symbol: "600519.SH", name: "贵州茅台" },
  { symbol: "300750.SZ", name: "宁德时代" },
  { symbol: "601899.SH", name: "紫金矿业" },
  { symbol: "000001.SZ", name: "平安银行" },
];

export function StockSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("600519");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const normalized = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!normalized) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(normalized)}`);
        const json = (await response.json()) as { results: StockSearchResult[] };
        setResults(json.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [normalized]);

  function go(symbol?: string) {
    const target = symbol || normalized;

    if (!target) {
      return;
    }

    flushSync(() => {
      setNavigating(true);
    });
    window.setTimeout(() => {
      router.push(`/stock/${encodeURIComponent(target)}`);
    }, 220);
  }

  const showQuick = !compact && !results.length && !loading;

  return (
    <div className="relative">
      {navigating ? <AnalysisLoadingOverlay symbol={normalized} /> : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          go(results[0]?.symbol);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-cyan-700" />
          <Input
            className="h-11 pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入 A股代码或名称，例如 600519"
          />
        </div>
        <Button type="submit" disabled={navigating} className="h-11" data-testid="stock-search-submit">
          <TrendingUp className="h-4 w-4" />
          {navigating ? "分析中" : "分析"}
        </Button>
      </form>
      {showQuick ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            快速开始
          </span>
          {recentSymbols.map((item) => (
            <button
              key={item.symbol}
              type="button"
              className="rounded border border-slate-200 bg-white/80 px-2 py-1 text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
              onClick={() => go(item.symbol)}
            >
              {item.name} {item.symbol.slice(0, 6)}
            </button>
          ))}
        </div>
      ) : null}
      {!compact && results.length ? (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-md border border-cyan-200 bg-white/95 shadow-2xl q-scrollbar">
          {results.map((item) => (
            <button
              key={item.symbol}
              type="button"
              className="flex w-full items-center justify-between gap-4 px-3 py-2.5 text-left text-sm transition hover:bg-cyan-50"
              onClick={() => go(item.symbol)}
            >
              <span>
                <span className="font-semibold text-slate-950">{item.name}</span>
                <span className="ml-2 text-slate-500">{item.symbol}</span>
              </span>
              <span className={item.changePercent && item.changePercent >= 0 ? "text-red-600" : "text-emerald-600"}>
                {item.price ? item.price.toFixed(2) : loading ? "..." : item.market}
                {item.changePercent !== undefined && item.changePercent !== null ? ` ${formatPercent(item.changePercent)}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
