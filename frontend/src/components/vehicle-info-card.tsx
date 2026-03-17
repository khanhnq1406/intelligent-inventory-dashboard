import type { components } from "@/lib/api/types";
import { StatusBadge } from "@/components/status-badge";

type Vehicle = components["schemas"]["Vehicle"];

export function VehicleInfoCard({ vehicle }: { vehicle: Vehicle }) {
  const fields = [
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Year", value: vehicle.year },
    { label: "Price", value: vehicle.price ? `$${vehicle.price.toLocaleString()}` : "-" },
    { label: "Status", value: <StatusBadge status={vehicle.status} /> },
    { label: "Stocked", value: new Date(vehicle.stocked_at).toLocaleDateString() },
    { label: "Days in Stock", value: vehicle.days_in_stock ?? 0 },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-zinc-900">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        {vehicle.is_aging && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
            Aging
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-400">VIN: {vehicle.vin}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-xs text-zinc-400">{field.label}</p>
            <div className="mt-1 text-sm font-medium text-zinc-900">{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
