import { TableSkeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-9 w-60 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <TableSkeleton rows={8} columns={8} />
    </div>
  );
}
