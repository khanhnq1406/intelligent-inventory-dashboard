# Error Handling & Polish Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Add production-readiness polish — Next.js error boundaries, custom 404, improved API client with typed errors and retry, dynamic filter dropdowns, accessibility improvements, and consistent loading skeletons.

**Spec:** `docs/specs/2026-03-17-error-handling-polish-spec.md`

**Architecture:** Pure frontend improvement. No new containers or API changes. Enhances the existing Next.js 14 App Router + TanStack Query stack with error boundaries (`error.tsx`), loading files (`loading.tsx`), an improved `lib/api/client.ts`, and ARIA/accessibility additions across existing components.

**Tech Stack:** Next.js 14 App Router | TanStack Query | shadcn/ui | Tailwind CSS | TypeScript

---

## Security Implementation Notes

- **Error boundaries**: Log errors to `console.error` only. Never expose stack traces or internal error details in UI.
- **API retry**: Only retry GET requests on 5xx. Never retry POST/PUT/DELETE. Max 1 retry. This prevents retry amplifying backend failures.
- **Dynamic makes**: Makes data comes from dashboard summary API — display only, no security impact. XSS-safe as React renders text content as text nodes.
- **Timeout**: 30s `AbortController` timeout prevents hanging requests.
- **ARIA labels**: No security implications — accessibility only.

---

## C4 Architecture Diagram Updates

No new containers or services. No C4 updates required (spec confirms this).

---

## Task Overview

| # | Task | Files | TDD |
|---|------|-------|-----|
| 0 | Shared skeleton primitives | `components/ui/skeleton.tsx` | Yes |
| 1 | Shared error fallback component | `components/error-fallback.tsx` | Yes |
| 2 | Improved API client | `lib/api/client.ts` | Yes |
| 3 | `useMakes` hook (dynamic filter) | `hooks/use-makes.ts` | Yes |
| 4 | Update `VehicleFilters` for dynamic makes | `components/vehicle-filters.tsx` | Yes |
| 5 | Global error boundary + 404 | `app/error.tsx`, `app/not-found.tsx` | Manual |
| 6 | Per-route error boundaries | `app/inventory/error.tsx`, `app/aging/error.tsx`, `app/vehicles/[id]/error.tsx` | Manual |
| 7 | Loading skeleton files | `app/loading.tsx`, `app/inventory/loading.tsx`, `app/aging/loading.tsx`, `app/vehicles/[id]/loading.tsx` | Manual |
| 8 | Accessibility: sidebar + nav | `components/sidebar.tsx`, `components/mobile-nav.tsx` | Yes |
| 9 | Accessibility: filters, tables, pagination | `components/vehicle-filters.tsx`, `components/pagination.tsx`, page files | Yes |
| 10 | Accessibility: stats cards and modal | `components/stats-card.tsx`, `components/add-vehicle-modal.tsx` | Yes |

**Execution order:** Tasks 0 and 1 first (shared primitives). Tasks 2, 3, 5 can proceed in parallel after 0/1. Task 4 depends on Task 3. Tasks 6, 7 depend on Task 1. Tasks 8, 9, 10 are independent.

---

## Task 0: Shared Skeleton Primitives

**Files:**
- Create: `frontend/src/components/ui/skeleton.tsx`
- Test: `frontend/src/components/__tests__/skeleton.test.tsx`

**Security notes:** None — pure UI animation component.

**Step 1: Write the failing test**

```typescript
// frontend/src/components/__tests__/skeleton.test.tsx
import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  StatsCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  VehicleInfoSkeleton,
} from "@/components/ui/skeleton";

describe("Skeleton primitives", () => {
  it("Skeleton renders with animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("Skeleton accepts custom className", () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    expect(container.firstChild).toHaveClass("h-8", "w-32");
  });

  it("StatsCardSkeleton renders 4 skeleton cards", () => {
    const { container } = render(<StatsCardSkeleton />);
    // 4 cards in the grid
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("TableSkeleton renders skeleton rows", () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("ChartSkeleton renders a skeleton container", () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("VehicleInfoSkeleton renders skeleton for vehicle detail", () => {
    const { container } = render(<VehicleInfoSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="skeleton" --no-coverage
```

