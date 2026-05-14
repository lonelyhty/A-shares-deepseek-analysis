"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoredReport } from "@/lib/types";
import { buildVisibleAdvice } from "@/lib/analysis/advice";
import { clearLocalReports, getLocalReports, removeLocalReport } from "@/lib/client-storage";
import { formatNumber } from "@/lib/utils";

export function LocalReports({ initialReports }: { initialReports: StoredReport[] }) {
  const [reports, setReports] = useState<StoredReport[]>(initialReports);
  const [query, setQuery] = useState("");
  const [signal, setSignal] = useState("全部");

  useEffect(() => {
    const load = () => {
      const local = getLocalReports();
      const merged = [...local, ...initialReports].filter(
        (item, index, arr) => arr.findIndex((current) => current.id === item.id) === index,
      );
      setReports(merged);
    };

    load();
    window.addEventListener("qfactor:reports", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("qfactor:reports", load);
      window.removeEventListener("storage", load);
    };
  }, [initialReports]);

  const signals = ["全部", ...Array.from(new Set(reports.map((report) => report.signal)))];
  const visibleReports = reports.filter((report) => {
    const text = `${report.symbol} ${report.name ?? ""} ${report.signal}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (signal === "全部" || report.signal === signal);
  });

  function removeReport(id: string) {
    removeLocalReport(id);
    setReports((current) => current.filter((report) => report.id !== id));
  }

  function clearReports() {
    clearLocalReports();
    setReports(initialReports);
  }

  function exportReports() {
    const blob = new Blob([JSON.stringify(visibleReports, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qfactor-reports-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  if (!reports.length) {
    return (
      <div className="p-6 text-sm text-slate-600">
        暂无报告。先从驾驶舱输入股票代码生成一次分析，系统会自动保存到这里。
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-cyan-700" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索股票、代码或信号" />
        </div>
        <div className="flex flex-wrap gap-2">
          {signals.map((item) => (
            <Button key={item} size="sm" variant={signal === item ? "primary" : "secondary"} onClick={() => setSignal(item)}>
              {item}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={exportReports}>
            导出
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearReports}>
            清空本地
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat label="报告总数" value={`${reports.length}`} />
        <MiniStat label="当前显示" value={`${visibleReports.length}`} />
        <MiniStat label="最高评分" value={reports.length ? `${Math.max(...reports.map((item) => Number(item.score))).toFixed(0)}` : "--"} />
      </div>

      {visibleReports.map((report) => {
        const advice = buildVisibleAdvice(report.payload);
        const visibleSections = advice.slice(0, 2);

        return (
          <article key={report.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-lg">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950">{report.name ?? report.symbol}</h2>
                  <Badge tone="slate">{report.symbol}</Badge>
                  <Badge tone={report.score >= 66 ? "red" : report.score >= 42 ? "teal" : "amber"}>{report.signal}</Badge>
                  <Badge tone="slate">{Number(report.score).toFixed(0)}分</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(report.created_at).toLocaleString("zh-CN")} 生成
                </div>
              </div>
              <Link href={`/stock/${report.symbol}`} className="text-sm font-medium text-cyan-700 hover:text-cyan-900">
                重新打开
              </Link>
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-red-600"
                onClick={() => removeReport(report.id)}
              >
                删除本地
              </button>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <MiniStat label="现价" value={formatNumber(report.payload.quote.price)} />
              <MiniStat label="仓位" value={`${report.payload.plan.positionRange[0]}-${report.payload.plan.positionRange[1]}%`} />
              <MiniStat label="止损" value={formatNumber(report.payload.plan.stopLoss)} />
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {visibleSections.map((section) => (
                <section key={section.title} className="rounded-md bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                  <div className="mt-2 space-y-2">
                    {section.items.map((item) => (
                      <p key={item} className="text-sm leading-6 text-slate-700">
                        {item}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <details className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-900">
                查看完整操作说明、仓位纪律和风险复盘
              </summary>
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                {advice.slice(2).map((section) => (
                  <section key={section.title} className="rounded-md bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                    <div className="mt-2 space-y-2">
                      {section.items.map((item) => (
                        <p key={item} className="text-sm leading-6 text-slate-700">
                          {item}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}
