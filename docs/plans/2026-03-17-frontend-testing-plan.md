# Frontend Testing Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Set up Vitest + React Testing Library for unit/component tests and Playwright for E2E tests, then write tests for all hooks, components, and pages.
**Spec:** `docs/specs/2026-03-17-frontend-testing-spec.md`
**Architecture:** Testing infrastructure only — no changes to app architecture. Vitest runs in jsdom, mocking `apiFetch` and `next/navigation`. Playwright runs against a live dev server.
**Tech Stack:** Vitest + jsdom + React Testing Library | Playwright | Next.js 14 + TanStack Query

## Security Implementation Notes
- No security changes to the application
- Test fixtures use clearly fake data (e.g., `TEST-VIN-12345678`, `test-dealer-id`)
- No real API calls in unit tests — `apiFetch` is globally mocked
- E2E tests hit local dev server only

## C4 Architecture Diagram Updates
None — testing infrastructure doesn't change application architecture.

---

### Task 1: Vitest + React Testing Library Setup

**Files:**
- Modify: `frontend/package.json` (add devDependencies + test scripts)
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/test-utils.tsx` (QueryClient wrapper + custom render)
- Create: `frontend/src/test/mocks.ts` (mock data fixtures)

**Security notes:** None — infrastructure setup only.

**Step 1: Install test dependencies**
```bash
cd frontend && npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react @vitest/coverage-v8
```

**Step 2: Add test scripts to package.json**
Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 3: Create `frontend/vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 4: Create `frontend/src/test/setup.ts`**
```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock next/navigation globally
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/dynamic to render the component directly
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>, _options?: any) => {
    let Component: any = null;
    loader().then((mod: any) => {
      Component = mod.default || mod;
    });
    return function DynamicWrapper(props: any) {
      if (!Component) return null;
      return <Component {...props} />;
    };
  },
}));
```

**Step 5: Create `frontend/src/test/test-utils.tsx`**
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const queryClient = createTestQueryClient();
  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
      ...options,
    }),
    queryClient,
  };
}

export { render, screen, waitFor, within, act } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
```

**Step 6: Create `frontend/src/test/mocks.ts`**
```ts
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];
type VehicleAction = components["schemas"]["VehicleAction"];
type DashboardSummary = components["schemas"]["DashboardSummary"];
type PaginatedVehicles = components["schemas"]["PaginatedVehicles"];

export const mockAction: VehicleAction = {
  id: "action-001",
  vehicle_id: "vehicle-001",
  action_type: "price_reduction",
  notes: "Reduced by $500",
  created_by: "Test User",
  created_at: "2026-01-15T10:00:00Z",
};

export const mockVehicle: Vehicle = {
  id: "vehicle-001",
  dealership_id: "test-dealer-001",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  vin: "TEST-VIN-12345678",
  price: 30000,
  status: "available",
  stocked_at: "2025-12-01T00:00:00Z",
  days_in_stock: 106,
  is_aging: true,
  actions: [mockAction],
};

export const mockVehicleNonAging: Vehicle = {
  id: "vehicle-002",
  dealership_id: "test-dealer-001",
  make: "Honda",
  model: "Civic",
  year: 2025,
  vin: "TEST-VIN-87654321",
  price: 25000,
  status: "available",
  stocked_at: "2026-02-01T00:00:00Z",
  days_in_stock: 44,
  is_aging: false,
  actions: [],
};

