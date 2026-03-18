import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AddVehicleModal } from "@/components/add-vehicle-modal";

const mockMutate = vi.fn();
const mockReset = vi.fn();
const mockMutation = {
  mutate: mockMutate,
  isPending: false,
  error: null as Error | null,
  reset: mockReset,
};

vi.mock("@/hooks/use-create-vehicle", () => ({
  useCreateVehicle: () => mockMutation,
}));

vi.mock("@/hooks/use-dealerships", () => ({
  useDealerships: () => ({
    data: [
      { id: "dealer-001", name: "AutoGroup North" },
      { id: "dealer-002", name: "Central Motors" },
    ],
  }),
}));

// Mock the shadcn dialog wrapper so content renders directly in jsdom (no portal)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; onOpenChange?: unknown; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("AddVehicleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation.isPending = false;
    mockMutation.error = null;
    mockMutation.mutate = mockMutate;
    mockMutation.reset = mockReset;
  });

  it("renders modal content when open=true", () => {
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Add New Vehicle")).toBeInTheDocument();
  });

  it("does not render modal content when open=false", () => {
    render(<AddVehicleModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Add New Vehicle")).not.toBeInTheDocument();
  });

  it("renders all required form field labels", () => {
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Dealership *")).toBeInTheDocument();
    expect(screen.getByText("Make *")).toBeInTheDocument();
    expect(screen.getByText("Model *")).toBeInTheDocument();
    expect(screen.getByText("Year *")).toBeInTheDocument();
    expect(screen.getByText("VIN *")).toBeInTheDocument();
    expect(screen.getByText("Status *")).toBeInTheDocument();
  });

  it("shows validation errors when submitting with empty required fields", async () => {
    const user = userEvent.setup();
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Add Vehicle/i }));

    expect(screen.getByText("Dealership is required")).toBeInTheDocument();
    expect(screen.getByText("Make is required")).toBeInTheDocument();
    expect(screen.getByText("Model is required")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows VIN validation error for invalid VIN", async () => {
    const user = userEvent.setup();
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    const vinInput = screen.getByPlaceholderText("17-character VIN");
    await user.type(vinInput, "INVALIDVIN");

    await user.click(screen.getByRole("button", { name: /Add Vehicle/i }));
    expect(screen.getByText("VIN must be 17 valid characters")).toBeInTheDocument();
  });

  it("auto-uppercases VIN input", async () => {
    const user = userEvent.setup();
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    const vinInput = screen.getByPlaceholderText("17-character VIN");
    await user.type(vinInput, "1hgbh41jxmn109186");

    expect((vinInput as HTMLInputElement).value).toBe("1HGBH41JXMN109186");
  });

  it("does not call mutate when dealership is not selected", async () => {
    const user = userEvent.setup();
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Make *"), "Honda");
    await user.type(screen.getByLabelText("Model *"), "Civic");
    await user.type(screen.getByPlaceholderText("17-character VIN"), "1HGBH41JXMN109186");

    await user.click(screen.getByRole("button", { name: /Add Vehicle/i }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Dealership is required")).toBeInTheDocument();
  });

  it("disables submit button and shows spinner when isPending=true", () => {
    mockMutation.isPending = true;
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: /Adding.../i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("Adding...")).toBeInTheDocument();
  });

  it("shows server error message when error is set", () => {
    mockMutation.error = new Error("VIN already exists");
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("VIN already exists")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddVehicleModal open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Cancel and submit buttons when isPending=true", () => {
    mockMutation.isPending = true;
    render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Adding.../i })).toBeDisabled();
  });
});