Expected: All tests fail (file does not exist).

**Step 3: Write implementation**

```typescript
// frontend/src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800",
        className
      )}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 h-24"
        />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header skeleton */}
      <div className="flex gap-4 bg-zinc-50 dark:bg-zinc-800 px-6 py-3">
        {[...Array(columns)].map((_, j) => (
          <div key={j} className="animate-pulse h-4 flex-1 rounded bg-zinc-200 dark:bg-zinc-700" />
        ))}
      </div>
      {/* Row skeletons */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="animate-pulse h-4 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse h-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
  );
}

export function VehicleInfoSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className="animate-pulse h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
      {/* Info card skeleton */}
      <div className="animate-pulse h-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
      {/* Two-column skeleton */}
      <div className="flex flex-col gap-6 lg:flex-row-reverse">
        <div className="animate-pulse h-64 lg:w-[380px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        <div className="animate-pulse h-64 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- --testPathPattern="skeleton" --no-coverage
```

Expected: All 6 tests pass.

**Step 5: Commit**

```bash
cd frontend && git add src/components/ui/skeleton.tsx src/components/__tests__/skeleton.test.tsx
git commit -m "feat(polish): add shared skeleton primitive components"
```

---

## Task 1: Shared Error Fallback Component

**Files:**
- Create: `frontend/src/components/error-fallback.tsx`
- Test: `frontend/src/components/__tests__/error-fallback.test.tsx`

**Security notes:** Never display `error.message` or `error.stack` to the user. Only log to `console.error`. Show a generic user-friendly message.

**Step 1: Write the failing test**

```typescript
// frontend/src/components/__tests__/error-fallback.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorFallback } from "@/components/error-fallback";

const mockReset = jest.fn();

describe("ErrorFallback", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockReset.mockClear();
  });

  it("renders error title and description", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error occurred/i)
    ).toBeInTheDocument();
  });

  it("does NOT display error.message to user", () => {
    render(<ErrorFallback error={new Error("secret internal detail")} reset={mockReset} />);
    expect(screen.queryByText("secret internal detail")).not.toBeInTheDocument();
  });

  it("logs error to console.error", () => {
    const err = new Error("test error");
    render(<ErrorFallback error={err} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Error boundary caught:", err);
  });

  it("calls reset when Try Again is clicked", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders Go to Dashboard link", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders AlertTriangle icon", () => {
    const { container } = render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    // Icon renders as SVG
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="error-fallback" --no-coverage
```

**Step 3: Write implementation**

```typescript
// frontend/src/components/error-fallback.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700 text-white">
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- --testPathPattern="error-fallback" --no-coverage
```

**Step 5: Commit**

```bash
git add frontend/src/components/error-fallback.tsx frontend/src/components/__tests__/error-fallback.test.tsx
git commit -m "feat(polish): add shared ErrorFallback component"
```

---

## Task 2: Improved API Client

**Files:**
- Modify: `frontend/src/lib/api/client.ts`
- Test: `frontend/src/lib/api/__tests__/client.test.ts`

**Security notes:**
- Retry only on 5xx, only for GET (idempotent). Never retry POST/PUT/DELETE.
- 30s timeout prevents hanging requests.
- `ApiError.details` comes from backend `ErrorResponse.message` — no additional sanitization needed (React renders as text nodes, not HTML).
- Log retries to console for observability.

**Step 1: Write the failing test**

