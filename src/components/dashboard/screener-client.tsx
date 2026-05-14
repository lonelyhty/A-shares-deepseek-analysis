"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { ArrowDownUp, Plus, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnalysisLoadingOverlay } from "@/components/dashboard/analysis-loading-overlay";

type CandidateStock = {
  symbol: string;
  name: string;
  score: number;
  signal: string;
  pe: number;
  turnover: number;
  sector: string;
};

const SCREENER_POOL_KEY = "qfactor.screener.pool";
let poolSnapshot: CandidateStock[] | null = null;
let poolRawSnapshot: string | null = null;

const defaultUniverse: CandidateStock[] = [
  { symbol: "600519.SH", name: "贵州茅台", score: 72, signal: "试仓", pe: 27.4, turnover: 0.8, sector: "消费" },
  { symbol: "000001.SZ", name: "平安银行", score: 64, signal: "持有", pe: 5.1, turnover: 1.1, sector: "金融" },
  { symbol: "300750.SZ", name: "宁德时代", score: 69, signal: "试仓", pe: 22.8, turnover: 1.9, sector: "新能源" },
  { symbol: "600036.SH", name: "招商银行", score: 67, signal: "试仓", pe: 6.6, turnover: 0.7, sector: "金融" },
  { symbol: "601318.SH", name: "中国平安", score: 58, signal: "持有", pe: 8.7, turnover: 0.9, sector: "保险" },
  { symbol: "000858.SZ", name: "五粮液", score: 61, signal: "持有", pe: 19.6, turnover: 1.2, sector: "消费" },
  { symbol: "002475.SZ", name: "立讯精密", score: 74, signal: "试仓", pe: 24.3, turnover: 2.1, sector: "电子" },
  { symbol: "601899.SH", name: "紫金矿业", score: 76, signal: "买入", pe: 17.2, turnover: 1.8, sector: "资源" },
];

