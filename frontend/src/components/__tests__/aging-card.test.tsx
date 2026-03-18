import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgingCard } from "@/components/aging-card";

const mockVehicle = {
  id: "v1",
  make: "Honda",
  model: "Civic",
  year: 2021,
  vin: "2HGBH41JXMN109187",
  status: "available" as const,
  price: 22000,
  days_in_stock: 120,
  is_aging: true,
  actions: [],
};

describe("AgingCard", () => {
  it("renders vehicle info", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText("2021 Honda Civic")).toBeTruthy();
  });

  it("renders VIN", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText("2HGBH41JXMN109187")).toBeTruthy();
  });

  it("renders days in stock", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText(/120/)).toBeTruthy();
  });

  it("renders Log Action button", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByRole("button", { name: /log action/i })).toBeTruthy();
  });

  it("calls onLogAction when button clicked", () => {
    const onLogAction = vi.fn();
    render(<AgingCard vehicle={mockVehicle} onLogAction={onLogAction} />);
    fireEvent.click(screen.getByRole("button", { name: /log action/i }));
    expect(onLogAction).toHaveBeenCalledWith("v1");
  });
});
