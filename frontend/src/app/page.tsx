"use client";

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { useRecentActions } from "@/hooks/use-recent-actions";
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
  return <div className="h-64 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: recentActionsData } = useRecentActions({ limit: 3 });

  if (summaryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">Failed to load dashboard data.</p>
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Real-time vehicle stock overview</p>
      </div>

      {/* Stats Row — 2x2 on mobile, 4-across on lg */}
      {summaryLoading ? (
        <StatsSkeleton />
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 lg:w-[380px]" />
        )}
      </div>

      {/* Recent Actions — desktop table */}
      <div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Actions</h3>
          <Link href="/aging" className="text-sm text-blue-600 hover:underline">
            View all &rarr;
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800">
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Vehicle</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Action</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Days in Stock</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActionsData && recentActionsData.length > 0 ? (
              recentActionsData.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm text-zinc-900 dark:text-zinc-50">{`${a.vehicle_year} ${a.vehicle_make} ${a.vehicle_model}`}</TableCell>
                  <TableCell><ActionBadge actionType={a.action_type} /></TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{a.days_in_stock}</TableCell>
                  <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                    {new Date(a.created_at).toLocaleDateString()}
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

      {/* Recent Actions — mobile card list */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Actions</h3>
          <Link href="/aging" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {recentActionsData && recentActionsData.length > 0 ? (
          recentActionsData.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{`${a.vehicle_year} ${a.vehicle_make} ${a.vehicle_model}`}</p>
                <ActionBadge actionType={a.action_type} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{a.days_in_stock} days in stock</span>
                <span>{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center py-6 text-zinc-400">No recent actions</p>
        )}
      </div>
    </div>
  );
}
