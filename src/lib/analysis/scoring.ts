import { calculateIndicators } from "@/lib/analysis/indicators";
import type {
  IndicatorSnapshot,
  KlineBar,
  OperationSignal,
  QuantAnalysis,
  ScoreBreakdown,
  StockQuote,
  TradingPlan,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

export function scoreAnalysis(
  quote: StockQuote,
  history: KlineBar[],
  indicators: IndicatorSnapshot,
): { scores: ScoreBreakdown; plan: TradingPlan; reasons: string[]; warnings: string[] } {
  const close = quote.price || history.at(-1)?.close || 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const trend = scoreTrend(close, indicators, reasons, warnings);
  const momentum = scoreMomentum(indicators, reasons, warnings);
  const volume = scoreVolume(indicators, reasons, warnings);
  const risk = scoreRisk(close, indicators, reasons, warnings);
  const valuation = scoreValuation(quote, reasons, warnings);
  const liquidity = scoreLiquidity(quote, indicators, reasons, warnings);
  const total = Math.round(trend + momentum + volume + risk + valuation + liquidity);
  const scores = { trend, momentum, volume, risk, valuation, liquidity, total };
  const plan = buildTradingPlan(close, scores, indicators);

  return { scores, plan, reasons, warnings };
}

export function buildQuantAnalysis(quote: StockQuote, history: KlineBar[]): QuantAnalysis {
  const indicators = calculateIndicators(history);
  const { scores, plan, reasons, warnings } = scoreAnalysis(quote, history, indicators);

  return {
    symbol: quote.symbol,
    quote,
    history,
    indicators,
    scores,
    plan,
    reasons,
    warnings,
    backtest: runSimpleBacktest(history),
  };
}

function scoreTrend(
  close: number,
  indicators: IndicatorSnapshot,
  reasons: string[],
  warnings: string[],
) {
  let score = 0;
  const { ma5, ma10, ma20, ma60 } = indicators;

  if (ma20 && close > ma20) {
    score += 7;
    reasons.push("收盘价位于 MA20 上方，波段趋势保持多头结构。");
  } else {
    warnings.push("价格仍在 MA20 下方，波段趋势未完全修复。");
  }

  if (ma5 && ma10 && ma20 && ma5 > ma10 && ma10 > ma20) {
    score += 8;
    reasons.push("MA5、MA10、MA20 多头排列，短中期均线配合较好。");
  }

  if (ma60 && close > ma60) {
    score += 6;
  } else {
    warnings.push("价格未稳定站上 MA60，中期趋势仍需确认。");
  }

  if (ma20 && ma60 && ma20 > ma60) {
    score += 4;
  }

  return clamp(score, 0, 25);
}

function scoreMomentum(
  indicators: IndicatorSnapshot,
  reasons: string[],
  warnings: string[],
) {
  let score = 0;

  if ((indicators.macdHistogram ?? -1) > 0) {
    score += 6;
    reasons.push("MACD 柱线位于零轴上方，动量偏强。");
  }

  if ((indicators.macd ?? -1) > (indicators.macdSignal ?? 0)) {
    score += 4;
  }

  const rsi14 = indicators.rsi14 ?? 50;
  if (rsi14 >= 45 && rsi14 <= 70) {
    score += 6;
    reasons.push("RSI14 处于健康区间，未出现明显过热。");
  } else if (rsi14 > 78) {
    warnings.push("RSI14 已偏高，追高回撤风险增加。");
  }

  if ((indicators.kdjK ?? 0) > (indicators.kdjD ?? 100) && (indicators.kdjJ ?? 0) < 100) {
    score += 4;
  }

  return clamp(score, 0, 20);
}

function scoreVolume(
  indicators: IndicatorSnapshot,
  reasons: string[],
  warnings: string[],
) {
  const ratio = indicators.volumeRatio20 ?? 1;
  let score = 6;

  if (ratio >= 1.2 && ratio <= 2.8) {
    score += 7;
    reasons.push("成交量较 20 日均量放大，资金关注度提升。");
  } else if (ratio > 3.5) {
    score += 3;
    warnings.push("成交量异常放大，需防范冲高回落。");
  }

  if (ratio >= 0.8) {
    score += 2;
  }

  return clamp(score, 0, 15);
}

function scoreRisk(
  close: number,
  indicators: IndicatorSnapshot,
  reasons: string[],
  warnings: string[],
) {
  let score = 20;
  const atrPercent = indicators.atr14 ? (indicators.atr14 / close) * 100 : 0;
  const drawdown = indicators.drawdown60 ?? 0;
  const volatility = indicators.volatility20 ?? 0;

  if (atrPercent > 5) {
    score -= 6;
    warnings.push("ATR 波动率偏高，止损和仓位需要更保守。");
  }

  if (drawdown < -25) {
    score -= 5;
    warnings.push("距离 60 日高点回撤较深，趋势修复需要更多确认。");
  }

  if (volatility > 55) {
    score -= 5;
    warnings.push("20 日年化波动率较高，不宜满仓追入。");
  } else {
    reasons.push("近期波动处于可管理区间，适合用分批仓位执行。");
  }

  return clamp(score, 0, 20);
}

function scoreValuation(quote: StockQuote, reasons: string[], warnings: string[]) {
  let score = 5;

  if (quote.pe && quote.pe > 0 && quote.pe < 35) {
    score += 3;
    reasons.push("市盈率处于可解释区间，估值未显著失控。");
  } else if (quote.pe && quote.pe > 80) {
    warnings.push("市盈率较高，需关注估值回落风险。");
  }

  if (quote.pb && quote.pb > 0 && quote.pb < 6) {
    score += 2;
  }

  return clamp(score, 0, 10);
}

function scoreLiquidity(
  quote: StockQuote,
  indicators: IndicatorSnapshot,
  reasons: string[],
  warnings: string[],
) {
  const amountScore = clamp((indicators.liquidityScore ?? 0) * 7, 0, 7);
  let score = amountScore;

  if ((quote.turnoverRate ?? 0) >= 0.6) {
    score += 3;
    reasons.push("换手率和成交额支持普通个人仓位进出。");
  } else {
    warnings.push("换手率偏低时，分批成交和滑点控制更重要。");
  }

  return clamp(score, 0, 10);
}

export function buildTradingPlan(
  close: number,
  scores: ScoreBreakdown,
  indicators: IndicatorSnapshot,
): TradingPlan {
  const signal = mapScoreToSignal(scores.total, indicators) as OperationSignal;
  const atr = indicators.atr14 || close * 0.03;
  const entryWidth = Math.max(atr * 0.35, close * 0.008);
  const stopLoss = signal === "STOP_LOSS" ? close * 0.965 : close - Math.max(atr * 1.8, close * 0.04);
  const positionRange = mapPositionRange(signal, scores.total);

  return {
    signal,
    signalLabel: signalLabel(signal),
    score: scores.total,
    positionRange,
    entryRange: [roundPrice(close - entryWidth), roundPrice(close + entryWidth * 0.4)],
    stopLoss: roundPrice(stopLoss),
    takeProfit: [roundPrice(close + atr * 2), roundPrice(close + atr * 3.2)],
    invalidation: `收盘跌破 ${roundPrice(stopLoss)} 或评分连续两日低于 45 分。`,
    riskLevel: scores.risk >= 15 ? "低" : scores.risk >= 9 ? "中" : "高",
    horizon: "5-20日波段",
  };
}

function mapScoreToSignal(score: number, indicators: IndicatorSnapshot) {
  const belowLowerBand =
    indicators.bollLower !== null &&
    indicators.ma20 !== null &&
    indicators.bollLower > indicators.ma20;

  if (score >= 78) {
    return "BUY";
  }

  if (score >= 66) {
    return "ACCUMULATE";
  }

  if (score >= 54) {
    return "HOLD";
  }

  if (score >= 42 || belowLowerBand) {
    return "WATCH";
  }

  if (score >= 32) {
    return "REDUCE";
  }

  return "STOP_LOSS";
}

function mapPositionRange(signal: OperationSignal, score: number): [number, number] {
  switch (signal) {
    case "BUY":
      return [45, score >= 86 ? 70 : 60];
    case "ACCUMULATE":
      return [25, 45];
    case "HOLD":
      return [15, 35];
    case "WATCH":
      return [0, 15];
    case "REDUCE":
      return [0, 10];
    case "STOP_LOSS":
      return [0, 0];
    default:
      return [0, 0];
  }
}

export function signalLabel(signal: OperationSignal) {
  const labels: Record<OperationSignal, string> = {
    BUY: "买入",
    ACCUMULATE: "试仓",
    HOLD: "持有",
    WATCH: "观望",
    REDUCE: "减仓",
    STOP_LOSS: "止损",
  };

  return labels[signal];
}

function roundPrice(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

export function runSimpleBacktest(history: KlineBar[], windowDays = 252) {
  const bars = history.slice(-windowDays);
  const trades = [];
  let cash = 1;
  let shares = 0;
  let entryPrice = 0;
  let entryDate = "";
  const benchmarkBase = bars[0]?.close || 1;
  let peak = 1;
  let maxDrawdown = 0;
  const equityCurve: Array<{ date: string; equity: number; benchmark: number }> = [];
  const cost = 0.0015;

  for (let i = 60; i < bars.length - 1; i += 1) {
    const slice = bars.slice(0, i + 1);
    const latest = slice.at(-1)!;
    const indicators = calculateIndicators(slice);
    const pseudoQuote = {
      symbol: "BACKTEST",
      code: "BACKTEST",
      name: "BACKTEST",
      exchange: "SH" as const,
      market: "A股",
      price: latest.close,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      previousClose: slice.at(-2)?.close ?? null,
      change: null,
      changePercent: null,
      volume: latest.volume,
      amount: latest.amount,
      turnoverRate: latest.turnoverRate ?? null,
      pe: null,
      pb: null,
      marketCap: null,
      updatedAt: latest.date,
    };
    const { scores, plan } = scoreAnalysis(pseudoQuote, slice, indicators);
    const next = bars[i + 1];

    if (shares === 0 && (plan.signal === "BUY" || (plan.signal === "ACCUMULATE" && scores.total >= 68))) {
      const investRatio = plan.signal === "BUY" ? 0.75 : 0.45;
      const investCash = cash * investRatio;
      shares = (investCash * (1 - cost)) / next.open;
      cash -= investCash;
      entryPrice = next.open;
      entryDate = next.date;
    } else if (shares > 0 && (plan.signal === "REDUCE" || plan.signal === "STOP_LOSS" || latest.close < plan.stopLoss)) {
      const proceeds = shares * next.open * (1 - cost);
      cash += proceeds;
      trades.push({
        entryDate,
        exitDate: next.date,
        entryPrice,
        exitPrice: next.open,
        returnPercent: ((next.open - entryPrice) / entryPrice) * 100 - cost * 200,
        holdingDays: daysBetween(entryDate, next.date),
      });
      shares = 0;
      entryPrice = 0;
      entryDate = "";
    }

    const equity = cash + shares * next.close;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, ((equity - peak) / peak) * 100);
    equityCurve.push({
      date: next.date,
      equity: Number(equity.toFixed(4)),
      benchmark: Number((next.close / benchmarkBase).toFixed(4)),
    });
  }

  if (shares > 0 && bars.length) {
    const last = bars.at(-1)!;
    trades.push({
      entryDate,
      exitDate: last.date,
      entryPrice,
      exitPrice: last.close,
      returnPercent: ((last.close - entryPrice) / entryPrice) * 100 - cost * 100,
      holdingDays: daysBetween(entryDate, last.date),
    });
  }

  const totalReturn = equityCurve.length ? (equityCurve.at(-1)!.equity - 1) * 100 : 0;
  const benchmarkReturn =
    bars.length > 1 ? ((bars.at(-1)!.close - bars[0].close) / bars[0].close) * 100 : 0;
  const wins = trades.filter((trade) => trade.returnPercent > 0).length;
  const averageHoldingDays =
    trades.length > 0
      ? trades.reduce((sum, trade) => sum + trade.holdingDays, 0) / trades.length
      : 0;

  return {
    period: `${bars[0]?.date ?? "--"} 至 ${bars.at(-1)?.date ?? "--"}`,
    totalReturn,
    benchmarkReturn,
    maxDrawdown,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    tradeCount: trades.length,
    averageHoldingDays,
    costAssumption: "单边 0.15% 估算，收盘后信号、次日开盘执行。",
    equityCurve,
    trades,
  };
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}
