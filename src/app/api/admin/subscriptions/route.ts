import { z } from "zod";
import { getPlanDailyLimit } from "@/lib/billing/plans";
import { fail, ok } from "@/lib/server/json";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "pro", "premium", "admin"]),
  status: z.enum(["active", "trialing", "past_due", "canceled", "expired"]).default("active"),
  analysisDailyLimit: z.number().int().min(0).max(9999).optional(),
  currentPeriodEnd: z.string().nullable().optional(),
});

export async function GET() {
  const { response } = await requireAdmin();

  if (response) {
    return response;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return fail("缺少 SUPABASE_SERVICE_ROLE_KEY，无法读取全站订阅后台。", 500);
  }

  const [{ data: subscriptions, error: subscriptionsError }, { data: usage, error: usageError }] =
    await Promise.all([
      supabase.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase
        .from("usage_counters")
        .select("*")
        .eq("usage_date", new Date().toISOString().slice(0, 10))
        .order("count", { ascending: false })
        .limit(200),
    ]);

  if (subscriptionsError || usageError) {
    return fail(subscriptionsError?.message || usageError?.message || "后台数据读取失败。", 500);
  }

  return ok({ subscriptions: subscriptions ?? [], usage: usage ?? [] });
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();

  if (response) {
    return response;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return fail("缺少 SUPABASE_SERVICE_ROLE_KEY，无法更新订阅。", 500);
  }

  try {
    const body = updateSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: body.userId,
          plan: body.plan,
          status: body.status,
          analysis_daily_limit: body.analysisDailyLimit ?? getPlanDailyLimit(body.plan),
          current_period_end: body.currentPeriodEnd ?? null,
          metadata: { source: "admin-panel" },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) {
      return fail(error.message, 500);
    }

    return ok({ subscription: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "订阅更新失败。");
  }
}
