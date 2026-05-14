import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { StockAnalysisClient } from "@/components/dashboard/stock-analysis-client";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);
  await requireAnalysisUser(`/stock/${symbol}`);

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <StockAnalysisClient symbol={decodedSymbol} />
      </div>
    </AppShell>
  );
}

async function requireAnalysisUser(nextPath: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
}
