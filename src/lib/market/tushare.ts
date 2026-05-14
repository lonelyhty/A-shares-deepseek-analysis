import { EastmoneyProvider } from "@/lib/market/eastmoney";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fetchWithTimeout } from "@/lib/server/fetch";
import type { KlineBar, MarketDataProvider, StockQuote, StockSearchResult } from "@/lib/types";

type TushareResponse = {
  code: number;
  msg: string;
  data?: {
    fields: string[];
    items: Array<Array<string | number | null>>;
  };
};

export class TushareProvider implements MarketDataProvider {
  private fallback = new EastmoneyProvider();

  constructor(private token: string) {}

  async search(query: string): Promise<StockSearchResult[]> {
    const normalized = query.trim();

    if (!this.token || normalized.length < 2) {
      return this.fallback.search(query);
    }

    try {
      const rows = await this.call("stock_basic", {
        exchange: "",
        list_status: "L",
      }, "ts_code,symbol,name,market");

      return rows
        .filter((row) => {
          const code = String(row.symbol ?? "");
          const name = String(row.name ?? "");
          return code.includes(normalized) || name.includes(normalized);
        })
        .slice(0, 10)
        .map((row) => {
          const symbol = normalizeSymbol(String(row.ts_code ?? row.symbol));

          return {
            symbol: symbol.display,
            code: symbol.code,
            name: String(row.name ?? symbol.code),
            exchange: symbol.exchange,
            market: String(row.market ?? "A股"),
          };
        });
    } catch {
      return this.fallback.search(query);
    }
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    return this.fallback.getQuote(symbol);
  }

  async getHistory(symbolInput: string, days = 380): Promise<KlineBar[]> {
    const symbol = normalizeSymbol(symbolInput);

    if (!this.token) {
      return this.fallback.getHistory(symbolInput, days);
    }

    try {
      const rows = await this.call(
        "daily",
        {
          ts_code: symbol.tushareCode,
          start_date: compactDate(days),
        },
        "trade_date,open,high,low,close,vol,amount",
      );

      const bars = rows
        .map((row) => ({
          date: formatTradeDate(String(row.trade_date)),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.vol) * 100,
          amount: Number(row.amount) * 1000,
        }))
        .filter((bar) => Number.isFinite(bar.close))
        .reverse();

      return bars.length >= 80 ? bars : this.fallback.getHistory(symbolInput, days);
    } catch {
      return this.fallback.getHistory(symbolInput, days);
    }
  }

  private async call(
    apiName: string,
    params: Record<string, string | number>,
    fields: string,
  ): Promise<Array<Record<string, string | number | null>>> {
    const response = await fetchWithTimeout("https://api.tushare.pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_name: apiName,
        token: this.token,
        params,
        fields,
      }),
      cache: "no-store",
      timeoutMs: 8_000,
    });
    const json = (await response.json()) as TushareResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(json.msg || "Tushare request failed");
    }

    return json.data.items.map((item) =>
      Object.fromEntries(json.data!.fields.map((field, index) => [field, item[index] ?? null])),
    );
  }
}

function compactDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days * 1.5);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function formatTradeDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
