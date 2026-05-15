import { demoSearch, createDemoHistory, createDemoQuote } from "@/lib/market/mock-data";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fetchWithTimeout } from "@/lib/server/fetch";
import type { KlineBar, MarketDataProvider, StockQuote, StockSearchResult } from "@/lib/types";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        chartPreviousClose?: number;
        currency?: string;
        longName?: string;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketPrice?: number;
        regularMarketVolume?: number;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          amount?: Array<number | null>;
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          open?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const knownNames: Record<string, string> = {
  "000001": "平安银行",
  "000858": "五粮液",
  "300750": "宁德时代",
  "600036": "招商银行",
  "600519": "贵州茅台",
  "601318": "中国平安",
};

export class YahooProvider implements MarketDataProvider {
  async search(query: string): Promise<StockSearchResult[]> {
    return demoSearch(query);
  }

  async getQuote(symbolInput: string): Promise<StockQuote> {
    const symbol = normalizeSymbol(symbolInput);
    const yahooSymbol = toYahooSymbol(symbolInput);

    if (!yahooSymbol) {
      return createDemoQuote(symbolInput);
    }

    try {
      const chart = await getYahooChart(yahooSymbol, "1d", "1d", 2_000);
      const meta = chart.meta;
      const quote = chart.indicators?.quote?.[0];
      const price = meta?.regularMarketPrice ?? lastValue(quote?.close);
      const previousClose = meta?.chartPreviousClose ?? null;

      if (!price || !Number.isFinite(price)) {
        return createDemoQuote(symbolInput);
      }

      const change = previousClose ? price - previousClose : null;

      return {
        symbol: symbol.display,
        code: symbol.code,
        name: knownNames[symbol.code] ?? meta?.longName ?? meta?.shortName ?? symbol.code,
        exchange: symbol.exchange,
        market: "A股",
        price,
        open: lastValue(quote?.open),
        high: meta?.regularMarketDayHigh ?? lastValue(quote?.high),
        low: meta?.regularMarketDayLow ?? lastValue(quote?.low),
        previousClose,
        change,
        changePercent: change && previousClose ? (change / previousClose) * 100 : null,
        volume: meta?.regularMarketVolume ?? lastValue(quote?.volume),
        amount: estimateAmount(meta?.regularMarketVolume ?? lastValue(quote?.volume), price),
        turnoverRate: null,
        pe: null,
        pb: null,
        marketCap: null,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return createDemoQuote(symbolInput);
    }
  }

  async getHistory(symbolInput: string, days = 380): Promise<KlineBar[]> {
    const yahooSymbol = toYahooSymbol(symbolInput);

    if (!yahooSymbol) {
      return createDemoHistory(symbolInput, days);
    }

    try {
      const chart = await getYahooChart(yahooSymbol, "2y", "1d", 2_500);
      const timestamps = chart.timestamp ?? [];
      const quote = chart.indicators?.quote?.[0];
      const bars = timestamps
        .map((timestamp, index): KlineBar | null => {
          const close = quote?.close?.[index];
          const open = quote?.open?.[index];
          const high = quote?.high?.[index];
          const low = quote?.low?.[index];

          if (!close || !open || !high || !low) {
            return null;
          }

          const volume = quote?.volume?.[index] ?? 0;

          return {
            date: new Date(timestamp * 1000).toISOString().slice(0, 10),
            open,
            close,
            high,
            low,
            volume,
            amount: estimateAmount(volume, close) ?? 0,
            turnoverRate: null,
          };
        })
        .filter((bar): bar is KlineBar => Boolean(bar));

      return bars.length >= 80 ? bars.slice(-days) : createDemoHistory(symbolInput, days);
    } catch {
      return createDemoHistory(symbolInput, days);
    }
  }
}

async function getYahooChart(
  yahooSymbol: string,
  range: string,
  interval: string,
  timeoutMs: number,
) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`);
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 QFactor",
    },
    cache: "no-store",
    timeoutMs,
  });
  const json = (await response.json()) as YahooChartResponse;
  const chart = json.chart?.result?.[0];

  if (!chart) {
    throw new Error("Yahoo chart returned no result");
  }

  return chart;
}

function toYahooSymbol(symbolInput: string) {
  const symbol = normalizeSymbol(symbolInput);

  if (symbol.exchange === "SH") {
    return `${symbol.code}.SS`;
  }

  if (symbol.exchange === "SZ") {
    return `${symbol.code}.SZ`;
  }

  return null;
}

function lastValue(values?: Array<number | null>) {
  return [...(values ?? [])].reverse().find((value): value is number => typeof value === "number") ?? null;
}

function estimateAmount(volume: number | null | undefined, price: number | null | undefined) {
  if (!volume || !price) {
    return null;
  }

  return Math.round(volume * price);
}
