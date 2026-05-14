import { describe, expect, it } from "vitest";
import { buildQuantAnalysis } from "@/lib/analysis/scoring";
import { createDemoHistory, createDemoQuote } from "@/lib/market/mock-data";

describe("quant scoring", () => {
  it("produces a bounded score and trading plan", () => {
    const report = buildQuantAnalysis(createDemoQuote("600519"), createDemoHistory("600519", 320));

    expect(report.scores.total).toBeGreaterThanOrEqual(0);
    expect(report.scores.total).toBeLessThanOrEqual(100);
    expect(report.plan.positionRange[0]).toBeGreaterThanOrEqual(0);
    expect(report.plan.stopLoss).toBeGreaterThan(0);
    expect(report.backtest.equityCurve.length).toBeGreaterThan(0);
  });
});

