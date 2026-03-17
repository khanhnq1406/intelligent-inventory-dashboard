"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVehicles } from "@/hooks/use-vehicles";
import { VehicleFilters } from "@/components/vehicle-filters";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Download, Plus, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InventoryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    make: "",
    model: "",
    status: "",
    aging: false,
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("stocked_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useVehicles({
    make: filters.make || undefined,
    status: (filters.status || undefined) as "available" | "sold" | "reserved" | undefined,
    aging: filters.aging || undefined,
    sort_by: sortBy as "stocked_at" | "price" | "year" | "make",
    order,
    page,
    page_size: 20,
  });

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrder("desc");
    }
    setPage(1);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  // Client-side search filtering (VIN/make/model)
  const filteredItems = data?.items?.filter((v) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      v.vin.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vehicle Inventory</h1>
          <p className="text-sm text-zinc-500">Manage and filter your complete vehicle stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled title="Export coming soon">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" disabled title="Add Vehicle coming soon" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </div>
      </div>

      {/* Filters */}
      <VehicleFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalCount={data?.total}
      />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">Failed to load vehicles.</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-40 text-xs uppercase text-zinc-500">VIN</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">
                <button onClick={() => toggleSort("make")} className="flex items-center gap-1">
                  Make <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Model</TableHead>
              <TableHead className="w-16 text-xs uppercase text-zinc-500">
                <button onClick={() => toggleSort("year")} className="flex items-center gap-1">
                  Year <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">
                <button onClick={() => toggleSort("price")} className="flex items-center gap-1">
                  Price <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">Status</TableHead>
              <TableHead className="w-20 text-xs uppercase text-zinc-500">
                <button onClick={() => toggleSort("stocked_at")} className="flex items-center gap-1">
                  Days <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-28 text-xs uppercase text-zinc-500">Last Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredItems && filteredItems.length > 0 ? (
              filteredItems.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                >
                  <TableCell className="font-mono text-xs text-zinc-600">{vehicle.vin}</TableCell>
                  <TableCell className="text-sm text-zinc-900">{vehicle.make}</TableCell>
                  <TableCell className="text-sm text-zinc-900">{vehicle.model}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{vehicle.year}</TableCell>
                  <TableCell className="text-sm text-zinc-900">
                    {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                        vehicle.is_aging
                          ? "bg-red-50 text-red-600"
                          : "text-zinc-600"
                      )}
                    >
                      {vehicle.days_in_stock ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {vehicle.actions?.[0]?.action_type
                      ? vehicle.actions[0].action_type.replace("_", " ")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-zinc-400">
                  No vehicles found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="border-t border-zinc-200 px-6 py-3">
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