export const mockPaginatedVehicles: PaginatedVehicles = {
  items: [mockVehicle, mockVehicleNonAging],
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

export const mockDashboardSummary: DashboardSummary = {
  total_vehicles: 150,
  aging_vehicles: 12,
  average_days_in_stock: 45,
  by_make: [
    { make: "Toyota", count: 50, aging_count: 5 },
    { make: "Honda", count: 30, aging_count: 3 },
  ],
  by_status: [
    { status: "available", count: 100 },
    { status: "sold", count: 40 },
    { status: "reserved", count: 10 },
  ],
};
```

**Step 7: Verify setup works**
```bash
cd frontend && npx vitest run --passWithNoTests
```

**Step 8: Commit**
```
feat(frontend): add Vitest + React Testing Library infrastructure
```

---

### Task 2: Hook Tests — `useDashboardSummary`

**Files:**
- Create: `frontend/src/hooks/__tests__/use-dashboard-summary.test.ts`

**Security notes:** None — mock data only.

**Step 1: Write test file**
```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { createWrapper } from "@/test/test-utils";
import { mockDashboardSummary } from "@/test/mocks";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

describe("useDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches from /api/v1/dashboard/summary", async () => {
    mockApiFetch.mockResolvedValueOnce(mockDashboardSummary);

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/dashboard/summary");
  });

  it("returns typed dashboard summary data", async () => {
    mockApiFetch.mockResolvedValueOnce(mockDashboardSummary);

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total_vehicles).toBe(150);
    expect(result.current.data?.aging_vehicles).toBe(12);
    expect(result.current.data?.by_make).toHaveLength(2);
    expect(result.current.data?.by_status).toHaveLength(3);
  });

  it("handles API error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("API error: 500"));

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("API error: 500");
  });
});
```

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/hooks/__tests__/use-dashboard-summary.test.ts
```

**Step 3: Commit**
```
test(frontend): add useDashboardSummary hook tests
```

---

### Task 3: Hook Tests — `useVehicles`

**Files:**
- Create: `frontend/src/hooks/__tests__/use-vehicles.test.ts`

**Security notes:** None — mock data only.

**Step 1: Write test file**
```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useVehicles } from "@/hooks/use-vehicles";
import { createWrapper } from "@/test/test-utils";
import { mockPaginatedVehicles } from "@/test/mocks";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

describe("useVehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches with default params (no query string)", async () => {
    mockApiFetch.mockResolvedValueOnce(mockPaginatedVehicles);

    const { result } = renderHook(() => useVehicles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/vehicles");
  });

  it("builds correct query string from filters", async () => {
    mockApiFetch.mockResolvedValueOnce(mockPaginatedVehicles);

    const { result } = renderHook(
      () => useVehicles({ make: "Toyota", status: "available", page: 2, page_size: 20 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockApiFetch.mock.calls[0][0] as string;
    expect(url).toContain("make=Toyota");
    expect(url).toContain("status=available");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=20");
  });

  it("handles empty results", async () => {
    mockApiFetch.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    });

    const { result } = renderHook(() => useVehicles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it("handles API error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("API error: 503"));

    const { result } = renderHook(() => useVehicles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("API error: 503");
  });
});
```

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/hooks/__tests__/use-vehicles.test.ts
```

**Step 3: Commit**
```
test(frontend): add useVehicles hook tests
```

---

### Task 4: Hook Tests — `useVehicle`

**Files:**
- Create: `frontend/src/hooks/__tests__/use-vehicle.test.ts`

**Security notes:** None — mock data only.

**Step 1: Write test file**
```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useVehicle } from "@/hooks/use-vehicle";
import { createWrapper } from "@/test/test-utils";
import { mockVehicle } from "@/test/mocks";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

