import { z } from "zod";
import { buildQuantAnalysis } from "@/lib/analysis/scoring";
import { generateDeepSeekReport } from "@/lib/deepseek/client";
import { getMarketDataProvider } from "@/lib/market/provider";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fail, ok } from "@/lib/server/json";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/auth";
import { getEntitlementState, incrementAnalysisUsage } from "@/lib/billing/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalysisReport } from "@/lib/types";

const requestSchema = z.object({
  symbol: z.string().min(1),
  save: z.boolean().default(true),
});

export const maxDuration = 30;

export async function POST(request: Request) {
  let stage = "初始化";
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  const limited = checkRateLimit(`analysis:${user.id}`, 20, 60_000);

  if (!limited.allowed) {
    return fail("分析请求太频繁，请稍后再试。", 429);
  }

  try {
    stage = "读取请求";
    const body = requestSchema.parse(await request.json());

    stage = "检查分析额度";
    const entitlement = await getEntitlementState(supabase, user);

    if (!entitlement.allowed) {
      return fail(
        `今日分析额度已用完。当前套餐每日 ${entitlement.subscription.analysis_daily_limit} 次，已使用 ${entitlement.usedToday} 次，请升级套餐或明日再试。`,
        402,
      );
    }

    stage = "标准化股票代码";
    const symbol = normalizeSymbol(body.symbol);

    stage = "读取行情数据";
    const provider = getMarketDataProvider();
    const [quote, history] = await Promise.all([
      provider.getQuote(symbol.display),
      provider.getHistory(symbol.display, 420),
    ]);

    stage = "计算量化评分";
    const analysis = buildQuantAnalysis(quote, history);

    stage = "生成 DeepSeek 报告";
    const aiReport = await generateDeepSeekReport(analysis);
    const report: AnalysisReport = { ...analysis, aiReport };

    if (body.save) {
      stage = "保存分析结果";
      const db = createAdminClient() ?? supabase;

      await Promise.allSettled([
        db.from("analysis_reports").insert({
          user_id: user.id,
          symbol: report.symbol,
          name: report.quote.name,
          signal: report.plan.signalLabel,
          score: report.scores.total,
          payload: report,
        }),
        db.from("usage_events").insert({
          user_id: user.id,
          event_type: "analysis.run",
          metadata: {
            symbol: report.symbol,
            score: report.scores.total,
            plan: entitlement.subscription.plan,
            remainingBeforeRun: entitlement.remainingToday,
          },
        }),
      ]);

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
    const message = error instanceof Error ? error.message : "分析失败。";
    return fail(`分析失败：${stage}。${message}`);
  }
}
