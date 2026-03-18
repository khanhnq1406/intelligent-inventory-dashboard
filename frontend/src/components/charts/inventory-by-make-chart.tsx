"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import type { components } from "@/lib/api/types";

type MakeSummary = components["schemas"]["MakeSummary"];

export function InventoryByMakeChart({ data }: { data: MakeSummary[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "#3f3f46" : "#f4f4f5";
  const tickColor = isDark ? "#a1a1aa" : "#71717a";
  const tooltipBorder = isDark ? "#3f3f46" : "#e4e4e7";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipText = isDark ? "#fafafa" : "#18181b";
  const totalBarColor = isDark ? "#3b82f6" : "#2563eb";
  const agingBarColor = isDark ? "#ef4444" : "#dc2626";
  const containerBorder = isDark ? "border-zinc-700" : "border-zinc-200";
  const containerBg = isDark ? "bg-zinc-900" : "bg-white";
  const titleColor = isDark ? "text-zinc-50" : "text-zinc-900";

  return (
    <div className={`rounded-xl border ${containerBorder} ${containerBg} p-6`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-base font-semibold ${titleColor}`}>Inventory by Make</h3>
        <span className="text-xs text-zinc-400">Last 30 days</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="make" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: `1px solid ${tooltipBorder}`,
                fontSize: "12px",
                backgroundColor: tooltipBg,
                color: tooltipText,
              }}
            />
            <Bar dataKey="count" name="Total" fill={totalBarColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey="aging_count" name="Aging" fill={agingBarColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
