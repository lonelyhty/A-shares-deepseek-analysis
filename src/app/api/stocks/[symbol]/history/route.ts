import { getMarketDataProvider } from "@/lib/market/provider";
import { fail, ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { response } = await requireUser();

  if (response) {
    return response;
  }

  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? "380");
    const { symbol } = await context.params;
    const history = await getMarketDataProvider().getHistory(symbol, days);
    return ok({ history });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "历史行情获取失败。");
  }
}

