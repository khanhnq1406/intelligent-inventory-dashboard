import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VehicleFilters } from "@/components/vehicle-filters";

const defaultFilters = {
  search: "",
  make: "",
  model: "",
  status: "",
  aging: false,
};

describe("VehicleFilters", () => {
  it("renders search input with placeholder", () => {
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search by VIN, make, model...")).toBeInTheDocument();
  });

  it("renders make dropdown with options", () => {
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={vi.fn()} />);
    expect(screen.getByText("All Makes")).toBeInTheDocument();
    expect(screen.getByText("Toyota")).toBeInTheDocument();
  });

  it("renders status dropdown with options", () => {
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={vi.fn()} />);
    expect(screen.getByText("All Statuses")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
  });

  it("renders Aging Only toggle button", () => {
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={vi.fn()} />);
    expect(screen.getByText("Aging Only")).toBeInTheDocument();
  });

  it("make dropdown selection calls onFiltersChange with updated make", () => {
    const onFiltersChange = vi.fn();
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Toyota" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, make: "Toyota" });
  });

  it("status dropdown selection calls onFiltersChange with updated status", () => {
    const onFiltersChange = vi.fn();
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "available" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, status: "available" });
  });

  it("aging toggle calls onFiltersChange with toggled aging value", () => {
    const onFiltersChange = vi.fn();
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);

    fireEvent.click(screen.getByText("Aging Only"));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, aging: true });
  });

  it("debounces search input — waits 300ms before calling onFiltersChange", async () => {
    vi.useFakeTimers();
    const onFiltersChange = vi.fn();
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);

    const input = screen.getByPlaceholderText("Search by VIN, make, model...");
    fireEvent.change(input, { target: { value: "Toyota" } });

    // Not called yet
    expect(onFiltersChange).not.toHaveBeenCalled();

    // Advance timer by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, search: "Toyota" });
    vi.useRealTimers();
  });

  it("shows total count when totalCount is provided", () => {
    render(<VehicleFilters filters={defaultFilters} onFiltersChange={vi.fn()} totalCount={42} />);
    expect(screen.getByText("Showing 42 vehicles")).toBeInTheDocument();
  });
});