```typescript
// frontend/src/lib/api/__tests__/client.test.ts
import { apiFetch, ApiError } from "@/lib/api/client";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock timers for retry delay
jest.useFakeTimers();

describe("apiFetch", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("ApiError class", () => {
    it("has status, code, and details properties", () => {
      const err = new ApiError("Test", 404, "NOT_FOUND", "Not found detail");
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.details).toBe("Not found detail");
      expect(err instanceof Error).toBe(true);
    });
  });

  describe("successful requests", () => {
    it("returns parsed JSON on 200", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "1", name: "test" }),
      });

      const result = await apiFetch<{ id: string; name: string }>("/api/v1/test");
      expect(result).toEqual({ id: "1", name: "test" });
    });
  });

  describe("4xx errors", () => {
    it("throws ApiError with status and code for 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 404, message: "Not found" }),
      });

      await expect(apiFetch("/api/v1/missing")).rejects.toMatchObject({
        status: 404,
        details: "Not found",
      });
      // No retry on 4xx
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on 4xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 400, message: "Bad request" }),
      });

      await expect(apiFetch("/api/v1/bad")).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("5xx errors and retry", () => {
    it("retries once on 5xx GET and succeeds on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ code: 503, message: "Service unavailable" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: "ok" }),
        });

      const promise = apiFetch<{ data: string }>("/api/v1/retry-test");
      // Advance timer past 1s retry delay
      jest.advanceTimersByTime(1100);
      const result = await promise;

      expect(result).toEqual({ data: "ok" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws ApiError after exhausting 1 retry on 5xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: "Internal error" }),
      });

      const promise = apiFetch("/api/v1/fail");
      jest.advanceTimersByTime(1100);

      await expect(promise).rejects.toMatchObject({ status: 500 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry POST on 5xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: "Server error" }),
      });

      await expect(
        apiFetch("/api/v1/vehicles", { method: "POST" })
      ).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("network errors", () => {
    it("wraps network error as ApiError with status 0", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(apiFetch("/api/v1/test")).rejects.toMatchObject({
        status: 0,
        code: "NETWORK_ERROR",
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="client.test" --no-coverage
```

**Step 3: Write implementation**

```typescript
// frontend/src/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(message: string, status: number, code: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorResponse {
  code: number;
  message: string;
}

function isRetryableMethod(options?: RequestInit): boolean {
  const method = (options?.method ?? "GET").toUpperCase();
  return method === "GET";
}

async function fetchOnce<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorBody: ErrorResponse | null = null;
      try {
        errorBody = await res.json();
      } catch {
        // Ignore JSON parse failures
      }
      throw new ApiError(
        errorBody?.message ?? `API error: ${res.status}`,
        res.status,
        errorBody ? String(errorBody.code) : "API_ERROR",
        errorBody?.message
      );
    }

    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 0, "TIMEOUT");
    }

    throw new ApiError(
      "Network error — please check your connection",
      0,
      "NETWORK_ERROR"
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  try {
    return await fetchOnce<T>(path, options);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status >= 500 &&
      isRetryableMethod(options)
    ) {
      console.warn(`apiFetch: retrying ${path} after 5xx (status ${err.status})`);
      await delay(RETRY_DELAY_MS);
      return fetchOnce<T>(path, options);
    }
    throw err;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- --testPathPattern="client.test" --no-coverage
```

**Step 5: Verify existing hooks still work (no interface changes)**

```bash
cd frontend && npm test -- --testPathPattern="use-dashboard|use-vehicles|use-vehicle" --no-coverage
```

**Step 6: Commit**

```bash
git add frontend/src/lib/api/client.ts frontend/src/lib/api/__tests__/client.test.ts
git commit -m "feat(polish): improve API client with typed errors, retry, and timeout"
```

---

## Task 3: `useMakes` Hook

**Files:**
- Create: `frontend/src/hooks/use-makes.ts`
- Test: `frontend/src/hooks/__tests__/use-makes.test.ts`

**Security notes:** Makes come from `DashboardSummary.by_make` — display-only strings, no sanitization needed.

**Step 1: Write the failing test**

```typescript
// frontend/src/hooks/__tests__/use-makes.test.ts
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMakes } from "@/hooks/use-makes";
import React from "react";

// Mock useDashboardSummary
jest.mock("@/hooks/use-dashboard-summary", () => ({
  useDashboardSummary: jest.fn(),
}));

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

const mockUseDashboardSummary = useDashboardSummary as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useMakes", () => {
  it("returns empty array while loading", () => {
    mockUseDashboardSummary.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useMakes(), { wrapper });
    expect(result.current.makes).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns sorted unique makes from dashboard summary", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: {
        by_make: [
          { make: "Toyota", count: 10, aging_count: 2 },
          { make: "Honda", count: 5, aging_count: 1 },
          { make: "BMW", count: 3, aging_count: 0 },
        ],
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useMakes(), { wrapper });
    expect(result.current.makes).toEqual(["BMW", "Honda", "Toyota"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns empty array when by_make is empty", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: { by_make: [] },
      isLoading: false,
    });
    const { result } = renderHook(() => useMakes(), { wrapper });
    expect(result.current.makes).toEqual([]);
  });

  it("filters out empty make strings", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: {
        by_make: [
          { make: "Toyota", count: 5, aging_count: 0 },
          { make: "", count: 1, aging_count: 0 },
        ],
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useMakes(), { wrapper });
    expect(result.current.makes).toEqual(["Toyota"]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="use-makes" --no-coverage
```

