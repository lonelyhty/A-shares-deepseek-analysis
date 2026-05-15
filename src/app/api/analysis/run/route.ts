import { z } from "zod";
import { buildQuantAnalysis } from "@/lib/analysis/scoring";
import { fallbackReport, generateDeepSeekReport } from "@/lib/deepseek/client";
import { createDemoHistory, createDemoQuote } from "@/lib/market/mock-data";
import { getMarketDataProvider } from "@/lib/market/provider";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fail, ok } from "@/lib/server/json";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/auth";
import { fallbackEntitlementState } from "@/lib/billing/entitlements";
import type { AnalysisReport } from "@/lib/types";

const requestSchema = z.object({
  symbol: z.string().min(1),
  save: z.boolean().default(true),
});

export const maxDuration = 30;

export async function POST(request: Request) {
  let stage = "初始化";
  const { response, user } = await requireUser();

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

    stage = "应用默认额度";
    const entitlement = fallbackEntitlementState(user);

    if (!entitlement.allowed) {
      return fail(
        `今日分析额度已用完。当前套餐每日 ${entitlement.subscription.analysis_daily_limit} 次，已使用 ${entitlement.usedToday} 次，请升级套餐或明日再试。`,
        402,
      );
    }

    stage = "标准化股票代码";
    const symbol = normalizeSymbol(body.symbol);

    stage = "读取行情数据";
    const fastMode = process.env.VERCEL && process.env.QFACTOR_FAST_ANALYSIS !== "false";
    const provider = getMarketDataProvider();
    const fallbackMarketData = [
      createDemoQuote(symbol.display),
      createDemoHistory(symbol.display, 420),
    ] as const;
    const [quote, history] = fastMode
      ? await withFallback(
          Promise.all([
            provider.getQuote(symbol.display),
            provider.getHistory(symbol.display, 420),
          ]),
          fallbackMarketData,
          2_500,
        )
      : await Promise.all([
          provider.getQuote(symbol.display),
          provider.getHistory(symbol.display, 420),
        ]);

    stage = "计算量化评分";
    const analysis = buildQuantAnalysis(quote, history);

    stage = "生成 DeepSeek 报告";
    const aiReport = fastMode
      ? fallbackReport(
          analysis,
          process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
          new Date().toISOString(),
          "线上快速模式已启用，当前先用规则引擎兜底，避免 Vercel 函数超时。",
        )
      : await generateDeepSeekReport(analysis);
    const report: AnalysisReport = { ...analysis, aiReport };

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

function withFallback<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}
