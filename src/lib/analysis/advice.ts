import type { AnalysisReport, OperationSignal } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

export type AdviceSection = {
  title: string;
  items: string[];
};

export function buildVisibleAdvice(report: AnalysisReport): AdviceSection[] {
  const { plan, scores, quote, indicators } = report;
  const playbook = getSignalPlaybook(plan.signal);
  const latestPrice = formatNumber(quote.price);
  const entryRange = `${formatNumber(plan.entryRange[0])}-${formatNumber(plan.entryRange[1])}`;
  const takeProfit = `${formatNumber(plan.takeProfit[0])}-${formatNumber(plan.takeProfit[1])}`;
  const stopLoss = formatNumber(plan.stopLoss);
  const ma5 = formatLevel(indicators.ma5, "MA5");
  const ma10 = formatLevel(indicators.ma10, "MA10");
  const ma20 = formatLevel(indicators.ma20, "MA20");
  const ma60 = formatLevel(indicators.ma60, "MA60");
  const volumeRatio = indicators.volumeRatio20 ?? 1;
  const volumeText = describeVolume(volumeRatio);
  const trendText = describeTrend(quote.price, indicators.ma20, indicators.ma60);
  const momentumText = describeMomentum(indicators.rsi14, indicators.macdHistogram);
  const firstOrder = plan.positionRange[1] > 0 ? Math.max(5, Math.round(plan.positionRange[1] / 2)) : 0;
  const priorClose = quote.previousClose ?? report.history.at(-2)?.close ?? report.history.at(-1)?.close ?? quote.price;

  const positionText =
    plan.positionRange[1] === 0
      ? "当前计划仓位为 0%，不建议新开仓。若已经持有，以降低风险暴露为主，等收盘重新站回关键均线且评分修复后再评估。"
      : `计划仓位控制在 ${plan.positionRange[0]}%-${plan.positionRange[1]}%。第一笔不建议超过 ${firstOrder}% 仓位，只有当价格、量能和大盘环境同时配合时，再逐步补到计划上限。`;

  return [
    {
      title: "当前判断",
      items: [
        `${quote.name}（${report.symbol}）最新价 ${latestPrice}，量化总分 ${scores.total}/100，规则引擎给出「${plan.signalLabel}」信号，适用周期为 ${plan.horizon}。${playbook.posture}`,
        `评分结构为：趋势 ${scores.trend.toFixed(1)}/25、动量 ${scores.momentum.toFixed(1)}/20、量能 ${scores.volume.toFixed(1)}/15、风险 ${scores.risk.toFixed(1)}/20、估值 ${scores.valuation.toFixed(1)}/10、流动性 ${scores.liquidity.toFixed(1)}/10。${trendText}`,
        `指标确认：${momentumText}${volumeText}参考入场区间 ${entryRange}，第一止盈观察区间 ${takeProfit}，硬性风控线 ${stopLoss}。`,
      ],
    },
    {
      title: "明日/下一交易日预案",
      items: [
        `高开预案：若开盘明显高于参考区间上沿 ${formatNumber(plan.entryRange[1])}，不要直接追价。先观察前 30-60 分钟能否站稳开盘价、${ma5} 或昨日收盘 ${formatNumber(priorClose)}；如果高开后量能放大但价格不再创新高，优先等待回踩，不加计划外仓位。`,
        `平开预案：若价格围绕 ${entryRange} 横盘，优先看承接质量。站稳 ${ma5}/${ma10} 且成交量温和放大时，可以按计划分批执行；若始终在区间下沿附近弱震荡，只做观察，不用为了“买到”而降低纪律。`,
        `低开预案：若低开但没有跌破 ${stopLoss}，先等 15-30 分钟确认是否出现快速收回；能收回 ${formatNumber(plan.entryRange[0])} 且量能没有异常放大，才考虑小仓位试错。若盘中或收盘跌破 ${stopLoss}，执行止损/减仓，不把短线预案改成被动长线。`,
      ],
    },
    {
      title: "操作说明",
      items: [
        `开盘前先检查三件事：个股公告、所属行业表现、沪深主要指数是否同步走弱。若大盘或行业出现系统性下跌，仓位上限下调 10-20 个百分点，即使个股分数较高也不激进。`,
        `${playbook.entry} 执行时以限价或分批成交为主，第一笔完成后等待收盘验证，不因为盘中一根拉升就把仓位一次性打满。`,
        `${playbook.manage} 若价格进入 ${takeProfit}，先把止损位上移到成本附近或最近支撑位，保护已有利润；若没有进入止盈区间，则按 ${plan.horizon} 跟踪，不频繁改计划。`,
      ],
    },
    {
      title: "仓位纪律",
      items: [
        positionText,
        `已有持仓的用户，把本次建议仓位理解为“总仓位上限”，不是新增仓位额度。例如计划上限为 ${plan.positionRange[1]}%，而账户里已经有 20%，则只计算还差多少，不重复加仓。`,
        `无仓用户不要在同一价格一次性买满。更稳的节奏是：靠近入场区间先试一笔，收盘仍强再补一笔，突破后回踩不破再考虑最后一笔。`,
      ],
    },
    {
      title: "风险触发与复盘",
      items: [
        `失效条件：${plan.invalidation} 触发后先降低风险，再复盘原因，不用等 DeepSeek 或下一次评分来确认。`,
        `风险等级为${plan.riskLevel}。若 RSI14 继续升至 75 以上、成交量突然超过 20 日均量 3 倍，或价格跌回 ${ma20}/${ma60} 下方，短线胜率会下降，应减少追涨和加仓动作。`,
        `复盘重点看三项：收盘是否站在关键均线上方、成交量是否支持价格方向、评分是否连续改善。只有这三项同时向好，才把本次信号视为可延续；否则按观察或减仓处理。`,
      ],
    },
  ];
}

