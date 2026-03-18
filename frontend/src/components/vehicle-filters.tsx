"use client";

import { useEffect, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VehicleFiltersProps {
  filters: {
    search: string;
    make: string;
    model: string;
    status: string;
    aging: boolean;
  };
  onFiltersChange: (filters: VehicleFiltersProps["filters"]) => void;
  totalCount?: number;
}

const makes = ["All Makes", "Toyota", "Honda", "BMW", "Mercedes-Benz", "Audi", "Ford", "Chevrolet"];
const statuses = ["All Statuses", "available", "sold", "reserved"];

export function VehicleFilters({ filters, onFiltersChange, totalCount }: VehicleFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  const updateFilter = (key: string, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by VIN, make, model..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 w-60 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Make dropdown */}
      <select
        value={filters.make}
        onChange={(e) => updateFilter("make", e.target.value)}
        className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
      >
        {makes.map((m) => (
          <option key={m} value={m === "All Makes" ? "" : m}>{m}</option>
        ))}
      </select>

      {/* Status dropdown */}
      <select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
      >
        {statuses.map((s) => (
          <option key={s} value={s === "All Statuses" ? "" : s}>
            {s === "All Statuses" ? s : s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      {/* Aging Only toggle */}
      <Button
        variant={filters.aging ? "destructive" : "outline"}
        size="sm"
        onClick={() => updateFilter("aging", !filters.aging)}
        className={cn(
          filters.aging && "bg-red-100 text-red-600 hover:bg-red-200 border-red-200"
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Aging Only
      </Button>

      {/* Count */}
      {totalCount !== undefined && (
        <span className="ml-auto text-sm text-zinc-400">
          Showing {totalCount} vehicles
        </span>
      )}
    </div>
  );
}
