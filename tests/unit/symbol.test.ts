import { describe, expect, it } from "vitest";
import { normalizeSymbol } from "@/lib/market/symbol";

describe("normalizeSymbol", () => {
  it("normalizes Shanghai symbols", () => {
    expect(normalizeSymbol("600519")).toMatchObject({
      code: "600519",
      exchange: "SH",
      eastmoneySecid: "1.600519",
      tushareCode: "600519.SH",
    });
  });

  it("normalizes Shenzhen symbols", () => {
    expect(normalizeSymbol("000001.SZ")).toMatchObject({
      code: "000001",
      exchange: "SZ",
      eastmoneySecid: "0.000001",
    });
  });

  it("rejects invalid codes", () => {
    expect(() => normalizeSymbol("abc")).toThrow();
  });
});

