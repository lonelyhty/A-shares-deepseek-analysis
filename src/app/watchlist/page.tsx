import { AppShell } from "@/components/dashboard/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { WatchlistClient } from "@/components/dashboard/watchlist-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { WatchlistItem } from "@/lib/types";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  let items: WatchlistItem[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      items = (data ?? []) as WatchlistItem[];
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-20 lg:pb-0">
        <PageHeader
          eyebrow="WATCHLIST"
          title="自选股"
          description="把候选股票集中到一个跟踪台，支持手动添加、移除、备注和一键重新分析。"
          icon={Star}
        />
        <Card>
          <CardHeader>
            <CardTitle>我的列表</CardTitle>
          </CardHeader>
          <CardContent>
            <WatchlistClient items={items} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
