import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as navigation from "next/navigation";
import AgingStockPage from "@/app/aging/page";
import { mockVehicle } from "@/test/mocks";

const mockUseVehicles = vi.fn();

vi.mock("@/hooks/use-vehicles", () => ({
  useVehicles: () => mockUseVehicles(),
}));

const mockAgingVehicles = [{ ...mockVehicle, days_in_stock: 106, is_aging: true }];

describe("AgingStockPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title 'Aging Stock'", () => {
    mockUseVehicles.mockReturnValue({ data: { items: mockAgingVehicles, total: 1, page: 1, page_size: 100, total_pages: 1 }, isLoading: false, error: null });
    render(<AgingStockPage />);
    expect(screen.getByText("Aging Stock")).toBeInTheDocument();
  });

  it("renders alert banner with vehicle count", () => {
    mockUseVehicles.mockReturnValue({ data: { items: mockAgingVehicles, total: 1, page: 1, page_size: 100, total_pages: 1 }, isLoading: false, error: null });
    render(<AgingStockPage />);
    expect(screen.getByText(/1 vehicles/)).toBeInTheDocument();
    expect(screen.getByText(/require attention/)).toBeInTheDocument();
  });

  it("renders 3 stats cards", () => {
    mockUseVehicles.mockReturnValue({ data: { items: mockAgingVehicles, total: 1, page: 1, page_size: 100, total_pages: 1 }, isLoading: false, error: null });
    render(<AgingStockPage />);
    expect(screen.getByText("Total Aging Vehicles")).toBeInTheDocument();
    expect(screen.getByText("Avg. Days in Stock")).toBeInTheDocument();
    expect(screen.getByText("Actions Taken")).toBeInTheDocument();
  });

  it("renders aging table with AgingProgressBar", () => {
    mockUseVehicles.mockReturnValue({ data: { items: mockAgingVehicles, total: 1, page: 1, page_size: 100, total_pages: 1 }, isLoading: false, error: null });
    render(<AgingStockPage />);
    expect(screen.getAllByText("106 days").length).toBeGreaterThan(0);
  });

  it("shows empty state 'No aging vehicles — great job!'", () => {
    mockUseVehicles.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 0 }, isLoading: false, error: null });
    render(<AgingStockPage />);
    expect(screen.getAllByText("No aging vehicles — great job!").length).toBeGreaterThan(0);
  });

  it("shows error state when error is truthy", () => {
    mockUseVehicles.mockReturnValue({ data: null, isLoading: false, error: new Error("API error") });
    render(<AgingStockPage />);
    expect(screen.getByText("Failed to load aging stock data.")).toBeInTheDocument();
  });

  it("'Log Action' button calls router.push with vehicle detail URL", () => {
    const mockPush = vi.fn();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as ReturnType<typeof navigation.useRouter>);

    mockUseVehicles.mockReturnValue({ data: { items: mockAgingVehicles, total: 1, page: 1, page_size: 100, total_pages: 1 }, isLoading: false, error: null });
    render(<AgingStockPage />);

    screen.getAllByRole("button", { name: "Log Action" })[0].click();
    expect(mockPush).toHaveBeenCalledWith("/vehicles/vehicle-001");
  });
});
