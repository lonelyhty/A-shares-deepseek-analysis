import type { SubscriptionPlan } from "@/lib/types";

export const planLimits: Record<SubscriptionPlan, number> = {
  free: 3,
  pro: 50,
  premium: 200,
  admin: 9999,
};

export const planLabels: Record<SubscriptionPlan, string> = {
  free: "免费版",
  pro: "专业版",
  premium: "旗舰版",
  admin: "管理员",
};

export function getPlanDailyLimit(plan: string | null | undefined) {
  return planLimits[(plan as SubscriptionPlan) || "free"] ?? planLimits.free;
}
