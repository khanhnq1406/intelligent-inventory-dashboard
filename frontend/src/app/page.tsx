"use client";

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { useVehicles } from "@/hooks/use-vehicles";
import { StatsCard } from "@/components/stats-card";
import { ActionBadge } from "@/components/action-badge";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Dynamic import Recharts components (heavy library)
const InventoryByMakeChart = dynamic(
  () => import("@/components/charts/inventory-by-make-chart").then((m) => ({ default: m.InventoryByMakeChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const VehicleStatusChart = dynamic(
  () => import("@/components/charts/vehicle-status-chart").then((m) => ({ default: m.VehicleStatusChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />;
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: vehiclesData } = useVehicles({ page_size: 10, order: "desc", sort_by: "stocked_at" });

  // Derive recent actions from vehicles that have actions
  const recentActions = vehiclesData?.items
    ?.flatMap((v) =>
      (v.actions ?? []).map((a) => ({
        vehicle: `${v.year} ${v.make} ${v.model}`,
        vehicleId: v.id,
        actionType: a.action_type,
        daysInStock: v.days_in_stock ?? 0,
        date: a.created_at,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (summaryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Failed to load dashboard data.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Real-time vehicle stock overview</p>
      </div>

      {/* Stats Row */}
      {summaryLoading ? (
        <StatsSkeleton />
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Vehicles" value={summary.total_vehicles} />
          <StatsCard
            title="Aging Stock"
            value={summary.aging_vehicles}
            valueClassName="text-red-600"
          />
          <StatsCard
            title="Avg. Days in Stock"
            value={Math.round(summary.average_days_in_stock)}
          />
          <StatsCard title="Actions This Month" value={summary.actions_this_month} />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          {summary?.by_make ? (
            <InventoryByMakeChart data={summary.by_make} />
          ) : (
            <ChartSkeleton />
          )}
        </div>
        {summary?.by_status ? (
          <VehicleStatusChart data={summary.by_status} />
        ) : (
          <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 lg:w-[380px]" />
        )}
      </div>

      {/* Recent Actions Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Recent Actions</h3>
          <Link href="/aging" className="text-sm text-blue-600 hover:underline">
            View all &rarr;
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="text-xs uppercase text-zinc-500">Vehicle</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Action</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Days in Stock</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActions && recentActions.length > 0 ? (
              recentActions.map((action, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm text-zinc-900">{action.vehicle}</TableCell>
                  <TableCell><ActionBadge actionType={action.actionType} /></TableCell>
                  <TableCell className="text-sm text-zinc-600">{action.daysInStock}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(action.date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-zinc-400">
                  No recent actions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