export function flattenVisibleAdvice(sections: AdviceSection[]) {
  return sections
    .map((section) => `${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");
}

export function buildVisibleAdviceText(report: AnalysisReport) {
  return flattenVisibleAdvice(buildVisibleAdvice(report));
}

function getSignalPlaybook(signal: OperationSignal) {
  switch (signal) {
    case "BUY":
      return {
        posture: "当前属于进攻型信号，但仍然只适合按计划分批，不适合满仓或追涨。",
        entry: "买入动作以“回踩不破、放量不过热”为前提，优先在参考入场区间内完成试仓。",
        manage: "持有后以 MA5/MA10 作为短线强弱观察线，强势不破可以继续持有，跌破并放量则降低仓位。",
      };
    case "ACCUMULATE":
      return {
        posture: "当前更适合试仓，不是无条件买入；核心是用小仓位验证信号是否继续增强。",
        entry: "试仓动作只在价格回到参考区间且没有放量破位时执行，首笔仓位保持克制。",
        manage: "试仓后如果评分继续上行、价格站稳短期均线，再考虑加到计划仓位；若信号转弱，试仓要快速收回。",
      };
    case "HOLD":
      return {
        posture: "当前偏向持有观察，已有仓位可以按风控继续跟踪，无仓不宜急着追入。",
        entry: "无仓用户等待回踩确认或重新放量突破；已有仓位以守住关键均线和止损线为主要判断。",
        manage: "持有期间不因盘中小波动频繁交易，重点看收盘价是否维持在关键支撑上方。",
      };
    case "WATCH":
      return {
        posture: "当前信号还不够扎实，观察价值高于交易价值，适合等待更清晰的右侧确认。",
        entry: "若一定要试错，只能用很小仓位，并且必须贴近参考区间下沿或关键支撑，不能追高。",
        manage: "观察阶段以记录信号变化为主，评分没有提升前不扩大仓位，破位时直接取消计划。",
      };
    case "REDUCE":
      return {
        posture: "当前偏防守，系统提示降低风险暴露，优先处理已有仓位而不是寻找加仓理由。",
        entry: "不建议新开仓；如果盘中反弹到压力位，应优先评估减仓机会，而不是把反弹当成趋势恢复。",
        manage: "已有仓位可以逢反弹分批降低，保留的底仓也必须服从止损线和评分变化。",
      };
    case "STOP_LOSS":
      return {
        posture: "当前属于止损信号，首要任务是控制损失和避免扩大仓位。",
        entry: "不做新买入，除非后续重新站回关键均线并生成新的有效信号。",
        manage: "已有仓位按止损纪律处理，退出后至少等待一个完整交易日再复盘，不急于当天反手。",
      };
    default:
      return {
        posture: "当前以规则引擎信号为准，按仓位和止损执行。",
        entry: "执行时保持分批和限价纪律。",
        manage: "持仓后持续跟踪评分、均线和成交量。",
      };
  }
}

function formatLevel(value: number | null, label: string) {
  return value !== null ? `${label} ${formatNumber(value)}` : label;
}

function describeTrend(price: number, ma20: number | null, ma60: number | null) {
  if (ma20 && ma60 && price > ma20 && price > ma60) {
    return `当前价位于 MA20 ${formatNumber(ma20)} 和 MA60 ${formatNumber(ma60)} 上方，趋势结构相对主动。`;
  }

  if (ma20 && price > ma20) {
    return `当前价站上 MA20 ${formatNumber(ma20)}，但中期趋势仍要继续观察 MA60。`;
  }

  if (ma20) {
    return `当前价仍在 MA20 ${formatNumber(ma20)} 附近或下方，追涨性价比不足，需要等待重新站稳。`;
  }

  return "均线样本不足，趋势判断需要结合后续数据继续确认。";
}

function describeMomentum(rsi14: number | null, macdHistogram: number | null) {
  const rsiText = rsi14 ? `RSI14 为 ${rsi14.toFixed(1)}` : "RSI14 暂无有效值";
  const macdText =
    macdHistogram === null
      ? "MACD 柱线暂无有效值"
      : macdHistogram >= 0
        ? "MACD 柱线为正，短线动量偏强"
        : "MACD 柱线为负，短线动量仍需修复";

  if (rsi14 && rsi14 > 75) {
    return `${rsiText}，短线偏热，${macdText}。`;
  }

  if (rsi14 && rsi14 < 40) {
    return `${rsiText}，短线偏弱或处于修复初期，${macdText}。`;
  }

  return `${rsiText}，处于相对可跟踪区间，${macdText}。`;
}

function describeVolume(volumeRatio: number) {
  if (volumeRatio >= 3) {
    return `成交量较 20 日均量放大 ${formatPercent((volumeRatio - 1) * 100)}，资金关注度很高，但也要防范放量冲高回落。`;
  }

  if (volumeRatio >= 1.2) {
    return `成交量较 20 日均量放大 ${formatPercent((volumeRatio - 1) * 100)}，量能配合有所改善。`;
  }

  if (volumeRatio >= 0.8) {
    return "成交量接近 20 日均量，确认度中等，需要价格继续配合。";
  }

  return "成交量低于 20 日均量，资金确认度不足，信号需要打折处理。";
}
