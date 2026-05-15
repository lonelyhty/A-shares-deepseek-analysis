"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { AnalysisLoadingOverlay } from "@/components/dashboard/analysis-loading-overlay";
import { AnalysisPanels } from "@/components/dashboard/analysis-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalysisReport } from "@/lib/types";

type AnalysisResponse = {
  report?: AnalysisReport;
  error?: string;
};

export function StockAnalysisClient({ symbol }: { symbol: string }) {
  const router = useRouter();
  const requestedRef = useRef(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 35_000);

    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, save: true }),
        signal: controller.signal,
      });
      const json = (await response.json().catch(() => ({}))) as AnalysisResponse;

      if (response.status === 401) {
        router.replace(`/auth/login?next=${encodeURIComponent(`/stock/${symbol}`)}`);
        return;
      }

      if (response.status === 402) {
        router.replace("/billing?reason=quota");
        return;
      }

      if (!response.ok || !json.report) {
        throw new Error(json.error || "分析失败，请稍后重试。");
      }

      setReport(json.report);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.name === "AbortError"
          ? "分析请求超时，请重试。若连续出现，请稍后再试或检查 DeepSeek / Supabase 配置。"
          : requestError instanceof Error
            ? requestError.message
            : "分析失败，请稍后重试。",
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [router, symbol]);

  useEffect(() => {
    if (requestedRef.current) {
      return;
    }

    requestedRef.current = true;
    void runAnalysis();
  }, [runAnalysis]);

  if (report) {
    return <AnalysisPanels initialReport={report} />;
  }

  return (
    <div className="min-h-[70vh]">
      {loading ? <AnalysisLoadingOverlay symbol={symbol} /> : null}
      {!loading && error ? (
        <Card className="mx-auto mt-10 max-w-2xl border-amber-200 bg-amber-50">
          <CardContent className="space-y-4 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
              <div>
                <h1 className="text-lg font-semibold text-amber-950">分析没有生成成功</h1>
                <p className="mt-2 text-sm leading-6 text-amber-900">{error}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runAnalysis}>
                <RefreshCcw className="h-4 w-4" />
                重试分析
              </Button>
              <Button variant="secondary" onClick={() => router.push("/dashboard")}>
                返回驾驶舱
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
