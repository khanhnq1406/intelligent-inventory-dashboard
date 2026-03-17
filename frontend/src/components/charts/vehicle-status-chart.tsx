"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { components } from "@/lib/api/types";

type StatusSummary = components["schemas"]["StatusSummary"];

const COLORS: Record<string, string> = {
  available: "#2563eb",
  sold: "#a1a1aa",
  reserved: "#f59e0b",
};

export function VehicleStatusChart({ data }: { data: StatusSummary[] }) {
  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 lg:w-[380px]">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Vehicle Status</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status] || "#a1a1aa"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[entry.status] || "#a1a1aa" }}
            />
            <span className="text-xs capitalize text-zinc-600">{entry.status}</span>
            <span className="text-xs font-medium text-zinc-900">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
