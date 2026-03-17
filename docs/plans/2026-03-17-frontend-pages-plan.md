# Frontend Pages & Components Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Implement all four frontend pages (Dashboard, Inventory, Aging Stock, Vehicle Detail) with sidebar navigation, TanStack Query hooks, Recharts visualizations, and reusable feature components matching the V2 design spec.

**Spec:** `docs/specs/2026-03-17-frontend-pages-spec.md`

**Architecture:** Pure frontend implementation — no backend or API changes needed. All endpoints already exist. Work involves: replacing top nav with sidebar, creating TanStack Query hooks for data fetching, building feature components (tables, charts, forms, timelines), and wiring pages to live API data via hooks.

**Tech Stack:** Next.js 14 App Router + TanStack Query v5 + shadcn/ui + Tailwind CSS + Recharts + lucide-react

## Security Implementation Notes

- **No auth in v1** — all endpoints are public (per system design scope)
- **Input validation:** Client-side form validation for UX only; server-side validation via oapi-codegen is the security boundary
- **XSS prevention:** React's default text escaping handles all rendered data — no `dangerouslySetInnerHTML` anywhere
- **API calls:** All through `apiFetch` wrapper with generated TypeScript types — type-safe by construction
- **Query params:** Debounced search (300ms) + TanStack Query deduplication prevent excessive API calls

## Dependency Note

- **Recharts** must be installed before chart tasks (Task 5)
- All other dependencies (TanStack Query, lucide-react, shadcn/ui primitives) are already installed

---

### Task 0: Install Recharts Dependency

**Files:**
- Modify: `frontend/package.json`

**Steps:**
1. Run `cd frontend && npm install recharts`
2. Verify installation with `npm ls recharts`

**Commit:** `build(frontend): add recharts dependency`

---

### Task 1: Sidebar Navigation Component

**Files:**
- Create: `frontend/src/components/sidebar.tsx`
- Modify: `frontend/src/app/layout.tsx` — Replace `<Nav />` with `<Sidebar />`, change layout from top-nav to sidebar layout
- Delete content from: `frontend/src/components/nav.tsx` — Remove old top nav (keep file if referenced, or delete)

**Security notes:** No security concerns — pure UI navigation component.

**Step 1: Create Sidebar component**

