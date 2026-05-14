import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { ServerAnalysisPanels } from "@/components/dashboard/server-analysis-panels";
import { buildQuantAnalysis } from "@/lib/analysis/scoring";
import { getEntitlementState, incrementAnalysisUsage } from "@/lib/billing/entitlements";
import { generateDeepSeekReport } from "@/lib/deepseek/client";
import { isSupabaseConfigured } from "@/lib/env";
import { getMarketDataProvider } from "@/lib/market/provider";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisReport } from "@/lib/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);
  const session = await getAnalysisSession(`/stock/${symbol}`);
  const report = await loadReport(decodedSymbol, session);

  if (!report) {
    notFound();
  }

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <ServerAnalysisPanels report={report} />
      </div>
    </AppShell>
  );
}

async function getAnalysisSession(nextPath: string) {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  const entitlement = await getEntitlementState(supabase, user);

  if (!entitlement.allowed) {
    redirect("/billing?reason=quota");
  }

  return { supabase, user };
}

async function loadReport(
  symbol: string,
  session: { supabase: SupabaseClient | null; user: User | null },
): Promise<AnalysisReport | null> {
  try {
    const provider = getMarketDataProvider();
    const [quote, history] = await Promise.all([
      provider.getQuote(symbol),
      provider.getHistory(symbol, 420),
    ]);
    const analysis = buildQuantAnalysis(quote, history);
    const aiReport = await generateDeepSeekReport(analysis);
    const report: AnalysisReport = { ...analysis, aiReport };
    await saveServerReport(report, session);
    return report;
  } catch {
    return null;
  }
}

async function saveServerReport(
  report: AnalysisReport,
  session: { supabase: SupabaseClient | null; user: User | null },
) {
  const { supabase, user } = session;

  if (!supabase || !user) {
    return;
  }

  try {
    await supabase.from("analysis_reports").insert({
      user_id: user.id,
      symbol: report.symbol,
      name: report.quote.name,
      signal: report.plan.signalLabel,
      score: report.scores.total,
      payload: report,
    });

    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "analysis.run",
      metadata: {
        symbol: report.symbol,
        score: report.scores.total,
        source: "stock-page",
      },
    });

    await incrementAnalysisUsage(supabase, user);
  } catch {
    // Rendering the report should not fail if best-effort persistence is unavailable.
  }
}
