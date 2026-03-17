import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VehicleDetailPage from "@/app/vehicles/[id]/page";
import { mockVehicle } from "@/test/mocks";

const mockUseVehicle = vi.fn();

vi.mock("@/hooks/use-vehicle", () => ({
  useVehicle: () => mockUseVehicle(),
}));

vi.mock("@/hooks/use-create-vehicle-action", () => ({
  useCreateVehicleAction: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

// Mock React's use() to return params synchronously
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    use: () => ({ id: "vehicle-001" }),
  };
});

describe("VehicleDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders VehicleInfoCard with vehicle data", () => {
    mockUseVehicle.mockReturnValue({ data: mockVehicle, isLoading: false, error: null });

    render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    expect(screen.getByText("2024 Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText(/TEST-VIN-12345678/)).toBeInTheDocument();
  });

  it("renders ActionTimeline with vehicle actions", () => {
    mockUseVehicle.mockReturnValue({ data: mockVehicle, isLoading: false, error: null });

    render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    expect(screen.getByText("Action History")).toBeInTheDocument();
    // "Price Reduction" appears in both action timeline badge and action form list
    expect(screen.getAllByText("Price Reduction").length).toBeGreaterThan(0);
  });

  it("renders ActionForm", () => {
    mockUseVehicle.mockReturnValue({ data: mockVehicle, isLoading: false, error: null });

    render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    expect(screen.getByText("Log New Action")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    mockUseVehicle.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows 'Vehicle not found' when error is set", () => {
    mockUseVehicle.mockReturnValue({ data: undefined, isLoading: false, error: new Error("API error: 404") });

    render(<VehicleDetailPage params={Promise.resolve({ id: "nonexistent" })} />);
    expect(screen.getByText("Vehicle not found.")).toBeInTheDocument();
  });

  it("shows 'Vehicle not found' when vehicle is undefined", () => {
    mockUseVehicle.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    expect(screen.getByText("Vehicle not found.")).toBeInTheDocument();
  });

  it("'Back to Inventory' link is present", () => {
    mockUseVehicle.mockReturnValue({ data: mockVehicle, isLoading: false, error: null });

    render(<VehicleDetailPage params={Promise.resolve({ id: "vehicle-001" })} />);
    const backLink = screen.getByText("Back to Inventory").closest("a");
    expect(backLink).toHaveAttribute("href", "/inventory");
  });
});
