import type { KlineBar } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function ServerCandlestickChart({ data }: { data: KlineBar[] }) {
  const bars = data.slice(-120);
  const prices = bars.flatMap((bar) => [bar.high, bar.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = Math.max(maxPrice - minPrice, 0.01);
  const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1);
  const width = 980;
  const height = 420;
  const chartTop = 18;
  const priceHeight = 290;
  const volumeTop = 330;
  const volumeHeight = 70;
  const gap = 2;
  const slot = width / Math.max(bars.length, 1);
  const candleWidth = Math.max(2, Math.min(8, slot - gap));
  const latest = bars.at(-1);
  const yForPrice = (price: number) =>
    chartTop + ((maxPrice - price) / priceRange) * priceHeight;

  return (
    <div className="w-full overflow-x-auto q-scrollbar" data-testid="kline-chart">
      <div className="min-w-[760px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-3 py-2 text-xs text-slate-300">
          <span>近 {bars.length} 个交易日</span>
          <span>
            {latest
              ? `收 ${formatNumber(latest.close)} 高 ${formatNumber(latest.high)} 低 ${formatNumber(latest.low)}`
              : "--"}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="股票K线图"
          className="block h-[420px] w-full"
        >
          {Array.from({ length: 5 }).map((_, index) => {
            const y = chartTop + (priceHeight / 4) * index;
            const price = maxPrice - (priceRange / 4) * index;

            return (
              <g key={index}>
                <line x1={0} x2={width} y1={y} y2={y} stroke="#eef2f7" />
                <text x={width - 70} y={y - 4} fill="#64748b" fontSize={11}>
                  {price.toFixed(2)}
                </text>
              </g>
            );
          })}
          {bars.map((bar, index) => {
            const x = index * slot + slot / 2;
            const openY = yForPrice(bar.open);
            const closeY = yForPrice(bar.close);
            const highY = yForPrice(bar.high);
            const lowY = yForPrice(bar.low);
            const up = bar.close >= bar.open;
            const color = up ? "#dc2626" : "#16a34a";
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
            const volumeHeightNow = (bar.volume / maxVolume) * volumeHeight;

            return (
              <g key={bar.date}>
                <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth={1} />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  opacity={up ? 0.88 : 0.82}
                  rx={0.5}
                />
                <rect
                  x={x - candleWidth / 2}
                  y={volumeTop + volumeHeight - volumeHeightNow}
                  width={candleWidth}
                  height={volumeHeightNow}
                  fill={color}
                  opacity={0.28}
                />
              </g>
            );
          })}
          <line x1={0} x2={width} y1={volumeTop} y2={volumeTop} stroke="#e2e8f0" />
          {bars
            .filter((_, index) => index % Math.ceil(bars.length / 6) === 0)
            .map((bar) => (
              <text
                key={bar.date}
                x={bars.findIndex((item) => item.date === bar.date) * slot + 4}
                y={height - 6}
                fill="#94a3b8"
                fontSize={11}
              >
                {bar.date.slice(5)}
              </text>
            ))}
        </svg>
      </div>
    </div>
  );
}
