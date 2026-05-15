import { Activity, ListChecks } from "lucide-react";
import { MobileShellNav, ShellNav, type ShellNavItem } from "@/components/dashboard/shell-nav";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const userNav: ShellNavItem[] = [
  { href: "/dashboard", label: "驾驶舱", icon: "gauge" },
  { href: "/watchlist", label: "自选股", icon: "star" },
  { href: "/reports", label: "历史报告", icon: "reports" },
  { href: "/billing", label: "订阅", icon: "billing" },
];

const adminNav: ShellNavItem[] = [
  { href: "/admin", label: "后台", icon: "admin" },
  { href: "/settings", label: "设置", icon: "settings" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  let email = "Supabase 未配置";
  let isAdmin = !isSupabaseConfigured() && isAdminEmail(process.env.LOCAL_ADMIN_EMAIL);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? "未登录";
    isAdmin = isAdminEmail(user?.email);
  }

  const nav = isAdmin ? [...userNav, ...adminNav] : userNav;

  return (
    <div className="min-h-screen bg-transparent">
      <aside className="q-shell-glow fixed inset-y-0 left-0 hidden w-72 border-r border-cyan-300/15 text-white lg:block">
        <div className="q-grid-bg absolute inset-0 opacity-30" />
        <div className="relative flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-wide text-white">QFactor</div>
            <div className="text-xs text-cyan-100/70">A股量化驾驶舱</div>
          </div>
        </div>
        <div className="relative px-4 py-4">
          <div className="q-tech-panel rounded-md p-3">
            <div className="flex items-center justify-between text-xs text-cyan-100/70">
              <span>Research Engine</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <Activity className="h-3.5 w-3.5" />
                Online
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-4/5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
            </div>
          </div>
        </div>
        <ShellNav items={nav} />
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/45">Account</div>
          <div className="mt-1 truncate text-xs text-cyan-100/75">{email}</div>
          <div className="mt-1 text-xs text-cyan-100/45">{isAdmin ? "站长管理员" : "普通用户"}</div>
          <form action="/api/auth/signout" method="post" className="mt-2">
            <button className="text-xs font-medium text-cyan-200 hover:text-white">退出登录</button>
          </form>
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
      <MobileShellNav items={nav} />
    </div>
  );
}