export function ScreenerClient() {
  const router = useRouter();
  const universe = useSyncExternalStore(subscribePool, getStoredPool, getServerPool);
  const [minScore, setMinScore] = useState(60);
  const [maxPe, setMaxPe] = useState(40);
  const [minTurnover, setMinTurnover] = useState(0);
  const [sector, setSector] = useState("全部");
  const [signal, setSignal] = useState("全部");
  const [sortBy, setSortBy] = useState<"score" | "pe" | "turnover">("score");
  const [analyzingSymbol, setAnalyzingSymbol] = useState("");
  const [draft, setDraft] = useState<CandidateStock>({
    symbol: "600000.SH",
    name: "浦发银行",
    score: 60,
    signal: "观望",
    pe: 8,
    turnover: 1,
    sector: "金融",
  });

  const rows = useMemo(
    () =>
      universe
        .filter((item) => item.score >= minScore)
        .filter((item) => item.pe <= maxPe)
        .filter((item) => item.turnover >= minTurnover)
        .filter((item) => sector === "全部" || item.sector === sector)
        .filter((item) => signal === "全部" || item.signal === signal)
        .sort((a, b) => {
          if (sortBy === "pe") {
            return a.pe - b.pe;
          }
          if (sortBy === "turnover") {
            return b.turnover - a.turnover;
          }
          return b.score - a.score;
        }),
    [maxPe, minScore, minTurnover, sector, signal, sortBy, universe],
  );
  const sectors = ["全部", ...Array.from(new Set(universe.map((item) => item.sector)))];
  const signals = ["全部", ...Array.from(new Set(universe.map((item) => item.signal)))];
  const averageScore = rows.length ? Math.round(rows.reduce((sum, item) => sum + item.score, 0) / rows.length) : 0;

  function addCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSymbol = draft.symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      return;
    }

    const next = {
      ...draft,
      symbol: normalizedSymbol,
      name: draft.name.trim() || normalizedSymbol,
      score: Number(draft.score) || 0,
      pe: Number(draft.pe) || 0,
      turnover: Number(draft.turnover) || 0,
      sector: draft.sector.trim() || "未分类",
      signal: draft.signal.trim() || "观望",
    };

    savePool([next, ...universe.filter((item) => item.symbol !== next.symbol)]);
  }

  function removeCandidate(symbol: string) {
    savePool(universe.filter((item) => item.symbol !== symbol));
  }

  function resetPool() {
    savePool(defaultUniverse);
  }

  function analyze(symbol: string) {
    flushSync(() => {
      setAnalyzingSymbol(symbol);
    });
    window.setTimeout(() => {
      router.push(`/stock/${encodeURIComponent(symbol)}`);
    }, 220);
  }

  return (
    <div className="space-y-4">
      {analyzingSymbol ? <AnalysisLoadingOverlay symbol={analyzingSymbol} /> : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-teal-700" />
            选股条件
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <FilterStat label="命中股票" value={`${rows.length}`} />
            <FilterStat label="平均评分" value={rows.length ? `${averageScore}` : "--"} />
            <FilterStat label="排序方式" value={sortBy === "score" ? "评分优先" : sortBy === "pe" ? "估值优先" : "换手优先"} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">最低评分</label>
              <Input type="number" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">最高 PE</label>
              <Input type="number" value={maxPe} onChange={(event) => setMaxPe(Number(event.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">最低换手率</label>
              <Input type="number" value={minTurnover} onChange={(event) => setMinTurnover(Number(event.target.value))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">行业</label>
            <div className="flex flex-wrap gap-2">
              {sectors.map((item) => (
                <Button
                  key={item}
                  variant={sector === item ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSector(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">信号</label>
            <div className="flex flex-wrap gap-2">
              {signals.map((item) => (
                <Button
                  key={item}
                  variant={signal === item ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSignal(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">排序</label>
            <div className="flex flex-wrap gap-2">
              {[
                ["score", "评分"],
                ["pe", "PE"],
                ["turnover", "换手"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={sortBy === value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSortBy(value as "score" | "pe" | "turnover")}
                >
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-cyan-700" />
            自定义候选池
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addCandidate} className="grid gap-2 md:grid-cols-[150px_150px_100px_100px_100px_120px_120px_auto]">
            <Input value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} placeholder="代码" />
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="名称" />
            <Input type="number" value={draft.score} onChange={(event) => setDraft({ ...draft, score: Number(event.target.value) })} placeholder="评分" />
            <Input type="number" value={draft.pe} onChange={(event) => setDraft({ ...draft, pe: Number(event.target.value) })} placeholder="PE" />
            <Input type="number" value={draft.turnover} onChange={(event) => setDraft({ ...draft, turnover: Number(event.target.value) })} placeholder="换手" />
            <Input value={draft.sector} onChange={(event) => setDraft({ ...draft, sector: event.target.value })} placeholder="行业" />
            <Input value={draft.signal} onChange={(event) => setDraft({ ...draft, signal: event.target.value })} placeholder="信号" />
            <Button type="submit">
              <Plus className="h-4 w-4" />
              加入
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span>候选池会保存在当前浏览器；后续接 Supabase 后可同步到云端。</span>
            <Button type="button" variant="secondary" size="sm" onClick={resetPool}>
              <RotateCcw className="h-4 w-4" />
              恢复默认池
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>候选池</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto p-0 q-scrollbar">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-950 text-left text-xs text-slate-300">
              <tr>
                <th className="px-4 py-3">股票</th>
                <th className="px-4 py-3">信号</th>
                <th className="px-4 py-3">评分</th>
                <th className="px-4 py-3">PE</th>
                <th className="px-4 py-3">换手率</th>
                <th className="px-4 py-3">行业</th>
                <th className="px-4 py-3">操作</th>
                <th className="px-4 py-3">管理</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.symbol} className="border-t border-slate-100 transition hover:bg-cyan-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.symbol}</div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={item.score >= 72 ? "red" : "teal"}>{item.signal}</Badge></td>
                  <td className="px-4 py-3 font-semibold">{item.score}</td>
                  <td className="px-4 py-3">{item.pe}</td>
                  <td className="px-4 py-3">{item.turnover}%</td>
                  <td className="px-4 py-3">{item.sector}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => analyze(item.symbol)}
                      disabled={analyzingSymbol === item.symbol}
                      data-testid={`analyze-${item.symbol}`}
                    >
                      {analyzingSymbol === item.symbol ? "分析中" : "分析"}
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => removeCandidate(item.symbol)} aria-label="移除候选股">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    当前筛选条件没有命中股票，可以降低评分/PE 条件，或在上方添加候选股。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function getServerPool() {
  return defaultUniverse;
}

function getStoredPool() {
  if (typeof window === "undefined") {
    return defaultUniverse;
  }

  try {
    const stored = window.localStorage.getItem(SCREENER_POOL_KEY);
    if (!stored) {
      poolSnapshot = defaultUniverse;
      poolRawSnapshot = null;
      return poolSnapshot;
    }

    if (stored === poolRawSnapshot && poolSnapshot) {
      return poolSnapshot;
    }

    poolRawSnapshot = stored;
    poolSnapshot = JSON.parse(stored) as CandidateStock[];
    return poolSnapshot;
  } catch {
    return defaultUniverse;
  }
}

function subscribePool(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("qfactor:screener-pool", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("qfactor:screener-pool", callback);
    window.removeEventListener("storage", callback);
  };
}

function savePool(next: CandidateStock[]) {
  const raw = JSON.stringify(next);
  poolRawSnapshot = raw;
  poolSnapshot = next;
  window.localStorage.setItem(SCREENER_POOL_KEY, raw);
  window.dispatchEvent(new Event("qfactor:screener-pool"));
}

function FilterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
