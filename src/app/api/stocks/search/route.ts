import { NextRequest } from "next/server";
import { getMarketDataProvider } from "@/lib/market/provider";
import { ok, fail } from "@/lib/server/json";
import { checkRateLimit } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = checkRateLimit(`search:${ip}`, 90);

  if (!limited.allowed) {
    return fail("搜索太频繁，请稍后再试。", 429);
  }

  const provider = getMarketDataProvider();
  const results = await provider.search(query);

  return ok({ results });
}

