import { getMarketDataProvider } from "@/lib/market/provider";
import { fail, ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { response } = await requireUser();

  if (response) {
    return response;
  }

  try {
    const { symbol } = await context.params;
    const quote = await getMarketDataProvider().getQuote(symbol);
    return ok({ quote });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "行情获取失败。");
  }
}

