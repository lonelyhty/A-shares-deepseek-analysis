import { clamp, mean, standardDeviation } from "@/lib/utils";
import type { IndicatorSnapshot, KlineBar } from "@/lib/types";

export function sma(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    return mean(values.slice(index + 1 - period, index + 1));
  });
}

export function ema(values: number[], period: number): Array<number | null> {
  if (!values.length) {
    return [];
  }

  const alpha = 2 / (period + 1);
  let previous = values[0];

  return values.map((value, index) => {
    if (index === 0) {
      previous = value;
      return value;
    }

    previous = value * alpha + previous * (1 - alpha);
    return previous;
  });
}

export function rsi(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index < period) {
      return null;
    }

    const window = values.slice(index - period + 1, index + 1);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < window.length; i += 1) {
      const diff = window[i] - window[i - 1];
      if (diff >= 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    if (losses === 0) {
      return 100;
    }

    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  });
}

export function macd(values: number[]) {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const dif = values.map((_, index) => {
    const fast = ema12[index];
    const slow = ema26[index];

    if (fast === null || slow === null) {
      return null;
    }

    return fast - slow;
  });
  const dea = ema(dif.map((value) => value ?? 0), 9);
  const histogram = dif.map((value, index) =>
    value === null || dea[index] === null ? null : (value - dea[index]!) * 2,
  );

  return { ema12, ema26, dif, dea, histogram };
}

export function bollinger(values: number[], period = 20, multiplier = 2) {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return { upper: null, middle: null, lower: null };
    }

    const window = values.slice(index + 1 - period, index + 1);
    const middle = mean(window);
    const sd = standardDeviation(window);

    return {
      upper: middle + multiplier * sd,
      middle,
      lower: middle - multiplier * sd,
    };
  });
}

export function atr(bars: KlineBar[], period = 14): Array<number | null> {
  const trueRanges = bars.map((bar, index) => {
    if (index === 0) {
      return bar.high - bar.low;
    }

    const prevClose = bars[index - 1].close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose),
    );
  });

  return sma(trueRanges, period);
}

export function kdj(bars: KlineBar[], period = 9) {
  let k = 50;
  let d = 50;

  return bars.map((bar, index) => {
    const start = Math.max(0, index + 1 - period);
    const window = bars.slice(start, index + 1);
    const low = Math.min(...window.map((item) => item.low));
    const high = Math.max(...window.map((item) => item.high));
    const rsv = high === low ? 50 : ((bar.close - low) / (high - low)) * 100;

    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    const j = 3 * k - 2 * d;

    return { k, d, j };
  });
}

export function calculateIndicators(history: KlineBar[]): IndicatorSnapshot {
  const closes = history.map((bar) => bar.close);
  const volumes = history.map((bar) => bar.volume);
  const amounts = history.map((bar) => bar.amount);
  const latestIndex = history.length - 1;
  const ma5 = sma(closes, 5);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const macdData = macd(closes);
  const rsi6 = rsi(closes, 6);
  const rsi14 = rsi(closes, 14);
  const kdjData = kdj(history);
  const boll = bollinger(closes);
  const atr14 = atr(history);
  const volumeMa20 = sma(volumes, 20);
  const latestVolume = volumes[latestIndex] ?? 0;
  const latestVolumeMa = volumeMa20[latestIndex] ?? 0;
  const latestClose = closes[latestIndex] ?? 0;
  const last20 = history.slice(-20);
  const last60 = history.slice(-60);
  const returns20 = closes
    .slice(-21)
    .map((close, index, arr) => (index === 0 ? null : ((close - arr[index - 1]) / arr[index - 1]) * 100))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const avgAmount20 = mean(amounts.slice(-20));

  return {
    ma5: ma5[latestIndex] ?? null,
    ma10: ma10[latestIndex] ?? null,
    ma20: ma20[latestIndex] ?? null,
    ma60: ma60[latestIndex] ?? null,
    ema12: macdData.ema12[latestIndex] ?? null,
    ema26: macdData.ema26[latestIndex] ?? null,
    macd: macdData.dif[latestIndex] ?? null,
    macdSignal: macdData.dea[latestIndex] ?? null,
    macdHistogram: macdData.histogram[latestIndex] ?? null,
    rsi6: rsi6[latestIndex] ?? null,
    rsi14: rsi14[latestIndex] ?? null,
    kdjK: kdjData[latestIndex]?.k ?? null,
    kdjD: kdjData[latestIndex]?.d ?? null,
    kdjJ: kdjData[latestIndex]?.j ?? null,
    bollUpper: boll[latestIndex]?.upper ?? null,
    bollMiddle: boll[latestIndex]?.middle ?? null,
    bollLower: boll[latestIndex]?.lower ?? null,
    atr14: atr14[latestIndex] ?? null,
    volumeRatio20: latestVolumeMa > 0 ? latestVolume / latestVolumeMa : null,
    high20: last20.length ? Math.max(...last20.map((bar) => bar.high)) : null,
    low20: last20.length ? Math.min(...last20.map((bar) => bar.low)) : null,
    high60: last60.length ? Math.max(...last60.map((bar) => bar.high)) : null,
    low60: last60.length ? Math.min(...last60.map((bar) => bar.low)) : null,
    drawdown60: last60.length
      ? ((latestClose - Math.max(...last60.map((bar) => bar.high))) /
          Math.max(...last60.map((bar) => bar.high))) *
        100
      : null,
    volatility20: standardDeviation(returns20) * Math.sqrt(252),
    liquidityScore: clamp(avgAmount20 / 50_000_000, 0, 1),
  };
}

