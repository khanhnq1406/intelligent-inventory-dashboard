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
