import { deepSeekReportSchema } from "@/lib/deepseek/schema";
import { fetchWithTimeout } from "@/lib/server/fetch";
import type { DeepSeekReport, QuantAnalysis } from "@/lib/types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
};

export async function generateDeepSeekReport(analysis: QuantAnalysis): Promise<DeepSeekReport> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
  const generatedAt = new Date().toISOString();

  if (!apiKey) {
    return fallbackReport(analysis, model, generatedAt, "未配置 DeepSeek API Key，当前展示规则引擎报告。");
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是一个严谨的A股量化研究助理。你只能基于用户提供的量化指标、评分、回测和风控信息写研究辅助报告。不要声称保证收益，不要建议借贷、满仓或内幕交易。必须输出JSON。",
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "输出 JSON，字段必须包含 title, summary, action, confidence, bullets, riskNotes, executionChecklist, disclaimer。语言为中文。action 必须尊重规则引擎 signalLabel，不要推翻规则引擎。summary 写 120-220 字，action 写 80-160 字，bullets 给 4-6 条，必须覆盖当前判断、下一交易日高开/平开/低开预案、仓位纪律、止损止盈、复盘条件。executionChecklist 给 4-6 条可执行步骤，像交易前清单一样具体。",
              stock: {
                symbol: analysis.symbol,
                name: analysis.quote.name,
                price: analysis.quote.price,
                changePercent: analysis.quote.changePercent,
              },
              scores: analysis.scores,
              plan: analysis.plan,
              indicators: analysis.indicators,
              reasons: analysis.reasons,
              warnings: analysis.warnings,
              backtest: {
                period: analysis.backtest.period,
                totalReturn: analysis.backtest.totalReturn,
                benchmarkReturn: analysis.backtest.benchmarkReturn,
                maxDrawdown: analysis.backtest.maxDrawdown,
                winRate: analysis.backtest.winRate,
                tradeCount: analysis.backtest.tradeCount,
              },
            }),
          },
        ],
      }),
      timeoutMs: 30_000,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed: ${response.status}`);
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek returned empty content");
    }

    const parsed = deepSeekReportSchema.parse(JSON.parse(content));

    return {
      ...parsed,
      model: json.model || model,
      generatedAt,
      fallback: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek 报告生成失败。";
    return fallbackReport(analysis, model, generatedAt, message);
  }
}

export function fallbackReport(
  analysis: QuantAnalysis,
  model: string,
  generatedAt: string,
  reason = "DeepSeek 暂不可用，当前展示规则引擎报告。",
): DeepSeekReport {
  return {
    title: `${analysis.quote.name} ${analysis.plan.signalLabel}研究报告`,
    summary: `${analysis.quote.name} 当前量化总分 ${analysis.scores.total}，规则引擎给出 ${analysis.plan.signalLabel} 信号，适用周期为 ${analysis.plan.horizon}。当前报告以规则指标为主：趋势、动量、量能、风险和流动性共同决定仓位上限。${reason} 执行时不要把信号理解为确定性结论，应先确认大盘、行业和个股公告环境，再按入场区间、止损位和止盈区间分批处理。`,
    action: `${analysis.plan.signalLabel}。建议总仓位控制在 ${analysis.plan.positionRange[0]}%-${analysis.plan.positionRange[1]}%，参考入场区间 ${analysis.plan.entryRange[0]}-${analysis.plan.entryRange[1]}，止损 ${analysis.plan.stopLoss}。若下一交易日高开，不追价；平开看承接；低开先看能否收回入场下沿，跌破止损则优先控制风险。`,
    confidence: Math.max(35, Math.min(88, analysis.scores.total)),
    bullets: [
      ...analysis.reasons.slice(0, 4),
      `入场观察区间 ${analysis.plan.entryRange[0]}-${analysis.plan.entryRange[1]}，止损 ${analysis.plan.stopLoss}。`,
      `最近回测收益 ${analysis.backtest.totalReturn.toFixed(2)}%，最大回撤 ${analysis.backtest.maxDrawdown.toFixed(2)}%。`,
    ].slice(0, 6),
    riskNotes: [
      ...analysis.warnings.slice(0, 4),
      "公开行情接口存在延迟或不可用风险，实盘前请核对券商行情。",
      "若高开后放量滞涨、低开跌破止损或评分继续下降，应优先降低仓位。",
      "本报告是研究辅助，不构成个性化投资建议。",
    ].slice(0, 6),
    executionChecklist: [
      "开盘前确认个股公告、大盘趋势和所属行业没有出现系统性风险。",
      `高开超过 ${analysis.plan.entryRange[1]} 时先观察 30-60 分钟，等待回踩或站稳确认，不直接追价。`,
      `平开或小幅震荡时，只有价格维持在 ${analysis.plan.entryRange[0]}-${analysis.plan.entryRange[1]} 且量能配合，才分批执行。`,
      `低开时先看能否收回 ${analysis.plan.entryRange[0]}，若盘中或收盘跌破 ${analysis.plan.stopLoss}，优先减仓或退出。`,
      `进入 ${analysis.plan.takeProfit[0]}-${analysis.plan.takeProfit[1]} 后上移止损，保护已有利润。`,
    ],
    disclaimer: "本内容仅用于量化研究和学习，不构成投资建议。市场有风险，决策需独立承担。",
    model,
    generatedAt,
    fallback: true,
  };
}
