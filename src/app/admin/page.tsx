import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { AdminSubscriptionsClient } from "@/components/dashboard/admin-subscriptions-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UsageCounter, UserSubscription } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/dashboard");
  }

  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  if (!adminSupabase) {
    return (
      <AppShell>
        <div className="space-y-4 pb-20 lg:pb-0">
          <PageHeader
            eyebrow="ADMIN CONSOLE"
            title="运营后台"
            description="管理员已验证，但缺少 SUPABASE_SERVICE_ROLE_KEY，无法读取全站订阅数据。"
            icon={ShieldCheck}
          />
          <Card>
            <CardContent className="p-6 text-sm leading-6 text-slate-600">
              请在 Vercel 环境变量或本地 `.env.local` 中配置 `SUPABASE_SERVICE_ROLE_KEY`。这个 Key 只能放服务端，不能暴露给浏览器。
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const [{ data: subscriptions }, { data: usage }] = await Promise.all([
    adminSupabase.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(200),
    adminSupabase
      .from("usage_counters")
      .select("*")
      .eq("usage_date", today)
      .order("count", { ascending: false })
      .limit(200),
  ]);

  const subscriptionRows = (subscriptions ?? []) as UserSubscription[];
  const usageRows = (usage ?? []) as UsageCounter[];
  const activeCount = subscriptionRows.filter((item) => item.status === "active").length;
  const totalUsage = usageRows.reduce((sum, item) => sum + Number(item.count ?? 0), 0);

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="ADMIN CONSOLE"
          title="运营后台"
          description="管理用户套餐、每日分析额度和今日用量。支付 webhook 接入后可自动更新这里的订阅状态。"
          icon={ShieldCheck}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <AdminStat label="订阅记录" value={`${subscriptionRows.length}`} />
          <AdminStat label="活跃订阅" value={`${activeCount}`} />
          <AdminStat label="今日分析" value={`${totalUsage}`} />
          <AdminStat label="今日日期" value={today} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>订阅与用量</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminSubscriptionsClient
              initialSubscriptions={subscriptionRows}
              initialUsage={usageRows}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}
