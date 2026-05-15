"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeSymbol } from "@/lib/market/symbol";
import type { WatchlistItem } from "@/lib/types";
import {
  addLocalWatchlistItem,
  getLocalWatchlist,
  mergeWatchlistItems,
  normalizeWatchlistSymbol,
  removeLocalWatchlistItem,
} from "@/lib/client-storage";

export function WatchlistClient({ items }: { items: WatchlistItem[] }) {
  const [list, setList] = useState<WatchlistItem[]>(items);
  const [symbol, setSymbol] = useState("600519");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = () => {
      const local = getLocalWatchlist();
      setList(mergeWatchlistItems(local, items));
    };

    load();
    window.addEventListener("qfactor:watchlist", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("qfactor:watchlist", load);
      window.removeEventListener("storage", load);
    };
  }, [items]);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let normalizedSymbol = "";

    try {
      normalizedSymbol = normalizeSymbol(symbol).display;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "请输入正确的 A股代码。");
      return;
    }

    const existing = list.find((item) => normalizeWatchlistSymbol(item.symbol) === normalizedSymbol);
    const displayName = name.trim() || existing?.name || normalizedSymbol;
    const saved = addLocalWatchlistItem({
      symbol: normalizedSymbol,
      name: displayName,
      note: note.trim() || null,
    });

    setList((current) => [saved, ...current.filter((item) => item.symbol !== saved.symbol)]);
    setName("");
    setNote("");
    setStatus("已保存到本地自选，正在同步云端。");

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: normalizedSymbol,
          name: displayName,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("watchlist sync failed");
      }

      setStatus("已保存，并同步到云端。");
    } catch {
      setStatus("已保存到本地；云端同步失败时不影响本机使用。");
    }
  }

  async function remove(symbolToRemove: string) {
    const normalizedSymbol = normalizeWatchlistSymbol(symbolToRemove);

    removeLocalWatchlistItem(normalizedSymbol);
    setList((current) => current.filter((item) => normalizeWatchlistSymbol(item.symbol) !== normalizedSymbol));
    setStatus("已从本地自选移除。");

    try {
      const response = await fetch(`/api/watchlist?symbol=${encodeURIComponent(normalizedSymbol)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("watchlist delete failed");
      }

      setStatus("已从自选股移除，并同步到云端。");
    } catch {
      setStatus("已从本地移除；云端同步失败时稍后再试。");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <form onSubmit={add} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-3 md:grid-cols-[160px_180px_1fr_auto]">
            <Input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="股票代码，如 600519" />
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="名称，可选" />
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="备注，可选，例如 等回踩 MA20" />
            <Button type="submit">
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </form>
          {status ? <div className="text-sm text-slate-500">{status}</div> : null}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-cyan-700" />
          <Input className="pl-9" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="搜索自选股" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WatchStat label="自选数量" value={`${list.length}`} />
        <WatchStat label="有备注" value={`${list.filter((item) => item.note).length}`} />
        <WatchStat label="本地兜底" value="已开启" />
      </div>

      {!list.length ? (
        <div className="rounded-md bg-slate-50 p-6 text-sm text-slate-600">
          暂无自选股。你可以在上方手动添加，也可以在股票分析页点击“加入自选”。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list
            .filter((item) => {
              const text = `${item.symbol} ${item.name} ${item.note ?? ""}`.toLowerCase();
              return text.includes(filter.trim().toLowerCase());
            })
            .map((item) => (
            <div key={`${item.id}-${item.symbol}`} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/stock/${item.symbol}`} className="font-semibold text-slate-950 hover:text-cyan-700">
                    {item.name}
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">{item.symbol}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(item.symbol)} aria-label="删除自选股">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {item.note ? <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">{item.note}</div> : null}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">{new Date(item.created_at).toLocaleDateString("zh-CN")}</span>
                <Link href={`/stock/${item.symbol}`} className="font-medium text-cyan-700 hover:text-cyan-900">
                  打开分析
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WatchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
