import type { KlineBar, StockQuote, StockSearchResult } from "@/lib/types";
import { normalizeSymbol } from "@/lib/market/symbol";

const demoNames: Record<string, string> = {
  "600519": "贵州茅台",
  "000001": "平安银行",
  "300750": "宁德时代",
  "601318": "中国平安",
  "600036": "招商银行",
  "000858": "五粮液",
};

export function createDemoQuote(symbolInput: string): StockQuote {
  const symbol = normalizeSymbol(symbolInput);
  const history = createDemoHistory(symbolInput, 320);
  const latest = history.at(-1)!;
  const prev = history.at(-2)!;
  const change = latest.close - prev.close;

  return {
    symbol: symbol.display,
    code: symbol.code,
    name: demoNames[symbol.code] ?? `A股 ${symbol.code}`,
    exchange: symbol.exchange,
    market: "A股",
    price: latest.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    previousClose: prev.close,
    change,
    changePercent: (change / prev.close) * 100,
    volume: latest.volume,
    amount: latest.amount,
    turnoverRate: latest.turnoverRate ?? 1.2,
    pe: symbol.code === "600519" ? 27.4 : 18.6,
    pb: symbol.code === "600519" ? 8.2 : 1.7,
    marketCap: symbol.code === "600519" ? 1_980_000_000_000 : 280_000_000_000,
    updatedAt: new Date().toISOString(),
  };
}

export function createDemoHistory(symbolInput: string, days = 320): KlineBar[] {
  const symbol = normalizeSymbol(symbolInput);
  const seed = Number(symbol.code.slice(0, 3)) + Number(symbol.code.slice(3));
  const base = symbol.code === "600519" ? 1550 : symbol.code.startsWith("3") ? 185 : 28;
  const bars: KlineBar[] = [];
  let close = base;
  const date = new Date();

  date.setDate(date.getDate() - days * 1.45);

  for (let i = 0; i < days; i += 1) {
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const wave = Math.sin((i + seed) / 13) * 0.018 + Math.cos((i + seed) / 29) * 0.012;
    const drift = i > days * 0.72 ? 0.0018 : i > days * 0.45 ? -0.0007 : 0.0008;
    const daily = wave + drift + pseudoRandom(seed + i) * 0.018 - 0.009;
    const open = close * (1 + pseudoRandom(seed * 3 + i) * 0.012 - 0.006);
    close = Math.max(1, close * (1 + daily));
    const high = Math.max(open, close) * (1 + pseudoRandom(seed * 7 + i) * 0.018);
    const low = Math.min(open, close) * (1 - pseudoRandom(seed * 11 + i) * 0.018);
    const volume = Math.round((18_000_000 + pseudoRandom(seed * 13 + i) * 38_000_000) * (1 + Math.max(daily, 0) * 8));

    bars.push({
      date: date.toISOString().slice(0, 10),
      open: round(open),
      close: round(close),
      high: round(high),
      low: round(low),
      volume,
      amount: Math.round(volume * close),
      turnoverRate: round(0.6 + pseudoRandom(seed * 17 + i) * 2.8),
    });
  }

  return bars;
}

export function demoSearch(query: string): StockSearchResult[] {
  const normalizedQuery = query.trim();
  const entries = Object.entries(demoNames)
    .filter(([code, name]) => code.includes(normalizedQuery) || name.includes(normalizedQuery))
    .slice(0, 8);

  return entries.map(([code, name]) => {
    const symbol = normalizeSymbol(code);
    const quote = createDemoQuote(code);

    return {
      symbol: symbol.display,
      code,
      name,
      exchange: symbol.exchange,
      market: "A股",
      price: quote.price,
      changePercent: quote.changePercent,
    };
  });
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
