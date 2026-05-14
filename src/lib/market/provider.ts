import { EastmoneyProvider } from "@/lib/market/eastmoney";
import { TushareProvider } from "@/lib/market/tushare";
import type { MarketDataProvider } from "@/lib/types";

export function getMarketDataProvider(): MarketDataProvider {
  const token = process.env.TUSHARE_TOKEN;

  if (token) {
    return new TushareProvider(token);
  }

  return new EastmoneyProvider();
}

