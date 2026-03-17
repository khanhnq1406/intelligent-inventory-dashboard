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
