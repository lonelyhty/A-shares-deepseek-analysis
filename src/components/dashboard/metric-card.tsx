import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "slate" | "red" | "green" | "teal" | "amber";
}) {
  const colors = {
    slate: "text-slate-950",
    red: "text-red-600",
    green: "text-emerald-600",
    teal: "text-cyan-700",
    amber: "text-amber-700",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
        </div>
        <div className={cn("mt-2 text-2xl font-semibold", colors[tone])}>{value}</div>
        {helper ? <div className="mt-1 truncate text-xs text-slate-500">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}
