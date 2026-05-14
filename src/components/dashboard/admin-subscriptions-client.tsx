"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionPlan, UsageCounter, UserSubscription } from "@/lib/types";

export function AdminSubscriptionsClient({
  initialSubscriptions,
  initialUsage,
}: {
  initialSubscriptions: UserSubscription[];
  initialUsage: UsageCounter[];
}) {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>(initialSubscriptions);
  const [usage] = useState<UsageCounter[]>(initialUsage);
  const [editing, setEditing] = useState<Record<string, { plan: SubscriptionPlan; limit: number; status: string }>>({});
  const usageByUser = useMemo(
    () => new Map(usage.map((item) => [item.user_id, item])),
    [usage],
  );

  async function save(subscription: UserSubscription) {
    const draft = editing[subscription.user_id] ?? {
      plan: subscription.plan,
      limit: subscription.analysis_daily_limit,
      status: subscription.status,
    };
    const response = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: subscription.user_id,
        plan: draft.plan,
        status: draft.status,
        analysisDailyLimit: Number(draft.limit),
        currentPeriodEnd: subscription.current_period_end,
      }),
    });
    const json = (await response.json()) as { subscription?: UserSubscription; error?: string };

    if (json.subscription) {
      setSubscriptions((current) =>
        current.map((item) => (item.user_id === subscription.user_id ? json.subscription! : item)),
      );
      setEditing((current) => {
        const next = { ...current };
        delete next[subscription.user_id];
        return next;
      });
    }
  }

  if (!subscriptions.length) {
    return (
      <div className="rounded-md bg-slate-50 p-6 text-sm text-slate-600">
        暂无订阅记录。用户首次调用分析接口时会自动创建免费订阅。
      </div>
    );
  }

  return (
    <div className="overflow-auto q-scrollbar">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-slate-950 text-left text-xs text-slate-300">
          <tr>
            <th className="px-4 py-3">用户</th>
            <th className="px-4 py-3">套餐</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">每日额度</th>
            <th className="px-4 py-3">今日用量</th>
            <th className="px-4 py-3">周期结束</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => {
            const draft = editing[subscription.user_id] ?? {
              plan: subscription.plan,
              limit: subscription.analysis_daily_limit,
              status: subscription.status,
            };
            const used = usageByUser.get(subscription.user_id)?.count ?? 0;

            return (
              <tr key={subscription.id} className="border-t border-slate-100">
                <td className="max-w-[260px] px-4 py-3">
                  <div className="truncate font-medium text-slate-950">{subscription.user_id}</div>
                  <div className="text-xs text-slate-500">{new Date(subscription.created_at).toLocaleString("zh-CN")}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                    value={draft.plan}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [subscription.user_id]: { ...draft, plan: event.target.value as SubscriptionPlan },
                      }))
                    }
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="premium">premium</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={draft.status === "active" ? "teal" : "amber"}>{draft.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    className="h-9 w-28"
                    value={draft.limit}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [subscription.user_id]: { ...draft, limit: Number(event.target.value) },
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-3 font-semibold">
                  {used} / {draft.limit}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("zh-CN") : "长期"}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" onClick={() => save(subscription)}>
                    <Save className="h-4 w-4" />
                    保存
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
