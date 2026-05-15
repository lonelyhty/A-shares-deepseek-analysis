import { demoSearch, createDemoHistory, createDemoQuote } from "@/lib/market/mock-data";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fetchWithTimeout } from "@/lib/server/fetch";
import type { KlineBar, MarketDataProvider, StockQuote, StockSearchResult } from "@/lib/types";

type EastmoneyQuoteResponse = {
  data?: {
    f43?: number;
    f44?: number;
    f45?: number;
    f46?: number;
    f47?: number;
    f48?: number;
    f57?: string;
    f58?: string;
    f60?: number;
    f84?: number;
    f116?: number;
    f162?: number;
    f167?: number;
    f168?: number;
    f170?: number;
  };
};

type EastmoneyKlineResponse = {
  data?: {
    code?: string;
    name?: string;
    klines?: string[];
  };
};

type EastmoneySearchResponse = {
  QuotationCodeTable?: {
    Data?: Array<{
      Code: string;
      Name: string;
      MktNum?: string;
      SecurityTypeName?: string;
    }>;
  };
};

export class EastmoneyProvider implements MarketDataProvider {
  async search(query: string): Promise<StockSearchResult[]> {
    if (!query.trim()) {
      return demoSearch("600");
    }

    try {
      const url = new URL("https://searchapi.eastmoney.com/api/suggest/get");
      url.searchParams.set("input", query.trim());
      url.searchParams.set("type", "14");
      url.searchParams.set("token", "D43BF722C8E33BDC906FB84D85E326E8");
      url.searchParams.set("count", "10");
      const response = await fetchWithTimeout(url, {
        headers: {
          Referer: "https://quote.eastmoney.com/",
          "User-Agent": "Mozilla/5.0 QFactor",
        },
        cache: "no-store",
        timeoutMs: 1_200,
      });
      const json = (await response.json()) as EastmoneySearchResponse;
      const rows = json.QuotationCodeTable?.Data ?? [];

      return rows
        .filter((row) => /^\d{6}$/.test(row.Code))
        .map((row) => {
          const symbol = normalizeSymbol(row.Code);

          return {
            symbol: symbol.display,
            code: symbol.code,
            name: row.Name,
            exchange: symbol.exchange,
            market: row.SecurityTypeName || "A股",
          };
        });
    } catch {
      return demoSearch(query);
    }
  }

  async getQuote(symbolInput: string): Promise<StockQuote> {
    const symbol = normalizeSymbol(symbolInput);

    try {
      const url = new URL("https://push2.eastmoney.com/api/qt/stock/get");
      url.searchParams.set("secid", symbol.eastmoneySecid);
      url.searchParams.set("fields", "f43,f44,f45,f46,f47,f48,f57,f58,f60,f84,f116,f162,f167,f168,f170");
      const response = await fetchWithTimeout(url, {
        headers: {
          Referer: "https://quote.eastmoney.com/",
          "User-Agent": "Mozilla/5.0 QFactor",
        },
        cache: "no-store",
        timeoutMs: 1_500,
      });
      const json = (await response.json()) as EastmoneyQuoteResponse;
      const data = json.data;

      if (!data || data.f43 === undefined || data.f43 === 0) {
        return createDemoQuote(symbolInput);
      }

      const price = numberFromEastmoney(data.f43);

      if (price === null) {
        return createDemoQuote(symbolInput);
      }

      const previousClose = numberFromEastmoney(data.f60);
      const change = previousClose ? price - previousClose : null;

      return {
        symbol: symbol.display,
        code: symbol.code,
        name: data.f58 || symbol.code,
        exchange: symbol.exchange,
        market: "A股",
        price,
        open: numberFromEastmoney(data.f46),
        high: numberFromEastmoney(data.f44),
        low: numberFromEastmoney(data.f45),
        previousClose,
        change,
        changePercent: numberFromEastmoney(data.f170),
        volume: data.f47 ?? null,
        amount: data.f48 ?? null,
        turnoverRate: numberFromEastmoney(data.f168),
        pe: numberFromEastmoney(data.f162),
        pb: numberFromEastmoney(data.f167),
        marketCap: data.f116 ?? null,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return createDemoQuote(symbolInput);
    }
  }

  async getHistory(symbolInput: string, days = 380): Promise<KlineBar[]> {
    const symbol = normalizeSymbol(symbolInput);

    try {
      const url = new URL("https://push2his.eastmoney.com/api/qt/stock/kline/get");
      url.searchParams.set("secid", symbol.eastmoneySecid);
      url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
      url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f61");
      url.searchParams.set("klt", "101");
      url.searchParams.set("fqt", "1");
      url.searchParams.set("beg", "0");
      url.searchParams.set("end", "20500101");
      url.searchParams.set("lmt", String(days));
      const response = await fetchWithTimeout(url, {
        headers: {
          Referer: "https://quote.eastmoney.com/",
          "User-Agent": "Mozilla/5.0 QFactor",
        },
        cache: "no-store",
        timeoutMs: 1_800,
      });
      const json = (await response.json()) as EastmoneyKlineResponse;
      const klines = json.data?.klines ?? [];

      if (!klines.length) {
        return createDemoHistory(symbolInput, days);
      }

      return klines.map(parseKline).filter((bar): bar is KlineBar => Boolean(bar));
    } catch {
      return createDemoHistory(symbolInput, days);
    }
  }
}

function parseKline(line: string): KlineBar | null {
  const [date, open, close, high, low, volume, amount, turnover] = line.split(",");

  if (!date || !open || !close) {
    return null;
  }

  return {
    date,
    open: Number(open),
    close: Number(close),
    high: Number(high),
    low: Number(low),
    volume: Number(volume),
    amount: Number(amount),
    turnoverRate: Number(turnover),
  };
}

function numberFromEastmoney(value: number | undefined) {
  if (value === undefined || value === null || value === -1) {
    return null;
  }

  return value / 100;
}
