import { describe, expect, it } from "vitest";
import { calculateIndicators, sma } from "@/lib/analysis/indicators";
import { createDemoHistory } from "@/lib/market/mock-data";

describe("indicators", () => {
  it("calculates moving averages", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("creates an indicator snapshot from history", () => {
    const snapshot = calculateIndicators(createDemoHistory("600519", 120));
    expect(snapshot.ma20).toBeGreaterThan(0);
    expect(snapshot.rsi14).toBeGreaterThanOrEqual(0);
    expect(snapshot.volumeRatio20).toBeGreaterThan(0);
  });
});

