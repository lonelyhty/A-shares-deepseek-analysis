"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestResult } from "@/lib/types";

export function BacktestChart({ backtest }: { backtest: BacktestResult }) {
  return (
    <div className="w-full overflow-x-auto q-scrollbar">
      <LineChart width={720} height={256} data={backtest.equityCurve}>
        <CartesianGrid stroke="#eef2f7" />
        <XAxis dataKey="date" minTickGap={42} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? `${((value - 1) * 100).toFixed(2)}%` : "--"
          }
          labelFormatter={(label) => `日期 ${label}`}
        />
        <Line
          type="monotone"
          dataKey="equity"
          stroke="#0f766e"
          strokeWidth={2}
          dot={false}
          name="策略"
        />
        <Line
          type="monotone"
          dataKey="benchmark"
          stroke="#64748b"
          strokeWidth={1.5}
          dot={false}
          name="持有"
        />
      </LineChart>
    </div>
  );
}

