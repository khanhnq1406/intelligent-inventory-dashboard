"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "next-themes";
import type { components } from "@/lib/api/types";

type StatusSummary = components["schemas"]["StatusSummary"];

const COLORS: Record<string, string> = {
  available: "#2563eb",
  sold: "#a1a1aa",
  reserved: "#f59e0b",
};

export function VehicleStatusChart({ data }: { data: StatusSummary[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const containerBorder = isDark ? "border-zinc-700" : "border-zinc-200";
  const containerBg = isDark ? "bg-zinc-900" : "bg-white";
  const titleColor = isDark ? "text-zinc-50" : "text-zinc-900";
  const legendTextColor = isDark ? "text-zinc-400" : "text-zinc-600";
  const legendCountColor = isDark ? "text-zinc-50" : "text-zinc-900";
  const tooltipBorder = isDark ? "#3f3f46" : "#e4e4e7";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipText = isDark ? "#fafafa" : "#18181b";

  return (
    <div className={`w-full rounded-xl border ${containerBorder} ${containerBg} p-6 lg:w-[380px]`}>
      <h3 className={`mb-4 text-base font-semibold ${titleColor}`}>Vehicle Status</h3>
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
              contentStyle={{
                borderRadius: "8px",
                border: `1px solid ${tooltipBorder}`,
                fontSize: "12px",
                backgroundColor: tooltipBg,
                color: tooltipText,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[entry.status] || "#a1a1aa" }}
            />
            <span className={`text-xs capitalize ${legendTextColor}`}>{entry.status}</span>
            <span className={`text-xs font-medium ${legendCountColor}`}>{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
