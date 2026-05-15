import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminEmails,
  getDeepSeekStatus,
  isAdminEmail,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const deepseek = getDeepSeekStatus();
  const allowed = await canViewSettings();

  if (!allowed) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="RUNTIME CONFIG"
          title="设置"
          description="运行时配置只在服务端读取，DeepSeek API Key 不会暴露给浏览器；上线前在 Vercel 环境变量里配置即可。"
          icon={Settings}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>环境变量</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SettingRow label="Supabase" value={isSupabaseConfigured() ? "已配置" : "未配置"} />
              <SettingRow label="Supabase Server Key" value={isSupabaseAdminConfigured() ? "configured" : "missing"} />
              <SettingRow label="DeepSeek API Key" value={deepseek.configured ? "已配置" : "未配置"} />
              <SettingRow label="DeepSeek Base URL" value={deepseek.baseUrl} />
              <SettingRow label="DeepSeek Model" value={deepseek.model} />
              <SettingRow label="Tushare Token" value={process.env.TUSHARE_TOKEN ? "已配置" : "未配置"} />
              <SettingRow label="管理员邮箱" value={getAdminEmails().length ? `${getAdminEmails().length} 个` : "未配置"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>风控默认值</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SettingRow label="默认周期" value="5-20日波段" />
              <SettingRow label="评分阈值" value="78买入 / 66试仓 / 54持有 / 42观望" />
              <SettingRow label="执行边界" value="研究辅助，不接券商下单" />
              <SettingRow label="回测假设" value="收盘后信号，次日开盘执行，单边0.15%" />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

async function canViewSettings() {
  if (!isSupabaseConfigured()) {
    return isAdminEmail(process.env.LOCAL_ADMIN_EMAIL);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return isAdminEmail(user?.email);
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-medium text-slate-950">{value}</span>
    </div>
  );
}