describe("useVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches vehicle by ID", async () => {
    mockApiFetch.mockResolvedValueOnce(mockVehicle);

    const { result } = renderHook(() => useVehicle("vehicle-001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/vehicles/vehicle-001");
    expect(result.current.data?.id).toBe("vehicle-001");
  });

  it("is disabled when id is empty string", async () => {
    const { result } = renderHook(() => useVehicle(""), {
      wrapper: createWrapper(),
    });

    // Should not fetch at all
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("handles 404 error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("API error: 404"));

    const { result } = renderHook(() => useVehicle("nonexistent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("API error: 404");
  });

  it("handles generic API error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("API error: 500"));

    const { result } = renderHook(() => useVehicle("vehicle-001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("API error: 500");
  });
});
```

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/hooks/__tests__/use-vehicle.test.ts
```

**Step 3: Commit**
```
test(frontend): add useVehicle hook tests
```

---

### Task 5: Hook Tests — `useCreateVehicleAction`

**Files:**
- Create: `frontend/src/hooks/__tests__/use-create-vehicle-action.test.ts`

**Security notes:** None — mock data only.

**Step 1: Write test file**
```ts
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCreateVehicleAction } from "@/hooks/use-create-vehicle-action";
import { createWrapper, createTestQueryClient } from "@/test/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { mockAction } from "@/test/mocks";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

describe("useCreateVehicleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits POST with correct URL and body", async () => {
    mockApiFetch.mockResolvedValueOnce(mockAction);

    const { result } = renderHook(() => useCreateVehicleAction("vehicle-001"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        action_type: "price_reduction",
        notes: "Reduced by $500",
        created_by: "Test User",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/vehicles/vehicle-001/actions", {
      method: "POST",
      body: JSON.stringify({
        action_type: "price_reduction",
        notes: "Reduced by $500",
        created_by: "Test User",
      }),
    });
  });

  it("invalidates correct query keys on success", async () => {
    mockApiFetch.mockResolvedValueOnce(mockAction);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateVehicleAction("vehicle-001"), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        action_type: "price_reduction",
        created_by: "Test User",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["vehicles", "vehicle-001"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["vehicles"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("handles 400 validation error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("API error: 400"));

    const { result } = renderHook(() => useCreateVehicleAction("vehicle-001"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        action_type: "price_reduction",
        created_by: "Test User",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("API error: 400");
  });
});
```

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/hooks/__tests__/use-create-vehicle-action.test.ts
```

**Step 3: Commit**
```
test(frontend): add useCreateVehicleAction hook tests
```

---

### Task 6: Component Tests — Simple components (Sidebar, StatsCard, StatusBadge, ActionBadge, AgingProgressBar)

**Files:**
- Create: `frontend/src/components/__tests__/sidebar.test.tsx`
- Create: `frontend/src/components/__tests__/stats-card.test.tsx`
- Create: `frontend/src/components/__tests__/status-badge.test.tsx`
- Create: `frontend/src/components/__tests__/action-badge.test.tsx`
- Create: `frontend/src/components/__tests__/aging-progress-bar.test.tsx`

**Security notes:** None — pure rendering tests.

**Step 1: Write `sidebar.test.tsx`**
Tests: Renders 3 nav links (Dashboard, Inventory, Aging Stock); Logo "IV" renders with link to `/`; Active route gets correct styling. Uses mocked `usePathname`.

**Step 2: Write `stats-card.test.tsx`**
Tests: Renders title and value; Shows up arrow and green text when `change.positive` is true; Shows down arrow and red text when `change.positive` is false; Renders with optional `description`; Renders without optional props (no `change`, no `description`).

**Step 3: Write `status-badge.test.tsx`**
Tests: Renders "Available" with blue styling for `available`; Renders "Sold" with red styling for `sold`; Renders "Reserved" with amber styling for `reserved`; Falls back to raw status text for unknown status.

**Step 4: Write `action-badge.test.tsx`**
Tests: Renders "Price Reduction" for `price_reduction`; Renders correct labels for all 6 known types; Falls back to raw action type text for unknown type.

**Step 5: Write `aging-progress-bar.test.tsx`**
Tests: Shows correct day count text; Orange color for 90 days (<=120); Red color for 150 days (>120); Width capped at 100% for 200 days.

**Step 6: Run all component tests**
```bash
cd frontend && npx vitest run src/components/__tests__/
```

**Step 7: Commit**
```
test(frontend): add tests for Sidebar, StatsCard, StatusBadge, ActionBadge, AgingProgressBar
```

---

### Task 7: Component Tests — Pagination

**Files:**
- Create: `frontend/src/components/__tests__/pagination.test.tsx`

**Security notes:** None — pure rendering tests.

**Step 1: Write test file**
Tests:
- Renders "Page 1 of 5" text
- Renders page number buttons
- Disables previous button when on page 1
- Disables next button when on last page
- Calls `onPageChange` with correct page number when clicking a page button
- Calls `onPageChange(page-1)` when clicking previous
- Calls `onPageChange(page+1)` when clicking next
- Shows ellipsis for large page counts (>5 pages)

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/components/__tests__/pagination.test.tsx
```

**Step 3: Commit**
```
test(frontend): add Pagination component tests
```

---

### Task 8: Component Tests — VehicleFilters

**Files:**
- Create: `frontend/src/components/__tests__/vehicle-filters.test.tsx`

**Security notes:** None — pure rendering/interaction tests.

**Step 1: Write test file**
Tests:
- Renders search input with placeholder
- Renders make dropdown with options
- Renders status dropdown with options
- Renders "Aging Only" toggle button
- Make dropdown selection calls `onFiltersChange` with updated make
- Status dropdown selection calls `onFiltersChange` with updated status
- Aging toggle calls `onFiltersChange` with toggled `aging` value
- Debounces search input — waits 300ms before calling `onFiltersChange`
- Shows total count when `totalCount` is provided

Uses `userEvent` for interactions, `vi.useFakeTimers()` for debounce testing.

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/components/__tests__/vehicle-filters.test.tsx
```

**Step 3: Commit**
```
test(frontend): add VehicleFilters component tests
```

---

### Task 9: Component Tests — VehicleInfoCard, ActionTimeline, ActionForm

**Files:**
- Create: `frontend/src/components/__tests__/vehicle-info-card.test.tsx`
- Create: `frontend/src/components/__tests__/action-timeline.test.tsx`
- Create: `frontend/src/components/__tests__/action-form.test.tsx`

**Security notes:** None — rendering/interaction tests. ActionForm mocks `useCreateVehicleAction`.

**Step 1: Write `vehicle-info-card.test.tsx`**
Tests:
- Renders vehicle title (year make model)
- Renders VIN
- Renders all 7 info fields (Make, Model, Year, Price, Status, Stocked, Days in Stock)
- Shows "Aging" badge when `vehicle.is_aging` is true
- Hides "Aging" badge when `vehicle.is_aging` is false
- Shows "-" when price is null/undefined

**Step 2: Write `action-timeline.test.tsx`**
Tests:
- Renders action list items
- Shows empty state "No actions recorded yet."
- First (latest) action has blue dot
- Subsequent actions have zinc/gray dots
- Renders action notes when present
- Renders "By: {created_by}" for each action

**Step 3: Write `action-form.test.tsx`**
Tests:
- Renders form fields: action type select, notes textarea, name input, submit button
- Submit button is disabled when action type is empty
- Submit button is disabled when created_by is empty
- Submit button is enabled when required fields are filled
- Submits with correct data
- Shows "Submitting..." during pending state (mock `mutation.isPending`)
- Shows error message on failure (mock `mutation.isError`)
- Shows success message on success (mock `mutation.isSuccess`)

Mock `useCreateVehicleAction` at module level.

**Step 4: Run all tests**
```bash
cd frontend && npx vitest run src/components/__tests__/
```

**Step 5: Commit**
```
test(frontend): add tests for VehicleInfoCard, ActionTimeline, ActionForm
```

---

### Task 10: Page Tests — Dashboard

**Files:**
- Create: `frontend/src/app/__tests__/page.test.tsx`

**Security notes:** None — mocked hooks, no API calls.

**Step 1: Write test file**
Mock `useDashboardSummary` and `useVehicles` at module level. Mock `next/dynamic` to render chart components synchronously.

Tests:
- Renders 4 stats cards when data is loaded (Total Vehicles, Aging Stock, Avg. Days, Coming soon)
- Renders "Recent Actions" section
- Shows loading skeletons when `summaryLoading` is true
- Shows error state with "Failed to load dashboard data" and retry button when `summaryError` is set
- Renders "No recent actions" when vehicles have no actions

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/app/__tests__/page.test.tsx
```

**Step 3: Commit**
```
test(frontend): add Dashboard page tests
```

---

### Task 11: Page Tests — Inventory

**Files:**
- Create: `frontend/src/app/__tests__/inventory.test.tsx`

**Security notes:** None — mocked hooks, no API calls.

**Step 1: Write test file**
Mock `useVehicles` and `useRouter` at module level.

Tests:
- Renders page title "Vehicle Inventory"
- Renders vehicle table with VIN, Make, Model, Year, Price, Status, Days, Last Action columns
- Renders vehicle rows from mocked data
- Shows "No vehicles found" when items is empty
- Shows error state when `error` is truthy
- Row click calls `router.push` with `/vehicles/{id}`
- Renders pagination when `total_pages > 1`

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/app/__tests__/inventory.test.tsx
```

**Step 3: Commit**
```
test(frontend): add Inventory page tests
```

---

### Task 12: Page Tests — Aging Stock

**Files:**
- Create: `frontend/src/app/__tests__/aging.test.tsx`

**Security notes:** None — mocked hooks, no API calls.

**Step 1: Write test file**
Mock `useVehicles` and `useRouter` at module level.

Tests:
- Renders page title "Aging Stock"
- Renders alert banner with vehicle count (e.g., "2 vehicles")
- Renders aging table with AgingProgressBar
- Renders 3 stats cards (Total Aging Vehicles, Avg. Days, Actions Taken)
- Shows empty state "No aging vehicles — great job!" when no vehicles
- Shows error state when `error` is truthy
- "Log Action" button calls `router.push` with vehicle detail URL

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/app/__tests__/aging.test.tsx
```

**Step 3: Commit**
```
test(frontend): add Aging Stock page tests
```

---

### Task 13: Page Tests — Vehicle Detail

**Files:**
- Create: `frontend/src/app/vehicles/__tests__/detail.test.tsx`

**Security notes:** None — mocked hooks, no API calls.

**Step 1: Write test file**
Mock `useVehicle` and `useCreateVehicleAction` at module level. Mock React's `use()` to return `{ id: "vehicle-001" }`.

Tests:
- Renders VehicleInfoCard with vehicle data
- Renders ActionTimeline with vehicle actions
- Renders ActionForm
- Shows loading skeleton when `isLoading` is true
- Shows error/404 state ("Vehicle not found") when `error` is set or `vehicle` is undefined
- "Back to Inventory" link present

**Step 2: Run tests**
```bash
cd frontend && npx vitest run src/app/vehicles/__tests__/detail.test.tsx
```

**Step 3: Commit**
```
test(frontend): add Vehicle Detail page tests
```

---

### Task 14: Run Full Test Suite + Coverage

**Files:**
- None created — validation task

**Step 1: Run all unit/component tests**
```bash
cd frontend && npx vitest run
```

**Step 2: Run with coverage**
```bash
cd frontend && npx vitest run --coverage
```

**Step 3: Fix any failing tests discovered during full run**

**Step 4: Commit any fixes**
```
test(frontend): fix test issues from full suite run
```

---

### Task 15: Playwright E2E Setup

**Files:**
- Modify: `frontend/package.json` (add e2e scripts)
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/dashboard.spec.ts`
- Create: `frontend/e2e/inventory.spec.ts`
- Create: `frontend/e2e/aging.spec.ts`
- Create: `frontend/e2e/vehicle-detail.spec.ts`

**Security notes:** E2E tests hit local dev server — no production data.

**Step 1: Install Playwright**
```bash
cd frontend && npm install --save-dev @playwright/test && npx playwright install chromium
```

**Step 2: Add E2E scripts to package.json**
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

**Step 3: Create `frontend/playwright.config.ts`**
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

**Step 4: Create `frontend/e2e/dashboard.spec.ts`**
```ts
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("page loads with stats cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Total Vehicles")).toBeVisible();
    await expect(page.getByText("Aging Stock")).toBeVisible();
    await expect(page.getByText("Avg. Days in Stock")).toBeVisible();
  });

  test("charts are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Recent Actions")).toBeVisible();
  });

  test("navigate to inventory via sidebar", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[title="Inventory"]').click();
    await expect(page).toHaveURL("/inventory");
    await expect(page.getByText("Vehicle Inventory")).toBeVisible();
  });
});
```

**Step 5: Create `frontend/e2e/inventory.spec.ts`**
```ts
import { test, expect } from "@playwright/test";