**Step 3: Write implementation**

```typescript
// frontend/src/hooks/use-makes.ts
import { useMemo } from "react";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

interface UseMakesResult {
  makes: string[];
  isLoading: boolean;
}

export function useMakes(): UseMakesResult {
  const { data, isLoading } = useDashboardSummary();

  const makes = useMemo(() => {
    if (!data?.by_make) return [];
    return data.by_make
      .map((m) => m.make)
      .filter((make) => make.length > 0)
      .sort();
  }, [data?.by_make]);

  return { makes, isLoading };
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- --testPathPattern="use-makes" --no-coverage
```

**Step 5: Commit**

```bash
git add frontend/src/hooks/use-makes.ts frontend/src/hooks/__tests__/use-makes.test.ts
git commit -m "feat(polish): add useMakes hook deriving makes from dashboard summary"
```

---

## Task 4: Update `VehicleFilters` for Dynamic Makes

**Files:**
- Modify: `frontend/src/components/vehicle-filters.tsx`
- Test: `frontend/src/components/__tests__/vehicle-filters.test.tsx` (update existing)

**Security notes:** None — display-only dropdown. Makes rendered as `<option>` text content (React text nodes, XSS-safe).

**Step 1: Write/update the failing test**

Add to `frontend/src/components/__tests__/vehicle-filters.test.tsx`:

```typescript
// Add to existing test file or create if missing
import { render, screen } from "@testing-library/react";
import { VehicleFilters } from "@/components/vehicle-filters";

jest.mock("@/hooks/use-makes", () => ({
  useMakes: jest.fn(),
}));
import { useMakes } from "@/hooks/use-makes";
const mockUseMakes = useMakes as jest.Mock;

const defaultFilters = { search: "", make: "", model: "", status: "", aging: false };

describe("VehicleFilters — dynamic makes", () => {
  it("shows 'All Makes' and dynamic makes from hook", () => {
    mockUseMakes.mockReturnValue({
      makes: ["BMW", "Honda", "Toyota"],
      isLoading: false,
    });
    render(
      <VehicleFilters
        filters={defaultFilters}
        onFiltersChange={jest.fn()}
      />
    );
    expect(screen.getByRole("option", { name: "All Makes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "BMW" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Honda" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Toyota" })).toBeInTheDocument();
    // Hardcoded makes should NOT exist
    expect(screen.queryByRole("option", { name: "Chevrolet" })).not.toBeInTheDocument();
  });

  it("disables make dropdown while loading", () => {
    mockUseMakes.mockReturnValue({ makes: [], isLoading: true });
    render(
      <VehicleFilters
        filters={defaultFilters}
        onFiltersChange={jest.fn()}
      />
    );
    // The make select should show only "All Makes" when loading
    expect(screen.getByRole("option", { name: "All Makes" })).toBeInTheDocument();
  });

  it("shows only 'All Makes' when inventory has no makes", () => {
    mockUseMakes.mockReturnValue({ makes: [], isLoading: false });
    render(
      <VehicleFilters
        filters={defaultFilters}
        onFiltersChange={jest.fn()}
      />
    );
    const options = screen.getAllByRole("option");
    // Only "All Makes" in the make dropdown (plus status options)
    expect(screen.getByRole("option", { name: "All Makes" })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="vehicle-filters" --no-coverage
```

**Step 3: Write implementation**

Modify `frontend/src/components/vehicle-filters.tsx` — replace hardcoded `makes` array with `useMakes()`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMakes } from "@/hooks/use-makes";
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

const statuses = ["All Statuses", "available", "sold", "reserved"];