Create `frontend/src/components/sidebar.tsx` as a client component:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Car, label: "Inventory" },
  { href: "/aging", icon: Clock, label: "Aging Stock" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center bg-zinc-950 py-4">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
      >
        IV
      </Link>

      {/* Nav icons */}
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

**Step 2: Update root layout**

Modify `frontend/src/app/layout.tsx`:
- Import `Sidebar` instead of `Nav`
- Change body layout to `flex` with sidebar on left
- Main content gets `ml-16` (64px offset) and full-width styling

```tsx
import { Sidebar } from "@/components/sidebar";

// In the body:
<Providers>
  <Sidebar />
  <main className="ml-16 min-h-screen bg-zinc-50">
    <div className="mx-auto max-w-7xl px-6 py-6">
      {children}
    </div>
  </main>
</Providers>
```

**Step 3: Delete old nav component**

Remove `frontend/src/components/nav.tsx` (no longer used).

**Step 4: Verify** — Run `cd frontend && npm run build` to ensure no broken imports.

**Commit:** `feat(frontend): replace top nav with sidebar navigation`

---

### Task 2: TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/use-dashboard-summary.ts`
- Create: `frontend/src/hooks/use-vehicles.ts`
- Create: `frontend/src/hooks/use-vehicle.ts`
- Create: `frontend/src/hooks/use-create-vehicle-action.ts`

**Security notes:** All hooks use typed API responses from generated types. No raw data manipulation.

**Step 1: Create hooks directory** (if not exists)

```bash
mkdir -p frontend/src/hooks
```

**Step 2: Create `use-dashboard-summary.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

type DashboardSummary = components["schemas"]["DashboardSummary"];

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch<DashboardSummary>("/api/v1/dashboard/summary"),
  });
}
```

**Step 3: Create `use-vehicles.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components, operations } from "@/lib/api/types";

type PaginatedVehicles = components["schemas"]["PaginatedVehicles"];
type VehicleParams = operations["listVehicles"]["parameters"]["query"];

export function useVehicles(params?: VehicleParams) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["vehicles", params ?? {}],
    queryFn: () =>
      apiFetch<PaginatedVehicles>(`/api/v1/vehicles${query ? `?${query}` : ""}`),
  });
}
```

**Step 4: Create `use-vehicle.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => apiFetch<Vehicle>(`/api/v1/vehicles/${id}`),
    enabled: !!id,
  });
}
```

**Step 5: Create `use-create-vehicle-action.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

type VehicleAction = components["schemas"]["VehicleAction"];
type CreateRequest = components["schemas"]["CreateVehicleActionRequest"];

export function useCreateVehicleAction(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRequest) =>
      apiFetch<VehicleAction>(`/api/v1/vehicles/${vehicleId}/actions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

**Step 6: Verify** — Run `cd frontend && npx tsc --noEmit` to check types compile.

**Commit:** `feat(frontend): add TanStack Query hooks for all API endpoints`

---

### Task 3: Shared UI Components (StatusBadge, ActionBadge, StatsCard, Pagination)

**Files:**
- Create: `frontend/src/components/status-badge.tsx`
- Create: `frontend/src/components/action-badge.tsx`
- Create: `frontend/src/components/stats-card.tsx`
- Create: `frontend/src/components/pagination.tsx`

**Security notes:** Pure display components — no user input, no API calls.

**Step 1: Create StatusBadge**

`frontend/src/components/status-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-blue-50 text-blue-600" },
  sold: { label: "Sold", className: "bg-red-50 text-red-600" },
  reserved: { label: "Reserved", className: "bg-amber-50 text-amber-600" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
```

**Step 2: Create ActionBadge**

`frontend/src/components/action-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";

const actionConfig: Record<string, { label: string; className: string }> = {
  price_reduction: { label: "Price Reduction", className: "bg-blue-50 text-blue-600" },
  marketing: { label: "Marketing Campaign", className: "bg-amber-50 text-amber-600" },
  transfer: { label: "Transfer", className: "bg-green-50 text-green-600" },
  auction: { label: "Auction", className: "bg-orange-50 text-orange-600" },
  wholesale: { label: "Wholesale", className: "bg-purple-50 text-purple-600" },
  custom: { label: "Custom", className: "bg-zinc-100 text-zinc-600" },
};

export function ActionBadge({ actionType }: { actionType: string }) {
  const config = actionConfig[actionType] ?? { label: actionType, className: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
```

**Step 3: Create StatsCard**

`frontend/src/components/stats-card.tsx`:

```tsx
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className={cn("mt-1 text-3xl font-bold text-zinc-900", valueClassName)}>{value}</p>
      {change && (
        <p className={cn("mt-1 text-xs", change.positive ? "text-green-600" : "text-red-600")}>
          {change.positive ? "↑" : "↓"} {change.value}
        </p>
      )}
      {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
    </div>
  );
}
```

**Step 4: Create Pagination**

`frontend/src/components/pagination.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-zinc-400">...</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon-sm"
              onClick={() => onPageChange(p as number)}
              className={cn(p === page && "bg-blue-600 text-white hover:bg-blue-700")}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
```

**Step 5: Verify** — `cd frontend && npx tsc --noEmit`

**Commit:** `feat(frontend): add shared UI components (StatusBadge, ActionBadge, StatsCard, Pagination)`

---

### Task 4: Vehicle Filters Component

**Files:**
- Create: `frontend/src/components/vehicle-filters.tsx`

**Security notes:** Search input is debounced (300ms) to prevent excessive API calls. All filter values are passed as query params — server-side validation via oapi-codegen.

**Step 1: Create VehicleFilters component**

`frontend/src/components/vehicle-filters.tsx`:

```tsx
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
  }, [searchInput]);

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
          className="h-9 w-60 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Make dropdown */}
      <select
        value={filters.make}
        onChange={(e) => updateFilter("make", e.target.value)}
        className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {makes.map((m) => (
          <option key={m} value={m === "All Makes" ? "" : m}>{m}</option>
        ))}
      </select>

      {/* Status dropdown */}
      <select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
```

**Step 2: Verify** — `cd frontend && npx tsc --noEmit`

**Commit:** `feat(frontend): add VehicleFilters component with debounced search`

---

### Task 5: Dashboard Charts (Recharts)

**Files:**
- Create: `frontend/src/components/charts/inventory-by-make-chart.tsx`
- Create: `frontend/src/components/charts/vehicle-status-chart.tsx`

**Security notes:** Charts render data received from API — no user input. Recharts is dynamically imported to reduce bundle size.

**Step 1: Create charts directory**

```bash
mkdir -p frontend/src/components/charts
```

**Step 2: Create InventoryByMakeChart**

`frontend/src/components/charts/inventory-by-make-chart.tsx`:

```tsx
"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { components } from "@/lib/api/types";

type MakeSummary = components["schemas"]["MakeSummary"];

export function InventoryByMakeChart({ data }: { data: MakeSummary[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Inventory by Make</h3>
        <span className="text-xs text-zinc-400">Last 30 days</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="make" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }}
            />
            <Bar dataKey="count" name="Total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="aging_count" name="Aging" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 3: Create VehicleStatusChart**

`frontend/src/components/charts/vehicle-status-chart.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { components } from "@/lib/api/types";

type StatusSummary = components["schemas"]["StatusSummary"];

const COLORS: Record<string, string> = {
  available: "#2563eb",
  sold: "#a1a1aa",
  reserved: "#f59e0b",
};

export function VehicleStatusChart({ data }: { data: StatusSummary[] }) {
  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 lg:w-[380px]">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Vehicle Status</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status] || "#a1a1aa"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[entry.status] || "#a1a1aa" }}
            />
            <span className="text-xs capitalize text-zinc-600">{entry.status}</span>
            <span className="text-xs font-medium text-zinc-900">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Verify** — `cd frontend && npx tsc --noEmit`

**Commit:** `feat(frontend): add Recharts bar and donut chart components`

---

### Task 6: Dashboard Home Page

**Files:**
- Modify: `frontend/src/app/page.tsx` — Replace placeholder with full dashboard

**Security notes:** Page only reads data — no mutations. Renders all values as text (React default escaping).

**Step 1: Implement Dashboard page**

Replace `frontend/src/app/page.tsx` with full implementation:

```tsx
"use client";

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { useVehicles } from "@/hooks/use-vehicles";
import { StatsCard } from "@/components/stats-card";
import { ActionBadge } from "@/components/action-badge";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Dynamic import Recharts components (heavy library)
const InventoryByMakeChart = dynamic(
  () => import("@/components/charts/inventory-by-make-chart").then((m) => ({ default: m.InventoryByMakeChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const VehicleStatusChart = dynamic(
  () => import("@/components/charts/vehicle-status-chart").then((m) => ({ default: m.VehicleStatusChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />;
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: vehiclesData } = useVehicles({ page_size: 10, order: "desc", sort_by: "stocked_at" });

  // Derive recent actions from vehicles that have actions
  const recentActions = vehiclesData?.items
    ?.flatMap((v) =>
      (v.actions ?? []).map((a) => ({
        vehicle: `${v.year} ${v.make} ${v.model}`,
        vehicleId: v.id,
        actionType: a.action_type,
        daysInStock: v.days_in_stock ?? 0,
        date: a.created_at,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (summaryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Failed to load dashboard data.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Real-time vehicle stock overview</p>
      </div>

      {/* Stats Row */}
      {summaryLoading ? (
        <StatsSkeleton />
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Vehicles" value={summary.total_vehicles} />
          <StatsCard
            title="Aging Stock"
            value={summary.aging_vehicles}
            valueClassName="text-red-600"
          />
          <StatsCard
            title="Avg. Days in Stock"
            value={Math.round(summary.average_days_in_stock)}
          />
          <StatsCard title="Actions This Month" value="-" description="Coming soon" />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          {summary?.by_make ? (
            <InventoryByMakeChart data={summary.by_make} />
          ) : (
            <ChartSkeleton />
          )}
        </div>
        {summary?.by_status ? (
          <VehicleStatusChart data={summary.by_status} />
        ) : (
          <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 lg:w-[380px]" />
        )}
      </div>

      {/* Recent Actions Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Recent Actions</h3>
          <Link href="/aging" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="text-xs uppercase text-zinc-500">Vehicle</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Action</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Days in Stock</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActions && recentActions.length > 0 ? (
              recentActions.map((action, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm text-zinc-900">{action.vehicle}</TableCell>
                  <TableCell><ActionBadge actionType={action.actionType} /></TableCell>
                  <TableCell className="text-sm text-zinc-600">{action.daysInStock}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(action.date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-zinc-400">
                  No recent actions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Step 2: Verify** — `cd frontend && npm run build`

**Commit:** `feat(frontend): implement Dashboard page with stats, charts, and recent actions`

---

### Task 7: Vehicle Inventory Page

**Files:**
- Modify: `frontend/src/app/inventory/page.tsx` — Replace placeholder with full implementation

**Security notes:** Search input debounced (300ms). All filter values passed as query params with server-side validation. Row clicks navigate via Next.js router (no dynamic URL construction from user input).

**Step 1: Implement Inventory page**

Replace `frontend/src/app/inventory/page.tsx`:

```tsx
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
```

**Step 2: Verify** — `cd frontend && npm run build`

**Commit:** `feat(frontend): implement Vehicle Inventory page with filters, sorting, pagination`

---

### Task 8: Aging Stock Page

**Files:**
- Modify: `frontend/src/app/aging/page.tsx` — Replace placeholder
- Create: `frontend/src/components/aging-progress-bar.tsx`

**Security notes:** Page fetches with `aging=true` filter only — server enforces the 90-day threshold.

**Step 1: Create AgingProgressBar component**

`frontend/src/components/aging-progress-bar.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function AgingProgressBar({ days }: { days: number }) {
  // Max visual width at 180 days
  const percentage = Math.min((days / 180) * 100, 100);
  const color = days > 120 ? "bg-red-500" : "bg-orange-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn("text-xs font-medium", days > 120 ? "text-red-600" : "text-orange-500")}>
        {days} days
      </span>
    </div>
  );
}
```

**Step 2: Implement Aging Stock page**

Replace `frontend/src/app/aging/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVehicles } from "@/hooks/use-vehicles";
import { StatusBadge } from "@/components/status-badge";
import { AgingProgressBar } from "@/components/aging-progress-bar";
import { StatsCard } from "@/components/stats-card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AgingStockPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"stocked_at" | "price" | "year" | "make">("stocked_at");

  const { data, isLoading, error } = useVehicles({
    aging: true,
    sort_by: sortBy,
    order: "desc",
    page_size: 100,
  });

  const vehicles = data?.items ?? [];
  const avgDays = vehicles.length > 0
    ? Math.round(vehicles.reduce((sum, v) => sum + (v.days_in_stock ?? 0), 0) / vehicles.length)
    : 0;
  const actionsCount = vehicles.reduce((sum, v) => sum + (v.actions?.length ?? 0), 0);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Failed to load aging stock data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Aging Stock</h1>
          <p className="text-sm text-zinc-500">All vehicles in inventory for more than 90 days</p>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700"
        >
          <option value="stocked_at">Days in Stock</option>
          <option value="price">Price</option>
          <option value="make">Make</option>
        </select>
      </div>

      {/* Alert Banner */}
      {vehicles.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm">
              <span className="font-semibold text-red-600">{vehicles.length} vehicles</span>
              <span className="text-zinc-600"> require attention — these vehicles have been in stock for over 90 days</span>
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Aging Vehicles" value={vehicles.length} valueClassName="text-red-600" />
        <StatsCard title="Avg. Days in Stock" value={avgDays} />
        <StatsCard title="Actions Taken" value={actionsCount} valueClassName="text-green-600" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="text-xs uppercase text-zinc-500">Vehicle</TableHead>
              <TableHead className="w-40 text-xs uppercase text-zinc-500">Days in Stock</TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">Price</TableHead>
              <TableHead className="w-24 text-xs uppercase text-zinc-500">Status</TableHead>
              <TableHead className="w-32 text-xs uppercase text-zinc-500">Last Action</TableHead>
              <TableHead className="w-28 text-xs uppercase text-zinc-500">Quick Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-zinc-400">{vehicle.vin}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AgingProgressBar days={vehicle.days_in_stock ?? 0} />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-900">
                    {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {vehicle.actions?.[0]?.action_type
                      ? vehicle.actions[0].action_type.replace(/_/g, " ")
                      : "No actions"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                    >
                      Log Action
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-zinc-400">
                  No aging vehicles — great job!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Step 3: Verify** — `cd frontend && npm run build`

**Commit:** `feat(frontend): implement Aging Stock page with alert banner, stats, and progress bars`

---

### Task 9: Vehicle Detail Page — Info Card & Action Timeline

**Files:**
- Modify: `frontend/src/app/vehicles/[id]/page.tsx` — Replace placeholder
- Create: `frontend/src/components/vehicle-info-card.tsx`
- Create: `frontend/src/components/action-timeline.tsx`

**Security notes:** Vehicle ID comes from URL params (validated as UUID by server). Action history is read-only display.

**Step 1: Create VehicleInfoCard**

`frontend/src/components/vehicle-info-card.tsx`:

```tsx
import type { components } from "@/lib/api/types";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

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
```

**Step 2: Create ActionTimeline**

`frontend/src/components/action-timeline.tsx`:

```tsx
import type { components } from "@/lib/api/types";
import { ActionBadge } from "@/components/action-badge";
import { cn } from "@/lib/utils";

type VehicleAction = components["schemas"]["VehicleAction"];

export function ActionTimeline({ actions }: { actions: VehicleAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-zinc-900">Action History</h3>
        <p className="mt-4 text-sm text-zinc-400">No actions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h3 className="mb-6 text-lg font-semibold text-zinc-900">Action History</h3>
      <div className="space-y-0">
        {actions.map((action, index) => (
          <div key={action.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {index < actions.length - 1 && (
              <div className="absolute left-[5px] top-3 h-full w-0.5 bg-zinc-200" />
            )}
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full",
                index === 0 ? "bg-blue-600" : "bg-zinc-300"
              )}
            />
            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ActionBadge actionType={action.action_type} />
                <span className="text-xs text-zinc-400">
                  {new Date(action.created_at).toLocaleDateString()}
                </span>
              </div>
              {action.notes && (
                <p className="mt-1 text-sm text-zinc-600">{action.notes}</p>
              )}
              <p className="mt-1 text-xs text-zinc-400">By: {action.created_by}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Verify** — `cd frontend && npx tsc --noEmit`

**Commit:** `feat(frontend): add VehicleInfoCard and ActionTimeline components`

---

### Task 10: Vehicle Detail Page — Action Form & Full Page Assembly

**Files:**
- Create: `frontend/src/components/action-form.tsx`
- Modify: `frontend/src/app/vehicles/[id]/page.tsx` — Full implementation

**Security notes:** Form validates required fields client-side (UX). Server validates action_type enum and required fields. Notes field rendered as text (no XSS risk).

**Step 1: Create ActionForm**

`frontend/src/components/action-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useCreateVehicleAction } from "@/hooks/use-create-vehicle-action";
import type { components } from "@/lib/api/types";

type ActionType = components["schemas"]["CreateVehicleActionRequest"]["action_type"];

const actionTypes: { value: ActionType; label: string }[] = [
  { value: "price_reduction", label: "Price Reduction" },
  { value: "marketing", label: "Marketing Campaign" },
  { value: "transfer", label: "Transfer" },
  { value: "auction", label: "Auction" },
  { value: "wholesale", label: "Wholesale" },
  { value: "custom", label: "Custom" },
];

export function ActionForm({ vehicleId }: { vehicleId: string }) {
  const [actionType, setActionType] = useState<ActionType | "">("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const mutation = useCreateVehicleAction(vehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType || !createdBy) return;

    mutation.mutate(
      {
        action_type: actionType,
        notes: notes || undefined,
        created_by: createdBy,
      },
      {
        onSuccess: () => {
          setActionType("");
          setNotes("");
          setCreatedBy("");
        },
      }
    );
  };

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 lg:w-[380px]">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">Log New Action</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Action Type</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as ActionType)}
            required
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select action type...</option>
            {actionTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this action..."
            rows={4}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Your Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Your Name</label>
          <input
            type="text"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            required
            placeholder="Enter your name"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={mutation.isPending || !actionType || !createdBy}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          {mutation.isPending ? "Submitting..." : "Log Action"}
        </Button>

        {mutation.isError && (
          <p className="text-sm text-red-600">Failed to log action. Please try again.</p>
        )}
        {mutation.isSuccess && (
          <p className="text-sm text-green-600">Action logged successfully!</p>
        )}
      </form>

      {/* Available action types */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {actionTypes.map((t) => (
          <span key={t.value} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Implement Vehicle Detail page**

Replace `frontend/src/app/vehicles/[id]/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useVehicle } from "@/hooks/use-vehicle";
import { VehicleInfoCard } from "@/components/vehicle-info-card";
import { ActionTimeline } from "@/components/action-timeline";
import { ActionForm } from "@/components/action-form";
import { ArrowLeft } from "lucide-react";

export default function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: vehicle, isLoading, error } = useVehicle(params.id);

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
```

**Step 3: Verify** — `cd frontend && npm run build`

**Commit:** `feat(frontend): implement Vehicle Detail page with info card, timeline, and action form`

---

### Task 11: Update C4 Architecture Diagrams

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md` — Add/update L3 Frontend component diagram

**Steps:**
1. Read current system design doc
2. Add L3 Frontend component diagram showing:
   - Pages layer: Dashboard, Inventory, Aging, VehicleDetail
   - Components layer: Sidebar, StatsCard, Charts, Tables, Forms, Timeline
   - Hooks layer: useDashboardSummary, useVehicles, useVehicle, useCreateVehicleAction
   - Dependencies: Pages → Hooks → API Client → Backend
3. Update any existing frontend sections in the doc

**Commit:** `docs(design): update system design with frontend component architecture`

---

### Task 12: Create Runtime Flow Diagrams

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md` (or create `docs/plans/flow-frontend.md`)

**Steps:**
1. Create three flow diagrams:
   - **Dashboard data loading**: Parallel fetch of summary + vehicles
   - **Vehicle list filter/sort/paginate flow**: URL params → state → TanStack Query → API → render
   - **Create action flow**: Form submit → mutation → invalidation → re-render
2. Each diagram includes trigger, error paths, and key invariants

**Commit:** `docs(design): add frontend runtime flow diagrams`

---

### Task 13: Final Build Verification & Cleanup

**Files:**
- All frontend files

**Steps:**
1. Run `cd frontend && npm run build` — verify zero errors
2. Run `cd frontend && npm run lint` — fix any linting issues
3. Verify all pages render with `npm run dev` (manual check)
4. Remove `frontend/src/components/nav.tsx` if not done in Task 1

**Commit:** `chore(frontend): final build verification and cleanup`

---

## Task Dependency Graph

```
Task 0 (recharts install)
  ├── Task 5 (charts) depends on Task 0
  │     └── Task 6 (dashboard page) depends on Tasks 2, 3, 5
  │
Task 1 (sidebar) — independent
Task 2 (hooks) — independent
Task 3 (shared components) — independent
Task 4 (vehicle filters) — independent
  │
  ├── Task 7 (inventory page) depends on Tasks 2, 3, 4
  ├── Task 8 (aging page) depends on Tasks 2, 3
  │
Task 9 (info card + timeline) depends on Tasks 2, 3
  └── Task 10 (action form + detail page) depends on Tasks 2, 9
      │
Task 11 (C4 diagrams) — independent, can run anytime
Task 12 (flow diagrams) — after implementation complete (after Task 10)
Task 13 (verification) — after all other tasks
```

## Parallelization Strategy

**Batch 1** (fully independent — run in parallel):
- Task 0: Install Recharts
- Task 1: Sidebar navigation
- Task 2: TanStack Query hooks
- Task 3: Shared UI components
- Task 4: Vehicle filters
- Task 11: C4 diagrams

**Batch 2** (depends on Batch 1):
- Task 5: Charts (needs recharts from Task 0)
- Task 7: Inventory page (needs hooks + filters from Tasks 2, 4)
- Task 8: Aging page (needs hooks + components from Tasks 2, 3)
- Task 9: Vehicle info card + timeline (needs hooks from Task 2)

**Batch 3** (depends on Batch 2):
- Task 6: Dashboard page (needs charts from Task 5)
- Task 10: Action form + vehicle detail page (needs components from Task 9)

**Batch 4** (final):
- Task 12: Flow diagrams
- Task 13: Final verification
