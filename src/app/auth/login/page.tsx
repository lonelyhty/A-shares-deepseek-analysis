import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { BrainCircuit, ChartCandlestick, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="q-shell-glow relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="q-grid-bg absolute inset-0 opacity-25" />
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-center text-white">
          <div className="inline-flex w-fit items-center rounded bg-cyan-300/12 px-3 py-1 text-xs font-medium text-cyan-100 ring-1 ring-cyan-200/25">
            QFactor A股量化驾驶舱
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
            登录后开始做可回测、可解释的 A股波段分析
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            输入股票代码，系统计算趋势、动量、量能、风险、估值和流动性评分，再调用 DeepSeek 生成执行报告。
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
            {[
              { label: "多用户账号", icon: ShieldCheck },
              { label: "规则引擎兜底", icon: BrainCircuit },
              { label: "K线与回测", icon: ChartCandlestick },
            ].map((item) => {
              const Icon = item.icon;

              return (
              <div key={item.label} className="q-tech-panel rounded-md p-3">
                <Icon className="h-4 w-4 text-cyan-200" />
                <div className="mt-2">{item.label}</div>
              </div>
              );
            })}
          </div>
        </section>
        <Card className="relative">
          <CardHeader>
            <CardTitle>账户登录</CardTitle>
          </CardHeader>
          <CardContent>
            {configured ? (
              <LoginForm />
            ) : (
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>Supabase 环境变量尚未配置。请先在 `.env.local` 或 Vercel 环境变量中填写：</p>
                <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50">
                  NEXT_PUBLIC_SUPABASE_URL{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                </pre>
                <p>配置后刷新页面即可启用注册和登录。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
