import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative rounded-md border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl">
      <div className="q-grid-bg pointer-events-none absolute inset-0 rounded-md opacity-20" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-300/70 via-transparent to-emerald-300/50" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-300/12 text-cyan-200 ring-1 ring-cyan-300/25">
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            {eyebrow ? <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/70">{eyebrow}</div> : null}
          </div>
          <h1 className={cn("mt-3 text-2xl font-semibold tracking-tight text-white", !Icon && !eyebrow && "mt-0")}>{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
        {children ? <div className="relative shrink-0">{children}</div> : null}
      </div>
    </section>
  );
}
