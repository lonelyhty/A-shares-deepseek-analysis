import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/env";
import { getPlanDailyLimit } from "@/lib/billing/plans";
import type { SubscriptionPlan, UserSubscription } from "@/lib/types";

const ANALYSIS_EVENT = "analysis.run";

export type EntitlementState = {
  subscription: UserSubscription;
  usedToday: number;
  remainingToday: number;
  allowed: boolean;
};

export async function getOrCreateSubscription(
  supabase: SupabaseClient,
  user: User,
): Promise<UserSubscription> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    return normalizeSubscription(data as UserSubscription, user.email);
  }

  const plan: SubscriptionPlan = isAdminEmail(user.email) ? "admin" : "free";
  const limit = getPlanDailyLimit(plan);
  const { data: inserted, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan,
      status: "active",
      analysis_daily_limit: limit,
      metadata: { source: "auto-created" },
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return inserted as UserSubscription;
}

export async function getEntitlementState(
  supabase: SupabaseClient,
  user: User,
): Promise<EntitlementState> {
  const subscription = await getOrCreateSubscription(supabase, user);
  const usageDate = todayKey();
  const { data } = await supabase
    .from("usage_counters")
    .select("*")
    .eq("user_id", user.id)
    .eq("usage_date", usageDate)
    .eq("event_type", ANALYSIS_EVENT)
    .maybeSingle();

  const usedToday = Number(data?.count ?? 0);
  const limit = Number(subscription.analysis_daily_limit ?? getPlanDailyLimit(subscription.plan));
  const remainingToday = Math.max(0, limit - usedToday);

  return {
    subscription,
    usedToday,
    remainingToday,
    allowed: isSubscriptionActive(subscription) && remainingToday > 0,
  };
}

export async function incrementAnalysisUsage(
  supabase: SupabaseClient,
  user: User,
) {
  const usageDate = todayKey();
  const { data } = await supabase
    .from("usage_counters")
    .select("*")
    .eq("user_id", user.id)
    .eq("usage_date", usageDate)
    .eq("event_type", ANALYSIS_EVENT)
    .maybeSingle();

  if (data) {
    await supabase
      .from("usage_counters")
      .update({
        count: Number(data.count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return;
  }

  await supabase.from("usage_counters").insert({
    user_id: user.id,
    usage_date: usageDate,
    event_type: ANALYSIS_EVENT,
    count: 1,
  });
}

function normalizeSubscription(subscription: UserSubscription, email?: string | null) {
  if (!isAdminEmail(email)) {
    return subscription;
  }

  return {
    ...subscription,
    plan: "admin" as const,
    status: "active" as const,
    analysis_daily_limit: Math.max(subscription.analysis_daily_limit ?? 0, getPlanDailyLimit("admin")),
  };
}

function isSubscriptionActive(subscription: UserSubscription) {
  if (!["active", "trialing"].includes(subscription.status)) {
    return false;
  }

  if (!subscription.current_period_end) {
    return true;
  }

  return new Date(subscription.current_period_end).getTime() > Date.now();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
