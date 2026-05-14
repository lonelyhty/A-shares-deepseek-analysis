"use client";

import { useEffect } from "react";
import type { AnalysisReport } from "@/lib/types";
import { saveLocalReport } from "@/lib/client-storage";

export function PersistReport({ report }: { report: AnalysisReport }) {
  useEffect(() => {
    saveLocalReport(report);
  }, [report]);

  return null;
}

