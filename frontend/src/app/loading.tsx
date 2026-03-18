import { StatsCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <StatsCardSkeleton />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ChartSkeleton />
        </div>
        <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 lg:w-[380px]" />
      </div>
      <TableSkeleton rows={3} columns={4} />
    </div>
  );
}