test.describe("Inventory", () => {
  test("table loads with vehicles", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText("Vehicle Inventory")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    await page.goto("/inventory");
    const search = page.getByPlaceholder("Search by VIN, make, model...");
    await search.fill("Toyota");
    // Wait for debounce
    await page.waitForTimeout(400);
    await expect(page.locator("table")).toBeVisible();
  });

  test("click row navigates to vehicle detail", async ({ page }) => {
    await page.goto("/inventory");
    // Wait for table to load
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().click();
    await expect(page).toHaveURL(/\/vehicles\/.+/);
  });
});
```

**Step 6: Create `frontend/e2e/aging.spec.ts`**
```ts
import { test, expect } from "@playwright/test";

test.describe("Aging Stock", () => {
  test("page loads with title", async ({ page }) => {
    await page.goto("/aging");
    await expect(page.getByText("Aging Stock")).toBeVisible();
  });

  test("alert banner shows vehicle count", async ({ page }) => {
    await page.goto("/aging");
    await expect(page.getByText(/vehicles/i)).toBeVisible();
    await expect(page.getByText("require attention")).toBeVisible();
  });

  test("Log Action button navigates to detail", async ({ page }) => {
    await page.goto("/aging");
    const logButton = page.getByRole("button", { name: "Log Action" }).first();
    await expect(logButton).toBeVisible();
    await logButton.click();
    await expect(page).toHaveURL(/\/vehicles\/.+/);
  });
});
```

**Step 7: Create `frontend/e2e/vehicle-detail.spec.ts`**
```ts
import { test, expect } from "@playwright/test";

