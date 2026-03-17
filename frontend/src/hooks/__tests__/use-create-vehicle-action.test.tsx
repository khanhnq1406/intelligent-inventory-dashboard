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
