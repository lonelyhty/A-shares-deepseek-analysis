import { AppShell } from "@/components/dashboard/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StockLoading() {
  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-950 p-4 text-white shadow-2xl">
          <div className="q-grid-bg absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="h-8 w-48 animate-pulse rounded bg-white/15" />
              <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-10 w-36 animate-pulse rounded-md bg-cyan-300/20" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-md border border-slate-200 bg-white/80" />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>正在生成K线与成交量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[420px] animate-pulse rounded-md bg-slate-100" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>正在调用量化引擎与 DeepSeek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-20 animate-pulse rounded bg-slate-100" />
              <div className="h-20 animate-pulse rounded bg-slate-100" />
              <p className="text-sm leading-6 text-slate-500">
                正在拉取行情、计算指标、生成评分和下一交易日预案。页面会自动切换到分析结果。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
