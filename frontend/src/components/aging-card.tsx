"use client";

import { AgingProgressBar } from "@/components/aging-progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

interface AgingCardProps {
  vehicle: Vehicle;
  onLogAction: (id: string) => void;
}

export function AgingCard({ vehicle, onLogAction }: AgingCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">{vehicle.vin}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      <div className="mt-3">
        <AgingProgressBar days={vehicle.days_in_stock ?? 0} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "—"}
        </span>
        <Button
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"
          onClick={() => onLogAction(vehicle.id)}
        >
          Log Action
        </Button>
      </div>
    </div>
  );
}
