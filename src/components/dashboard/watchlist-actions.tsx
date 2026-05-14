"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisReport } from "@/lib/types";
import { addLocalWatchlistItem } from "@/lib/client-storage";

export function WatchlistActions({ report }: { report: AnalysisReport }) {
  const [saved, setSaved] = useState(false);

  async function add() {
    const note = `${report.plan.signalLabel}，评分 ${report.scores.total}，建议仓位 ${report.plan.positionRange[0]}%-${report.plan.positionRange[1]}%`;

    addLocalWatchlistItem({
      symbol: report.symbol,
      name: report.quote.name,
      note,
    });

    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: report.symbol,
          name: report.quote.name,
          note,
        }),
      });
    } catch {
      // Local storage is the offline fallback when Supabase is not configured.
    }

    setSaved(true);
  }

  return (
    <Button variant="secondary" onClick={add} className="border-cyan-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white">
      <Star className="h-4 w-4" />
      {saved ? "已加入自选" : "加入自选"}
    </Button>
  );
}
