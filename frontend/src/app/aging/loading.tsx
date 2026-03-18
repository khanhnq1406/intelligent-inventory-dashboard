import { TableSkeleton } from "@/components/ui/skeleton";

export default function AgingLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="h-14 animate-pulse rounded-lg bg-red-50 dark:bg-red-950" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        ))}
      </div>
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}
