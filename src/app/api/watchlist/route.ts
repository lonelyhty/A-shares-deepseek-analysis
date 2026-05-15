import { z } from "zod";
import { normalizeSymbol } from "@/lib/market/symbol";
import { fail, ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const watchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  note: z.string().optional().nullable(),
});

export async function GET() {
  const { response, user, supabase } = await requireUser();

  if (response) {
    return response;
  }
  if (!user || !supabase) {
    return fail("请先登录。", 401);
  }

  const dataClient = createAdminClient() ?? supabase;
  const { data, error } = await dataClient
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

  if (response) {
    return response;
  }
  if (!user || !supabase) {
    return fail("请先登录。", 401);
  }

  try {
    const body = watchlistSchema.parse(await request.json());
    const symbol = normalizeSymbol(body.symbol);
    const dataClient = createAdminClient() ?? supabase;
    const payload = {
      user_id: user.id,
      symbol: symbol.display,
      name: body.name,
      note: body.note ?? null,
    };
    const { error: deleteError } = await dataClient
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol.display);

    if (deleteError) {
      return fail(deleteError.message, 500);
    }

    const { data, error } = await dataClient
      .from("watchlist")
      .insert(payload)
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

  if (response) {
    return response;
  }
  if (!user || !supabase) {
    return fail("请先登录。", 401);
  }

  const url = new URL(request.url);
  const rawSymbol = url.searchParams.get("symbol");

  if (!rawSymbol) {
    return fail("缺少 symbol。");
  }

  try {
    const symbol = normalizeSymbol(rawSymbol);
    const dataClient = createAdminClient() ?? supabase;
    const { error } = await dataClient
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol.display);

    if (error) {
      return fail(error.message, 500);
    }

    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "自选股删除失败。");
  }
}
