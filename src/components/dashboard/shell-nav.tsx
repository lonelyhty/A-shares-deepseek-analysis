"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenText, CreditCard, Gauge, Settings, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

const icons = {
  gauge: Gauge,
  screener: BarChart3,
  star: Star,
  reports: BookOpenText,
  billing: CreditCard,
  settings: Settings,
  admin: ShieldCheck,
};

export function ShellNav({ items }: { items: ShellNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="relative space-y-1 px-3 py-2">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 transition",
              active
                ? "bg-cyan-300/14 text-white shadow-[inset_2px_0_0_rgba(103,232,249,0.95)]"
                : "hover:bg-cyan-300/12 hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-cyan-200" : "text-cyan-200/75 group-hover:text-cyan-200")} />
            {item.label}
            {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileShellNav({ items }: { items: ShellNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-cyan-200/30 bg-slate-950/95 text-white shadow-2xl lg:hidden">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] transition",
              active ? "text-cyan-100" : "text-slate-300",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-cyan-200" : "text-cyan-200/70")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
