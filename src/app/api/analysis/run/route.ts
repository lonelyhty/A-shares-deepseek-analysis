import { z } from "zod";
import { buildQuantAnalysis } from "@/lib/analysis/scoring";
import { generateDeepSeekReport } from "@/lib/deepseek/client";
import { getMarketDataProvider } from "@/lib/market/provider";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fail, ok } from "@/lib/server/json";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/auth";
import { getEntitlementState, incrementAnalysisUsage } from "@/lib/billing/entitlements";
import type { AnalysisReport } from "@/lib/types";

const requestSchema = z.object({
  symbol: z.string().min(1),
  save: z.boolean().default(true),
});

export async function POST(request: Request) {
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  const limited = checkRateLimit(`analysis:${user.id}`, 20, 60_000);

  if (!limited.allowed) {
    return fail("分析请求太频繁，请稍后再试。", 429);
  }

  try {
    const entitlement = await getEntitlementState(supabase, user);

    if (!entitlement.allowed) {
      return fail(
        `今日分析额度已用完。当前套餐每日 ${entitlement.subscription.analysis_daily_limit} 次，已使用 ${entitlement.usedToday} 次，请升级套餐或明日再试。`,
        402,
      );
    }

    const body = requestSchema.parse(await request.json());
    const symbol = normalizeSymbol(body.symbol);
    const provider = getMarketDataProvider();
    const [quote, history] = await Promise.all([
      provider.getQuote(symbol.display),
      provider.getHistory(symbol.display, 420),
    ]);
    const analysis = buildQuantAnalysis(quote, history);
    const aiReport = await generateDeepSeekReport(analysis);
    const report: AnalysisReport = { ...analysis, aiReport };

    if (body.save) {
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
          plan: entitlement.subscription.plan,
          remainingBeforeRun: entitlement.remainingToday,
        },
      });

      await incrementAnalysisUsage(supabase, user);
    }

    return ok({
      report,
      entitlement: {
        plan: entitlement.subscription.plan,
        dailyLimit: entitlement.subscription.analysis_daily_limit,
        usedToday: entitlement.usedToday + (body.save ? 1 : 0),
        remainingToday: Math.max(0, entitlement.remainingToday - (body.save ? 1 : 0)),
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "分析失败。");
  }
}
