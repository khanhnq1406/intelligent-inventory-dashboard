import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VehicleInfoCard } from "@/components/vehicle-info-card";
import { mockVehicle, mockVehicleNonAging } from "@/test/mocks";

describe("VehicleInfoCard", () => {
  it("renders vehicle title (year make model)", () => {
    render(<VehicleInfoCard vehicle={mockVehicle} />);
    expect(screen.getByText("2024 Toyota Camry")).toBeInTheDocument();
  });

  it("renders VIN", () => {
    render(<VehicleInfoCard vehicle={mockVehicle} />);
    expect(screen.getByText(/TEST-VIN-12345678/)).toBeInTheDocument();
  });

  it("renders all 7 info field labels", () => {
    render(<VehicleInfoCard vehicle={mockVehicle} />);
    const labels = ["Make", "Model", "Year", "Price", "Status", "Stocked", "Days in Stock"];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("shows 'Aging' badge when vehicle.is_aging is true", () => {
    render(<VehicleInfoCard vehicle={mockVehicle} />);
    expect(screen.getByText("Aging")).toBeInTheDocument();
  });

  it("hides 'Aging' badge when vehicle.is_aging is false", () => {
    render(<VehicleInfoCard vehicle={mockVehicleNonAging} />);
    expect(screen.queryByText("Aging")).not.toBeInTheDocument();
  });

  it("shows '-' when price is null/undefined", () => {
    const vehicleNoPrice = { ...mockVehicle, price: undefined };
    render(<VehicleInfoCard vehicle={vehicleNoPrice} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("formats price with $ sign", () => {
    render(<VehicleInfoCard vehicle={mockVehicle} />);
    expect(screen.getByText("$30,000")).toBeInTheDocument();
  });
});
