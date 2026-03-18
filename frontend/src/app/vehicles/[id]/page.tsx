"use client";

import Link from "next/link";
import { use } from "react";
import { useVehicle } from "@/hooks/use-vehicle";
import { VehicleInfoCard } from "@/components/vehicle-info-card";
import { ActionTimeline } from "@/components/action-timeline";
import { ActionForm } from "@/components/action-form";
import { ArrowLeft } from "lucide-react";

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: vehicle, isLoading, error } = useVehicle(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-40 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        <div className="flex flex-col gap-6 lg:flex-row-reverse">
          <div className="h-64 lg:w-[380px] animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
          <div className="h-64 flex-1 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-6">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Vehicle not found.</p>
          <Link href="/inventory" className="mt-2 inline-block text-sm text-blue-600 underline">
            Return to inventory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </Link>

      {/* Vehicle Info Card */}
      <VehicleInfoCard vehicle={vehicle} />

      {/* Mobile: single column, form first; Desktop: form right via flex-row-reverse */}
      <div className="flex flex-col gap-6 lg:flex-row-reverse">
        {/* Action form — top on mobile, right on desktop */}
        <div className="lg:w-[380px]">
          <ActionForm vehicleId={vehicle.id} />
        </div>
        {/* Timeline — bottom on mobile, left on desktop */}
        <div className="flex-1">
          <ActionTimeline actions={vehicle.actions ?? []} />
        </div>
      </div>
    </div>
  );
}
