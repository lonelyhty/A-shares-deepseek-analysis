import { describe, expect, it } from "vitest";
import { deepSeekReportSchema } from "@/lib/deepseek/schema";

describe("deepseek report schema", () => {
  it("accepts structured reports", () => {
    const parsed = deepSeekReportSchema.parse({
      title: "贵州茅台研究报告",
      summary: "量化评分偏强。",
      action: "试仓",
      confidence: 72,
      bullets: ["趋势良好", "量能配合", "风险可控"],
      riskNotes: ["注意大盘", "注意止损"],
      executionChecklist: ["分批买入", "跌破止损退出"],
      disclaimer: "不构成投资建议。",
    });

    expect(parsed.confidence).toBe(72);
  });
});