test.describe("Vehicle Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to first vehicle from inventory
    await page.goto("/inventory");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().click();
    await expect(page).toHaveURL(/\/vehicles\/.+/);
  });

  test("info card shows vehicle data", async ({ page }) => {
    await expect(page.getByText("VIN:")).toBeVisible();
    await expect(page.getByText("Make")).toBeVisible();
    await expect(page.getByText("Model")).toBeVisible();
  });

  test("action timeline shows history", async ({ page }) => {
    await expect(page.getByText("Action History")).toBeVisible();
  });

  test("action form is visible", async ({ page }) => {
    await expect(page.getByText("Log New Action")).toBeVisible();
    await expect(page.getByText("Action Type")).toBeVisible();
    await expect(page.getByText("Your Name")).toBeVisible();
  });

  test("submit action form and see result", async ({ page }) => {
    await page.locator("select").first().selectOption("price_reduction");
    await page.getByPlaceholder("Enter your name").fill("E2E Test User");
    await page.getByPlaceholder("Add any notes").fill("E2E test action");
    await page.getByRole("button", { name: /Log Action/i }).click();
    // Wait for success or new action to appear
    await expect(page.getByText(/successfully|Price Reduction/i)).toBeVisible({ timeout: 10000 });
  });
});
```

**Step 8: Commit**
```
test(frontend): add Playwright E2E setup and 4 test suites
```

---

## Task Dependencies

```
Task 1 (Setup) ──→ Task 2, 3, 4, 5 (hooks — parallel)
                 ──→ Task 6, 7, 8, 9 (components — parallel)
                 ──→ Task 10, 11, 12, 13 (pages — parallel, after hooks done since they test mocked hooks)
Tasks 2-13       ──→ Task 14 (full suite validation)
Task 1           ──→ Task 15 (Playwright — independent of unit tests)
```

**Parallelization opportunities:**
- Tasks 2, 3, 4, 5 are fully independent (different hook test files)
- Tasks 6, 7, 8, 9 are fully independent (different component test files)
- Tasks 10, 11, 12, 13 are fully independent (different page test files)
- Task 15 is independent of tasks 2-14 (different test framework)

## Summary

| Category | Tasks | Test Files | Estimated Tests |
|----------|-------|------------|-----------------|
| Setup | 1 | 0 (infra) | — |
| Hook tests | 2-5 | 4 files | ~15 tests |
| Component tests | 6-9 | 10 files | ~40 tests |
| Page tests | 10-13 | 4 files | ~25 tests |
| Full suite validation | 14 | 0 (run all) | — |
| E2E | 15 | 4 files | ~14 tests |
| **Total** | **15** | **22 files** | **~94 tests** |
