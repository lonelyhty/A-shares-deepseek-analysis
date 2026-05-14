import { BrainCircuit, ChartCandlestick } from "lucide-react";

export function AnalysisLoadingOverlay({ symbol }: { symbol?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 px-4 text-white backdrop-blur-sm"
      data-testid="analysis-loading-overlay"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-md border border-cyan-300/20 bg-slate-950 p-5 shadow-2xl">
        <div className="q-grid-bg absolute inset-0 opacity-20" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-300/12 text-cyan-200 ring-1 ring-cyan-300/25">
              <BrainCircuit className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="text-lg font-semibold">正在生成量化分析</div>
              <div className="mt-1 text-sm text-slate-300">{symbol ? `${symbol} ` : ""}行情、指标、回测和 DeepSeek 报告处理中</div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <LoadingStep icon={<ChartCandlestick className="h-4 w-4" />} text="拉取 A股行情与日线数据" />
            <LoadingStep icon={<BrainCircuit className="h-4 w-4" />} text="计算趋势、动量、风险和仓位计划" />
            <LoadingStep icon={<BrainCircuit className="h-4 w-4" />} text="生成明日预案与操作说明" />
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/6 px-3 py-2 text-sm text-slate-200">
      <span className="text-cyan-200">{icon}</span>
      {text}
    </div>
  );
}
