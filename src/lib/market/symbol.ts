import type { Exchange, NormalizedSymbol } from "@/lib/types";

export function normalizeSymbol(input: string): NormalizedSymbol {
  const raw = input.trim().toUpperCase();
  const compact = raw
    .replace(/^SH[:.]?/, "")
    .replace(/^SZ[:.]?/, "")
    .replace(/^BJ[:.]?/, "")
    .replace(/\.SH$/, "")
    .replace(/\.SZ$/, "")
    .replace(/\.BJ$/, "");

  if (!/^\d{6}$/.test(compact)) {
    throw new Error("请输入 6 位 A股股票代码，例如 600519 或 000001。");
  }

  const exchange = inferExchange(compact, raw);
  const eastmoneyMarketId = exchange === "SH" ? "1" : exchange === "SZ" ? "0" : "0";

  return {
    raw,
    code: compact,
    exchange,
    eastmoneySecid: `${eastmoneyMarketId}.${compact}`,
    tushareCode: `${compact}.${exchange}`,
    display: `${compact}.${exchange}`,
  };
}

export function inferExchange(code: string, raw = ""): Exchange {
  if (raw.includes(".SH") || raw.startsWith("SH")) {
    return "SH";
  }

  if (raw.includes(".SZ") || raw.startsWith("SZ")) {
    return "SZ";
  }

  if (raw.includes(".BJ") || raw.startsWith("BJ")) {
    return "BJ";
  }

  if (/^(5|6|9)/.test(code)) {
    return "SH";
  }

  if (/^(4|8)/.test(code)) {
    return "BJ";
  }

  return "SZ";
}

export function isAshareSymbol(input: string) {
  try {
    normalizeSymbol(input);
    return true;
  } catch {
    return false;
  }
}

