import { AppShell } from "@/components/dashboard/app-shell";
import { LocalReports } from "@/components/dashboard/local-reports";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { StoredReport } from "@/lib/types";
import { BookOpenText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let reports: StoredReport[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("analysis_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      reports = (data ?? []) as StoredReport[];
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="REPORT ARCHIVE"
          title="历史报告"
          description="每次完成股票分析后都会自动保存，包含信号、评分、下一交易日预案、操作说明和完整报告摘要。"
          icon={BookOpenText}
        />
        <Card>
          <CardHeader>
            <CardTitle>最近 50 条</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LocalReports initialReports={reports} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
