"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: () => void;
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">{vehicle.vin}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "—"}
        </span>
        <span
          className={cn(
            "font-medium",
            vehicle.is_aging
              ? "text-red-600 dark:text-red-500"
              : "text-zinc-600 dark:text-zinc-400"
          )}
        >
          {vehicle.days_in_stock ?? 0} days in stock
        </span>
      </div>
    </button>
  );
}
