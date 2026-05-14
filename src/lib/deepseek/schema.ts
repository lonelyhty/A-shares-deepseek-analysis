import { z } from "zod";

export const deepSeekReportSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  action: z.string().min(1),
  confidence: z.number().min(0).max(100),
  bullets: z.array(z.string()).min(3).max(8),
  riskNotes: z.array(z.string()).min(2).max(6),
  executionChecklist: z.array(z.string()).min(2).max(6),
  disclaimer: z.string().min(1),
});

export type DeepSeekReportPayload = z.infer<typeof deepSeekReportSchema>;

