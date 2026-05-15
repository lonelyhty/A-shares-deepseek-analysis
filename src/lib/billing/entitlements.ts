import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/env";
import { getPlanDailyLimit } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const plan: SubscriptionPlan = isAdminEmail(user.email) ? "admin" : "free";
  const limit = getPlanDailyLimit(plan);

  let existing: UserSubscription | null = null;

  try {
    const { data, error: selectError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      return fallbackSubscription(user, plan, limit);
    }

    existing = data as UserSubscription | null;
  } catch {
    return fallbackSubscription(user, plan, limit);
  }

  if (existing) {
    return normalizeSubscription(existing, user.email);
  }

  try {
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
      return fallbackSubscription(user, plan, limit);
    }

    return inserted as UserSubscription;
  } catch {
    return fallbackSubscription(user, plan, limit);
  }
}

export async function getEntitlementState(
  supabase: SupabaseClient,
  user: User,
): Promise<EntitlementState> {
  try {
    const db = createAdminClient() ?? supabase;
    const subscription = await getOrCreateSubscription(db, user);
    const usageDate = todayKey();
    const { data, error: usageError } = await db
      .from("usage_counters")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", usageDate)
      .eq("event_type", ANALYSIS_EVENT)
      .maybeSingle();

    const usedToday = usageError ? 0 : Number(data?.count ?? 0);
    const limit = Number(subscription.analysis_daily_limit ?? getPlanDailyLimit(subscription.plan));
    const remainingToday = Math.max(0, limit - usedToday);

    return {
      subscription,
      usedToday,
      remainingToday,
      allowed: isSubscriptionActive(subscription) && remainingToday > 0,
    };
  } catch {
    return fallbackEntitlementState(user);
  }
}

export function fallbackEntitlementState(user: User): EntitlementState {
  const plan: SubscriptionPlan = isAdminEmail(user.email) ? "admin" : "free";
  const limit = getPlanDailyLimit(plan);
  const subscription = fallbackSubscription(user, plan, limit);

  return {
    subscription,
    usedToday: 0,
    remainingToday: limit,
    allowed: true,
  };
}

export async function incrementAnalysisUsage(
  supabase: SupabaseClient,
  user: User,
) {
  try {
    const db = createAdminClient() ?? supabase;
    const usageDate = todayKey();
    const { data, error: selectError } = await db
      .from("usage_counters")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", usageDate)
      .eq("event_type", ANALYSIS_EVENT)
      .maybeSingle();

    if (selectError) {
      return;
    }

    if (data) {
      await db
        .from("usage_counters")
        .update({
          count: Number(data.count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return;
    }

    await db.from("usage_counters").insert({
      user_id: user.id,
      usage_date: usageDate,
      event_type: ANALYSIS_EVENT,
      count: 1,
    });
  } catch {
    return;
  }
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

function fallbackSubscription(
  user: User,
  plan: SubscriptionPlan,
  limit: number,
): UserSubscription {
  const now = new Date().toISOString();

  return {
    id: `fallback-${user.id}`,
    user_id: user.id,
    plan,
    status: "active",
    analysis_daily_limit: limit,
    current_period_start: now,
    current_period_end: null,
    provider: null,
    provider_customer_id: null,
    provider_subscription_id: null,
    metadata: { source: "fallback" },
    created_at: now,
    updated_at: now,
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
