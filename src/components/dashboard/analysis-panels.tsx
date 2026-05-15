"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, Plus, RefreshCcw, Target } from "lucide-react";
import { BacktestChart } from "@/components/charts/backtest-chart";
import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addLocalWatchlistItem } from "@/lib/client-storage";
import type { AnalysisReport } from "@/lib/types";
import { compactNumber, formatNumber, formatPercent } from "@/lib/utils";

export function AnalysisPanels({
  initialReport,
}: {
  initialReport: AnalysisReport;
}) {
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [watchSaving, setWatchSaving] = useState(false);
  const [watchSaved, setWatchSaved] = useState(false);
  const [watchMessage, setWatchMessage] = useState("");
  const tone = useMemo(() => {
    if (report.scores.total >= 66) {
      return "red";
    }
    if (report.scores.total >= 54) {
      return "teal";
    }
    if (report.scores.total >= 42) {
      return "amber";
    }
    return "green";
  }, [report.scores.total]);

  async function rerun() {
    setLoading(true);
    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: report.symbol, save: true }),
      });
      const json = (await response.json()) as { report: AnalysisReport };
      if (json.report) {
        setReport(json.report);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addWatchlist() {
    const note = `${report.plan.signalLabel}，评分 ${report.scores.total}，建议仓位 ${report.plan.positionRange[0]}%-${report.plan.positionRange[1]}%`;

    addLocalWatchlistItem({
      symbol: report.symbol,
      name: report.quote.name,
      note,
    });

    setWatchSaving(true);
    setWatchSaved(true);
    setWatchMessage("已保存到本地自选");

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: report.symbol,
          name: report.quote.name,
          note,
        }),
      });

      if (!response.ok) {
        throw new Error("watchlist sync failed");
      }

      setWatchMessage("已加入自选，并同步到云端");
    } catch {
      setWatchMessage("已加入本地自选，云端稍后会继续同步");
    } finally {
      setWatchSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950">{report.quote.name}</h1>
            <Badge tone="slate">{report.symbol}</Badge>
            <Badge tone={tone}>{report.plan.signalLabel}</Badge>
            <Badge tone="teal">{report.plan.horizon}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{report.aiReport.disclaimer}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={addWatchlist} disabled={watchSaving}>
              <Plus className="h-4 w-4" />
              {watchSaving ? "保存中" : watchSaved ? "已加入" : "自选"}
            </Button>
            <Button onClick={rerun} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              {loading ? "分析中" : "重新分析"}
            </Button>
          </div>
          {watchMessage ? <div className="text-xs text-slate-500">{watchMessage}</div> : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Stat label="现价" value={formatNumber(report.quote.price)} helper={formatPercent(report.quote.changePercent)} tone={report.quote.changePercent && report.quote.changePercent >= 0 ? "red" : "green"} />
        <Stat label="总分" value={`${report.scores.total}`} helper="0-100" tone={tone} />
        <Stat label="建议仓位" value={`${report.plan.positionRange[0]}-${report.plan.positionRange[1]}%`} helper={report.plan.riskLevel + "风险"} />
        <Stat label="止损位" value={formatNumber(report.plan.stopLoss)} helper={report.plan.invalidation} tone="green" />
        <Stat label="成交额" value={compactNumber(report.quote.amount)} helper={`换手 ${formatPercent(report.quote.turnoverRate ?? 0, 2)}`} />
        <Stat label="PE / PB" value={`${formatNumber(report.quote.pe, 1)} / ${formatNumber(report.quote.pb, 1)}`} helper="可选数据源增强" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>K线与成交量</CardTitle>
            <span className="text-xs text-slate-500">前复权日线</span>
          </CardHeader>
          <CardContent>
            <CandlestickChart data={report.history.slice(-220)} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-teal-700" />
                DeepSeek 研究报告
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{report.aiReport.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{report.aiReport.summary}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-sm font-medium text-slate-900">{report.aiReport.action}</div>
              <div className="space-y-2">
                {report.aiReport.bullets.map((item) => (
                  <div key={item} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-700" />
                执行计划
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <PlanRow label="入场区间" value={`${report.plan.entryRange[0]} - ${report.plan.entryRange[1]}`} />
              <PlanRow label="止盈区间" value={`${report.plan.takeProfit[0]} - ${report.plan.takeProfit[1]}`} />
              <PlanRow label="失效条件" value={report.plan.invalidation} />
              {report.aiReport.executionChecklist.map((item) => (
                <div key={item} className="flex gap-2 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>评分拆解</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Score label="趋势" value={report.scores.trend} max={25} />
            <Score label="动量" value={report.scores.momentum} max={20} />
            <Score label="量能" value={report.scores.volume} max={15} />
            <Score label="风险" value={report.scores.risk} max={20} />
            <Score label="估值" value={report.scores.valuation} max={10} />
            <Score label="流动性" value={report.scores.liquidity} max={10} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>规则回测</CardTitle>
          </CardHeader>
          <CardContent>
            <BacktestChart backtest={report.backtest} />
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <PlanRow label="策略收益" value={formatPercent(report.backtest.totalReturn)} />
              <PlanRow label="最大回撤" value={formatPercent(report.backtest.maxDrawdown)} />
              <PlanRow label="胜率" value={formatPercent(report.backtest.winRate)} />
              <PlanRow label="交易次数" value={`${report.backtest.tradeCount}`} />
              <PlanRow label="平均持仓" value={`${report.backtest.averageHoldingDays.toFixed(1)}天`} />
              <PlanRow label="成本假设" value={report.backtest.costAssumption} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            风险提示
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {report.aiReport.riskNotes.map((item) => (
            <div key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "slate" | "red" | "green" | "teal" | "amber";
}) {
  const colors = {
    slate: "text-slate-950",
    red: "text-red-600",
    green: "text-emerald-600",
    teal: "text-teal-700",
    amber: "text-amber-700",
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`mt-1 truncate text-xl font-semibold ${colors[tone]}`}>{value}</div>
        {helper ? <div className="mt-1 truncate text-xs text-slate-500">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

function Score({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-950">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <Progress value={(value / max) * 100} />
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
