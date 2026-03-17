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
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
        <div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
        <div className="flex gap-6">
          <div className="h-64 flex-1 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
          <div className="h-64 w-[380px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-6">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">Vehicle not found.</p>
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
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </Link>

      {/* Vehicle Info Card */}
      <VehicleInfoCard vehicle={vehicle} />

      {/* Two-column: Action History + Log Action Form */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ActionTimeline actions={vehicle.actions ?? []} />
        </div>
        <ActionForm vehicleId={vehicle.id} />
      </div>
    </div>
  );
}
