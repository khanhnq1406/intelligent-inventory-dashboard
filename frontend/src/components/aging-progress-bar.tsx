import { cn } from "@/lib/utils";

export function AgingProgressBar({ days }: { days: number }) {
  // Max visual width at 180 days
  const percentage = Math.min((days / 180) * 100, 100);
  const color = days > 120 ? "bg-red-500" : "bg-orange-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn("text-xs font-medium", days > 120 ? "text-red-600" : "text-orange-500")}>
        {days} days
      </span>
    </div>
  );
}