export function VehicleFilters({ filters, onFiltersChange, totalCount }: VehicleFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const { makes, isLoading: makesLoading } = useMakes();

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
          aria-label="Search vehicles by VIN, make, or model"
          className="h-9 w-60 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Make dropdown — dynamic from API */}
      <select
        value={filters.make}
        onChange={(e) => updateFilter("make", e.target.value)}
        aria-label="Filter by make"
        disabled={makesLoading}
        className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
      >
        <option value="">All Makes</option>
        {makes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Status dropdown */}
      <select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        aria-label="Filter by status"
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
        aria-pressed={filters.aging}
        className={cn(
          filters.aging && "bg-red-100 text-red-600 hover:bg-red-200 border-red-200"
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Aging Only
      </Button>

      {/* Count */}
      {totalCount !== undefined && (
        <span className="ml-auto text-sm text-zinc-400" aria-live="polite">
          Showing {totalCount} vehicles
        </span>
      )}
    </div>
  );
}
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="vehicle-filters" --no-coverage
```

**Step 5: Commit**

```bash
git add frontend/src/components/vehicle-filters.tsx frontend/src/components/__tests__/vehicle-filters.test.tsx
git commit -m "feat(polish): dynamic makes dropdown from API via useMakes hook"
```

---

## Task 5: Global Error Boundary + 404 Page

**Files:**
- Create: `frontend/src/app/error.tsx`
- Create: `frontend/src/app/not-found.tsx`

**Security notes:** `error.tsx` must be `"use client"` (Next.js requirement). Log error to console only, no internal details in UI.

**Note:** Next.js `error.tsx` and `not-found.tsx` are tested manually via the dev server. No unit tests are written for these shell files since they simply render the shared `ErrorFallback` component (already tested in Task 1).

**Step 1: Create `app/error.tsx`**

```typescript
// frontend/src/app/error.tsx
"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
```

**Step 2: Create `app/not-found.tsx`**

```typescript
// frontend/src/app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <p className="text-8xl font-bold text-zinc-200 dark:text-zinc-700">404</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
```

**Step 3: Verify files lint correctly**

```bash
cd frontend && npm run lint
```

**Step 4: Commit**

```bash
git add frontend/src/app/error.tsx frontend/src/app/not-found.tsx
git commit -m "feat(polish): add global error boundary and 404 page"
```

---

## Task 6: Per-Route Error Boundaries

**Files:**
- Create: `frontend/src/app/inventory/error.tsx`
- Create: `frontend/src/app/aging/error.tsx`
- Create: `frontend/src/app/vehicles/[id]/error.tsx`

**Security notes:** Same as Task 5 — `"use client"` required, no internal error details in UI.

**Step 1: Create per-route error boundaries (all three are identical in structure)**

```typescript
// frontend/src/app/inventory/error.tsx
"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
```

```typescript
// frontend/src/app/aging/error.tsx
"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function AgingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
```

```typescript
// frontend/src/app/vehicles/[id]/error.tsx
"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function VehicleDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
```

**Step 2: Verify lint**

```bash
cd frontend && npm run lint
```

**Step 3: Commit**

```bash
git add frontend/src/app/inventory/error.tsx frontend/src/app/aging/error.tsx frontend/src/app/vehicles/\[id\]/error.tsx
git commit -m "feat(polish): add per-route error boundaries for inventory, aging, vehicle detail"
```

---

## Task 7: Next.js Loading Files (Skeleton Pages)

**Files:**
- Create: `frontend/src/app/loading.tsx`
- Create: `frontend/src/app/inventory/loading.tsx`
- Create: `frontend/src/app/aging/loading.tsx`
- Create: `frontend/src/app/vehicles/[id]/loading.tsx`

**Security notes:** None — pure UI.

**Step 1: Create global loading fallback**

```typescript
// frontend/src/app/loading.tsx
import { StatsCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <StatsCardSkeleton />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ChartSkeleton />
        </div>
        <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 lg:w-[380px]" />
      </div>
      <TableSkeleton rows={3} columns={4} />
    </div>
  );
}
```

**Step 2: Create inventory loading**

```typescript
// frontend/src/app/inventory/loading.tsx
import { TableSkeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-60 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <TableSkeleton rows={8} columns={8} />
    </div>
  );
}
```

**Step 3: Create aging loading**

```typescript
// frontend/src/app/aging/loading.tsx
import { StatsCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function AgingLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      {/* Alert skeleton */}
      <div className="h-14 animate-pulse rounded-lg bg-red-50 dark:bg-red-950" />
      {/* Stats — 3 cols for aging */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
        ))}
      </div>
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}
```

**Step 4: Create vehicle detail loading**

```typescript
// frontend/src/app/vehicles/[id]/loading.tsx
import { VehicleInfoSkeleton } from "@/components/ui/skeleton";

