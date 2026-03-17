"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVehicles } from "@/hooks/use-vehicles";
import { StatusBadge } from "@/components/status-badge";
import { AgingProgressBar } from "@/components/aging-progress-bar";
import { StatsCard } from "@/components/stats-card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AgingStockPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"stocked_at" | "price" | "year" | "make">("stocked_at");

  const { data, isLoading, error } = useVehicles({
    aging: true,
    sort_by: sortBy,
    order: "desc",
    page_size: 100,
  });

  const vehicles = data?.items ?? [];
  const avgDays = vehicles.length > 0
    ? Math.round(vehicles.reduce((sum, v) => sum + (v.days_in_stock ?? 0), 0) / vehicles.length)
    : 0;
  const actionsCount = vehicles.reduce((sum, v) => sum + (v.actions?.length ?? 0), 0);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Failed to load aging stock data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Aging Stock</h1>
          <p className="text-sm text-zinc-500">All vehicles in inventory for more than 90 days</p>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700"
        >
          <option value="stocked_at">Days in Stock</option>
          <option value="price">Price</option>
          <option value="make">Make</option>
        </select>
      </div>

      {/* Alert Banner */}
      {vehicles.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm">
              <span className="font-semibold text-red-600">{vehicles.length} vehicles</span>
              <span className="text-zinc-600"> require attention — these vehicles have been in stock for over 90 days</span>
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Aging Vehicles" value={vehicles.length} valueClassName="text-red-600" />
        <StatsCard title="Avg. Days in Stock" value={avgDays} />
        <StatsCard title="Actions Taken" value={actionsCount} valueClassName="text-green-600" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="text-xs uppercase text-zinc-500">Vehicle</TableHead>
              <TableHead className="w-40 text-xs uppercase text-zinc-500">Days in Stock</TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">Price</TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">Status</TableHead>
              <TableHead className="w-32 text-xs uppercase text-zinc-500">Last Action</TableHead>
              <TableHead className="w-28 text-xs uppercase text-zinc-500">Quick Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-zinc-400">{vehicle.vin}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AgingProgressBar days={vehicle.days_in_stock ?? 0} />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-900">
                    {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {vehicle.actions?.[0]?.action_type
                      ? vehicle.actions[0].action_type.replace(/_/g, " ")
                      : "No actions"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                    >
                      Log Action
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-zinc-400">
                  No aging vehicles — great job!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
