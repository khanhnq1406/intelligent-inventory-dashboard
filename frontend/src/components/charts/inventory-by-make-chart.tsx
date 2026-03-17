"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { components } from "@/lib/api/types";

type MakeSummary = components["schemas"]["MakeSummary"];

export function InventoryByMakeChart({ data }: { data: MakeSummary[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Inventory by Make</h3>
        <span className="text-xs text-zinc-400">Last 30 days</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="make" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }}
            />
            <Bar dataKey="count" name="Total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="aging_count" name="Aging" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