export default function VehicleDetailLoading() {
  return <VehicleInfoSkeleton />;
}
```

**Step 5: Verify lint**

```bash
cd frontend && npm run lint
```

**Step 6: Commit**

```bash
git add frontend/src/app/loading.tsx frontend/src/app/inventory/loading.tsx frontend/src/app/aging/loading.tsx frontend/src/app/vehicles/\[id\]/loading.tsx
git commit -m "feat(polish): add Next.js loading.tsx skeleton pages for all routes"
```

---

## Task 8: Accessibility — Sidebar & Mobile Nav

**Files:**
- Modify: `frontend/src/components/sidebar.tsx`
- Modify: `frontend/src/components/mobile-nav.tsx`
- Test: `frontend/src/components/__tests__/sidebar.test.tsx` (update or create)

**Security notes:** None — ARIA labels and navigation semantics only.

**Step 1: Write the failing test**

```typescript
// frontend/src/components/__tests__/sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/sidebar";

// Mock Next.js hooks
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

import React from "react";

describe("Sidebar accessibility", () => {
  it("has role=navigation with aria-label", () => {
    render(<Sidebar />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("marks the active link with aria-current=page", () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("non-active links do not have aria-current", () => {
    render(<Sidebar />);
    const inventoryLink = screen.getByRole("link", { name: /inventory/i });
    expect(inventoryLink).not.toHaveAttribute("aria-current", "page");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="sidebar.test" --no-coverage
```

**Step 3: Write implementation for sidebar**

Update `frontend/src/components/sidebar.tsx`:
- Add `role="navigation"` and `aria-label="Main navigation"` to the `<nav>` element
- Add `aria-current="page"` to the active link
- Add `aria-label` to each link with full label text (not just title)

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Car, label: "Inventory" },
  { href: "/aging", icon: Clock, label: "Aging Stock" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-16 flex-col items-center bg-zinc-950 py-4">
      {/* Logo */}
      <Link
        href="/"
        aria-label="Go to Dashboard"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
      >
        IV
      </Link>

      {/* Nav icons */}
      <nav role="navigation" aria-label="Main navigation" className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <ThemeToggle />
    </aside>
  );
}
```

**Step 4: Update `mobile-nav.tsx`** — read current file and add similar ARIA attributes (role="navigation", aria-label, aria-current).

**Step 5: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="sidebar" --no-coverage
```

**Step 6: Commit**

```bash
git add frontend/src/components/sidebar.tsx frontend/src/components/mobile-nav.tsx frontend/src/components/__tests__/sidebar.test.tsx
git commit -m "feat(polish): add ARIA labels and aria-current to sidebar and mobile nav"
```

---

## Task 9: Accessibility — Filters, Tables, Pagination

**Files:**
- Modify: `frontend/src/app/inventory/page.tsx` (table aria-label)
- Modify: `frontend/src/app/aging/page.tsx` (table aria-label)
- Modify: `frontend/src/components/pagination.tsx` (nav + aria-label)
- Test: `frontend/src/components/__tests__/pagination.test.tsx` (update)

**Security notes:** None — ARIA semantics only.

**Step 1: Write failing test for pagination**

Add to `frontend/src/components/__tests__/pagination.test.tsx`:

```typescript
describe("Pagination accessibility", () => {
  it("wraps pagination in nav with aria-label", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toBeInTheDocument();
  });

  it("has previous and next buttons with descriptive aria-labels", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("marks current page button with aria-current", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={jest.fn()} />);
    const currentBtn = screen.getByRole("button", { name: /page 2, current/i });
    expect(currentBtn).toHaveAttribute("aria-current", "page");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="pagination" --no-coverage
```

**Step 3: Read and update `pagination.tsx`**

Read current file first, then update with:
- Wrap in `<nav aria-label="Pagination">`
- Add `aria-label="Previous page"` / `aria-label="Next page"` to prev/next buttons
- Add `aria-current="page"` to current page button
- Add `aria-label="Page N"` / `aria-label="Page N, current"` to page buttons

**Step 4: Update inventory and aging table elements**

Add `aria-label="Vehicle inventory"` to the inventory table.
Add `aria-label="Aging stock vehicles"` to the aging table.

These changes are in `app/inventory/page.tsx` and `app/aging/page.tsx` respectively — find the `<Table>` components and add the aria-label prop.

**Step 5: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="pagination" --no-coverage
```

**Step 6: Commit**

```bash
git add frontend/src/components/pagination.tsx frontend/src/app/inventory/page.tsx frontend/src/app/aging/page.tsx
git commit -m "feat(polish): add ARIA labels to tables and pagination navigation"
```

---

## Task 10: Accessibility — Stats Cards and Modal

**Files:**
- Modify: `frontend/src/components/stats-card.tsx`
- Modify: `frontend/src/components/add-vehicle-modal.tsx`
- Test: `frontend/src/components/__tests__/stats-card.test.tsx` (update)
- Test: `frontend/src/components/__tests__/add-vehicle-modal.test.tsx` (update)

**Security notes:** None — ARIA semantics only.

**Step 1: Write failing test for stats card**

Add to `frontend/src/components/__tests__/stats-card.test.tsx`:

```typescript
describe("StatsCard accessibility", () => {
  it("has role=status and dynamic aria-label", () => {
    render(<StatsCard title="Total Vehicles" value={150} />);
    const card = screen.getByRole("status");
    expect(card).toHaveAttribute("aria-label", "Total Vehicles: 150");
  });
});
```

**Step 2: Write failing test for modal**

Add to `frontend/src/components/__tests__/add-vehicle-modal.test.tsx`:

```typescript
describe("AddVehicleModal accessibility", () => {
  it("has role=dialog and aria-modal=true", async () => {
    render(<AddVehicleModal open={true} onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("dialog is labelled by its title", async () => {
    render(<AddVehicleModal open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: /add vehicle/i })).toBeInTheDocument();
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
cd frontend && npm test -- --testPathPattern="stats-card|add-vehicle-modal" --no-coverage
```

**Step 4: Update `stats-card.tsx`**

Read current file and add:
- `role="status"` to the card container
- `aria-label={`${title}: ${value}`}` (dynamic, computed from props)

**Step 5: Update `add-vehicle-modal.tsx`**

The modal uses shadcn/ui `<Dialog>` which handles `role="dialog"` and `aria-modal` automatically via Radix UI. Verify `aria-labelledby` is set to the dialog title element ID.

If the Dialog title is rendered via `<DialogTitle>`, Radix UI automatically connects it. Verify this is the case and add an explicit `id` if needed.

**Step 6: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="stats-card|add-vehicle-modal" --no-coverage
```

**Step 7: Run full test suite**

```bash
cd frontend && npm test --no-coverage
```

Expected: All tests pass.

**Step 8: Commit**

```bash
git add frontend/src/components/stats-card.tsx frontend/src/components/add-vehicle-modal.tsx
git commit -m "feat(polish): add ARIA labels to stats cards and verify modal accessibility"
```

---

## Final Verification

After all tasks are complete:

```bash
# Run full test suite
cd frontend && npm test --no-coverage

# Run lint
cd frontend && npm run lint

# Verify build succeeds
cd frontend && npm run build
```

All checks must pass before writing the implementation report.

---

## Implementation Report Template

Save to: `docs/reports/2026-03-18-error-handling-polish-report.md`

See secure-feature-pipeline skill for the report template structure.

---

## Progress File

Save to: `docs/reports/2026-03-18-error-handling-polish-progress.md`

Will be initialized at the start of implementation per the secure-feature-pipeline checkpoint protocol.
