import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMakes } from "@/hooks/use-makes";
import React from "react";

vi.mock("@/hooks/use-dashboard-summary", () => ({
  useDashboardSummary: vi.fn(),
}));

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

const mockUseDashboardSummary = useDashboardSummary as ReturnType<typeof vi.fn>;

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
