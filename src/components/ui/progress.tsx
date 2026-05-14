import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded bg-slate-200", className)}>
      <div
        className="h-full rounded bg-cyan-700 shadow-[0_0_12px_rgba(8,145,178,0.35)] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
