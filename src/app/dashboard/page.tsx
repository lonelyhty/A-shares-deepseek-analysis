import { AppShell } from "@/components/dashboard/app-shell";
import { StockSearch } from "@/components/dashboard/stock-search";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeepSeekStatus, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Activity, BrainCircuit, DatabaseZap, LineChart, Radar, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const deepseek = getDeepSeekStatus();
  const supabaseConfigured = isSupabaseConfigured();
  let reportCount = 0;
  let watchCount = 0;

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [{ count: reports }, { count: watches }] = await Promise.all([
        supabase.from("analysis_reports").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      reportCount = reports ?? 0;
      watchCount = watches ?? 0;
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="QFACTOR TERMINAL"
          title="A股量化驾驶舱"
          description="面向 5-20 日波段，先计算指标、评分和回测，再用 DeepSeek 生成下一交易日预案与执行报告。"
          icon={Radar}
        >
          <div className="w-full min-w-0 rounded-md bg-white/95 p-3 text-slate-950 shadow-2xl lg:w-[520px]">
            <StockSearch />
          </div>
        </PageHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="DeepSeek" value={deepseek.configured ? "已配置" : "未配置"} helper={deepseek.model} tone={deepseek.configured ? "teal" : "amber"} />
          <MetricCard label="Tushare增强" value={process.env.TUSHARE_TOKEN ? "已开启" : "未开启"} helper="公开行情可兜底" />
          <MetricCard label="历史报告" value={`${reportCount}`} helper="当前账号" />
          <MetricCard label="自选股" value={`${watchCount}`} helper="当前账号" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-700" />
              今日工作台
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[
              ["先扫候选", "用选股器筛出 60 分以上、换手活跃、估值不过热的标的。"],
              ["再做单股", "进入分析页看 K线、评分拆解、仓位区间和下一交易日预案。"],
              ["加入自选", "把需要连续跟踪的股票加入自选，备注触发条件或复盘问题。"],
              ["收盘复盘", "回到历史报告对比信号变化，删除失效报告，保留关键样本。"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
                <div className="font-medium text-slate-950">{title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-cyan-700" />
                推荐工作流
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                { step: "1", title: "输入代码", text: "搜索 600519、000001、300750 或股票名称，直接进入分析。", icon: LineChart },
                { step: "2", title: "读取信号", text: "先看总分、仓位、止损、量能和失效条件，再看 AI 文本。", icon: ShieldCheck },
                { step: "3", title: "复盘跟踪", text: "报告自动保存，自选股用于连续观察评分和计划变化。", icon: Activity },
              ].map((item) => {
                const Icon = item.icon;

                return (
                <div key={item.step} className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-700 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 font-medium text-slate-950">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.text}</div>
                  <div className="mt-3 text-xs font-medium text-cyan-700">STEP {item.step}</div>
                </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseZap className="h-4 w-4 text-cyan-700" />
                上线状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <Status label="Supabase Auth" ok={supabaseConfigured} />
              <Status label="DeepSeek Key" ok={deepseek.configured} />
              <Status label="Vercel Runtime" ok={Boolean(process.env.VERCEL)} />
              <Status label="公开行情兜底" ok />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <span className={ok ? "font-medium text-cyan-700" : "font-medium text-amber-700"}>{ok ? "Ready" : "待配置"}</span>
    </div>
  );
}
