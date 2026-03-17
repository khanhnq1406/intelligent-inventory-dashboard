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
