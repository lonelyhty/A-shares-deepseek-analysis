import { AppShell } from "@/components/dashboard/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScreenerClient } from "@/components/dashboard/screener-client";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ScreenerPage() {
  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="FACTOR SCREENER"
          title="选股器"
          description="用评分、行业、估值、换手率和信号类型快速缩小候选池，作为进一步单股分析的入口。"
          icon={BarChart3}
        />
        <ScreenerClient />
      </div>
    </AppShell>
  );
}
