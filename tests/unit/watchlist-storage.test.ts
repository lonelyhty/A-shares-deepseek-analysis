import { beforeEach, describe, expect, it } from "vitest";
import {
  addLocalWatchlistItem,
  getLocalWatchlist,
  mergeWatchlistItems,
  removeLocalWatchlistItem,
} from "@/lib/client-storage";
import type { WatchlistItem } from "@/lib/types";

describe("watchlist local storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("normalizes and deduplicates A-share symbols", () => {
    addLocalWatchlistItem({ symbol: "600519", name: "贵州茅台" });
    addLocalWatchlistItem({ symbol: "600519.SH", name: "", note: "跟踪" });

    const items = getLocalWatchlist();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      symbol: "600519.SH",
      name: "贵州茅台",
      note: "跟踪",
    });
  });

  it("removes an item using either raw or normalized symbol", () => {
    addLocalWatchlistItem({ symbol: "000001", name: "平安银行" });

    removeLocalWatchlistItem("000001.SZ");

    expect(getLocalWatchlist()).toEqual([]);
  });

  it("merges local and server items by normalized symbol", () => {
    const local = addLocalWatchlistItem({ symbol: "300750", name: "宁德时代" });
    const server: WatchlistItem = {
      id: "server-id",
      symbol: "300750.SZ",
      name: "宁德时代",
      note: null,
      created_at: "2026-05-15T00:00:00.000Z",
    };

    const items = mergeWatchlistItems([local], [server]);

    expect(items).toHaveLength(1);
    expect(items[0].symbol).toBe("300750.SZ");
  });
});
