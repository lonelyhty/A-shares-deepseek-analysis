import { CreditCard } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planLabels } from "@/lib/billing/plans";
import { getEntitlementState } from "@/lib/billing/entitlements";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  let content = {
    plan: "未登录",
    status: "未启用",
    limit: "--",
    used: "--",
    remaining: "--",
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const state = await getEntitlementState(supabase, user);
      content = {
        plan: planLabels[state.subscription.plan] ?? state.subscription.plan,
        status: state.subscription.status,
        limit: `${state.subscription.analysis_daily_limit}`,
        used: `${state.usedToday}`,
        remaining: `${state.remainingToday}`,
      };
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="BILLING"
          title="订阅与额度"
          description="查看当前套餐、每日分析额度和今日剩余额度。支付接入后，这里会展示续费和升级入口。"
          icon={CreditCard}
        />
        {reason === "quota" ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm leading-6 text-amber-900">
              今日分析额度已用完。请升级套餐、调整后台额度，或明天再继续生成新的单股分析报告。
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 md:grid-cols-5">
          <BillingStat label="当前套餐" value={content.plan} />
          <BillingStat label="订阅状态" value={content.status} />
          <BillingStat label="每日额度" value={content.limit} />
          <BillingStat label="今日已用" value={content.used} />
          <BillingStat label="今日剩余" value={content.remaining} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>套餐规划</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <PlanCard title="免费版" limit="每日 3 次分析" text="适合体验核心功能。" />
            <PlanCard title="专业版" limit="每日 50 次分析" text="适合个人投资研究和复盘。" />
            <PlanCard title="旗舰版" limit="每日 200 次分析" text="适合重度研究、选股和团队使用。" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function BillingStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ title, limit, text }: { title: string; limit: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-950">{title}</div>
      <div className="mt-2 text-sm font-medium text-cyan-700">{limit}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}
