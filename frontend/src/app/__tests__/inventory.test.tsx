import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as navigation from "next/navigation";
import InventoryPage from "@/app/inventory/page";
import { mockPaginatedVehicles } from "@/test/mocks";

const mockUseVehicles = vi.fn();

vi.mock("@/hooks/use-vehicles", () => ({
  useVehicles: () => mockUseVehicles(),
}));

describe("InventoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title 'Vehicle Inventory'", () => {
    mockUseVehicles.mockReturnValue({ data: mockPaginatedVehicles, isLoading: false, error: null });
    render(<InventoryPage />);
    expect(screen.getByText("Vehicle Inventory")).toBeInTheDocument();
  });

  it("renders table with column headers", () => {
    mockUseVehicles.mockReturnValue({ data: mockPaginatedVehicles, isLoading: false, error: null });
    render(<InventoryPage />);
    expect(screen.getByText("VIN")).toBeInTheDocument();
    expect(screen.getByText("Make")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Days")).toBeInTheDocument();
  });

  it("renders vehicle rows from mocked data", () => {
    mockUseVehicles.mockReturnValue({ data: mockPaginatedVehicles, isLoading: false, error: null });
    render(<InventoryPage />);
    // VIN values are unique — use them to confirm rows rendered
    expect(screen.getByText("TEST-VIN-12345678")).toBeInTheDocument();
    expect(screen.getByText("TEST-VIN-87654321")).toBeInTheDocument();
    expect(screen.getByText("Camry")).toBeInTheDocument();
    expect(screen.getByText("Civic")).toBeInTheDocument();
  });

  it("shows 'No vehicles found' when items is empty", () => {
    mockUseVehicles.mockReturnValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      isLoading: false,
      error: null,
    });
    render(<InventoryPage />);
    expect(screen.getByText("No vehicles found")).toBeInTheDocument();
  });

  it("shows error state when error is truthy", () => {
    mockUseVehicles.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("API error"),
    });
    render(<InventoryPage />);
    expect(screen.getByText("Failed to load vehicles.")).toBeInTheDocument();
  });

  it("row click calls router.push with /vehicles/{id}", async () => {
    const mockPush = vi.fn();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);

    mockUseVehicles.mockReturnValue({ data: mockPaginatedVehicles, isLoading: false, error: null });
    render(<InventoryPage />);

    const rows = screen.getAllByRole("row");
    // rows[0] is header, rows[1] is first data row
    rows[1].click();
    expect(mockPush).toHaveBeenCalledWith("/vehicles/vehicle-001");
  });

  it("renders pagination when total_pages > 1", () => {
    mockUseVehicles.mockReturnValue({
      data: { items: mockPaginatedVehicles.items, total: 100, page: 1, page_size: 20, total_pages: 5 },
      isLoading: false,
      error: null,
    });
    render(<InventoryPage />);
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });
});
