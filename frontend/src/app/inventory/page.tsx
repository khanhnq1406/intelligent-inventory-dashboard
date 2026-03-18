"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVehicles } from "@/hooks/use-vehicles";
import { VehicleFilters } from "@/components/vehicle-filters";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { AddVehicleModal } from "@/components/add-vehicle-modal";
import { VehicleCard } from "@/components/vehicle-card";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (filters.make) params.set("make", filters.make);
      if (filters.status) params.set("status", filters.status);
      if (filters.aging) params.set("aging", "true");
      if (sortBy) params.set("sort_by", sortBy);
      if (order) params.set("order", order);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const url = `${apiBase}/api/v1/vehicles/export?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Export failed");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `vehicles-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Vehicle Inventory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage and filter your complete vehicle stock
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                  Exporting...
                </span>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Export
                </>
              )}
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Vehicle
            </Button>
          </div>
          {exportError && <p className="text-sm text-red-500">{exportError}</p>}
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Failed to load vehicles.</p>
        </div>
      )}

      {/* Desktop table — hidden on mobile via CSS once isMobile resolves */}
      <div className={`${isMobile ? "hidden" : "block"} rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800">
              <TableHead className="w-40 text-xs uppercase text-zinc-500 dark:text-zinc-400">VIN</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <button onClick={() => toggleSort("make")} className="flex items-center gap-1">
                  Make <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Model</TableHead>
              <TableHead className="w-16 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <button onClick={() => toggleSort("year")} className="flex items-center gap-1">
                  Year <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <button onClick={() => toggleSort("price")} className="flex items-center gap-1">
                  Price <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500 dark:text-zinc-400">Status</TableHead>
              <TableHead className="w-20 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <button onClick={() => toggleSort("stocked_at")} className="flex items-center gap-1">
                  Days <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-28 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                Last Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
                  <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {vehicle.vin}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-900 dark:text-zinc-50">
                    {vehicle.make}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-900 dark:text-zinc-50">
                    {vehicle.model}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                    {vehicle.year}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-900 dark:text-zinc-50">
                    {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={vehicle.status} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                        vehicle.is_aging
                          ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                          : "text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      {vehicle.days_in_stock ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
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
          <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-3">
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Mobile card list — only renders when matchMedia confirms mobile viewport */}
      {isMobile && <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          ))
        ) : filteredItems && filteredItems.length > 0 ? (
          filteredItems.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onClick={() => router.push(`/vehicles/${vehicle.id}`)}
            />
          ))
        ) : (
          <p className="py-12 text-center text-zinc-400">No vehicles found</p>
        )}
        {/* Simplified mobile pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
            >
              &larr; Previous
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {page} / {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>}

      <AddVehicleModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
