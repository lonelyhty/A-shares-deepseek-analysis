import { z } from "zod";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fail, ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";

const watchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  note: z.string().optional().nullable(),
});

export async function GET() {
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(error.message, 500);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: Request) {
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  try {
    const body = watchlistSchema.parse(await request.json());
    const symbol = normalizeSymbol(body.symbol);
    const { data, error } = await supabase
      .from("watchlist")
      .upsert(
        {
          user_id: user.id,
          symbol: symbol.display,
          name: body.name,
          note: body.note ?? null,
        },
        { onConflict: "user_id,symbol" },
      )
      .select()
      .single();

    if (error) {
      return fail(error.message, 500);
    }

    return ok({ item: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "自选股保存失败。");
  }
}

export async function DELETE(request: Request) {
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");

  if (!symbol) {
    return fail("缺少 symbol。");
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  if (error) {
    return fail(error.message, 500);
  }

  return ok({ ok: true });
}

