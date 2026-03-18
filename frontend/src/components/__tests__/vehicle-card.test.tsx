import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleCard } from "@/components/vehicle-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockVehicle = {
  id: "v1",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  vin: "1HGBH41JXMN109186",
  status: "available" as const,
  price: 25000,
  days_in_stock: 45,
  is_aging: false,
  actions: [],
};

describe("VehicleCard", () => {
  it("renders vehicle make, model, year", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("2022 Toyota Camry")).toBeTruthy();
  });

  it("renders VIN", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("1HGBH41JXMN109186")).toBeTruthy();
  });

  it("renders days in stock", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText(/45/)).toBeTruthy();
  });

  it("renders price", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("$25,000")).toBeTruthy();
  });

  it("calls onClick when tapped", () => {
    const onClick = vi.fn();
    render(<VehicleCard vehicle={mockVehicle} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("highlights aging vehicles with red text", () => {
    const agingVehicle = { ...mockVehicle, days_in_stock: 120, is_aging: true };
    render(<VehicleCard vehicle={agingVehicle} onClick={() => {}} />);
    const daysEl = screen.getByText(/120/);
    expect(daysEl.className).toContain("text-red");
  });
});
