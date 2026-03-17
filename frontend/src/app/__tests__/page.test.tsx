import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DashboardPage from "@/app/page";
import { mockDashboardSummary, mockPaginatedVehicles, mockVehicle } from "@/test/mocks";

const mockUseDashboardSummary = vi.fn();
const mockUseVehicles = vi.fn();

vi.mock("@/hooks/use-dashboard-summary", () => ({
  useDashboardSummary: () => mockUseDashboardSummary(),
}));

vi.mock("@/hooks/use-vehicles", () => ({
  useVehicles: () => mockUseVehicles(),
}));

// Mock chart components (next/dynamic is already mocked in setup)
vi.mock("@/components/charts/inventory-by-make-chart", () => ({
  InventoryByMakeChart: () => <div data-testid="inventory-by-make-chart" />,
}));
vi.mock("@/components/charts/vehicle-status-chart", () => ({
  VehicleStatusChart: () => <div data-testid="vehicle-status-chart" />,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVehicles.mockReturnValue({ data: mockPaginatedVehicles });
  });

  it("renders 4 stats cards when data is loaded", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);
    expect(screen.getByText("Total Vehicles")).toBeInTheDocument();
    expect(screen.getByText("Aging Stock")).toBeInTheDocument();
    expect(screen.getByText("Avg. Days in Stock")).toBeInTheDocument();
    expect(screen.getByText("Actions This Month")).toBeInTheDocument();
  });

  it("renders 'Recent Actions' section", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);
    expect(screen.getByText("Recent Actions")).toBeInTheDocument();
  });

  it("shows loading skeletons when summaryLoading is true", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<DashboardPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when summaryError is set", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("API error"),
    });

    render(<DashboardPage />);
    expect(screen.getByText("Failed to load dashboard data.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders 'No recent actions' when vehicles have no actions", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
      isLoading: false,
      error: null,
    });
    mockUseVehicles.mockReturnValue({
      data: {
        ...mockPaginatedVehicles,
        items: [{ ...mockVehicle, actions: [] }],
      },
    });

    render(<DashboardPage />);
    expect(screen.getByText("No recent actions")).toBeInTheDocument();
  });
});
