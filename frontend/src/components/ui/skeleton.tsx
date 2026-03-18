import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800",
        className
      )}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-24"
        />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex gap-4 bg-zinc-50 dark:bg-zinc-800 px-6 py-3">
        {[...Array(columns)].map((_, j) => (
          <div key={j} className="animate-pulse h-4 flex-1 rounded bg-zinc-200 dark:bg-zinc-700" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="animate-pulse h-4 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse h-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
  );
}

export function VehicleInfoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="animate-pulse h-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
      <div className="flex flex-col gap-6 lg:flex-row-reverse">
        <div className="animate-pulse h-64 lg:w-[380px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        <div className="animate-pulse h-64 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
