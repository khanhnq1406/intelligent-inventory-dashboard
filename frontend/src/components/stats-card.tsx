import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: { value: string; positive: boolean };
  valueClassName?: string;
}

export function StatsCard({ title, value, description, change, valueClassName }: StatsCardProps) {
  return (
    <div
      role="status"
      aria-label={`${title}: ${value}`}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className={cn("mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50", valueClassName)}>{value}</p>
      {change && (
        <p className={cn("mt-1 text-xs", change.positive ? "text-green-600" : "text-red-600")}>
          {change.positive ? "\u2191" : "\u2193"} {change.value}
        </p>
      )}
      {description && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>}
    </div>
  );
}
