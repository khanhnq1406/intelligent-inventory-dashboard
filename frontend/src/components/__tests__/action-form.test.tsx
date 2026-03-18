import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionForm } from "@/components/action-form";

const mockMutate = vi.fn();
const mockMutation = {
  mutate: mockMutate,
  isPending: false,
  isError: false,
  isSuccess: false,
};

vi.mock("@/hooks/use-create-vehicle-action", () => ({
  useCreateVehicleAction: () => mockMutation,
}));

describe("ActionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation.isPending = false;
    mockMutation.isError = false;
    mockMutation.isSuccess = false;
    mockMutation.mutate = mockMutate;
  });

  it("renders form fields: action type select, notes textarea, name input, submit button", () => {
    render(<ActionForm vehicleId="vehicle-001" />);
    expect(screen.getByText("Action Type")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add any notes about this action...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log Action/i })).toBeInTheDocument();
  });

  it("submit button is disabled when action type is empty", () => {
    render(<ActionForm vehicleId="vehicle-001" />);
    expect(screen.getByRole("button", { name: /Log Action/i })).toBeDisabled();
  });

  it("submit button is disabled when created_by is empty", async () => {
    const user = userEvent.setup();
    render(<ActionForm vehicleId="vehicle-001" />);

    // Select action type but no name
    await user.selectOptions(screen.getByRole("combobox"), "price_reduction");
    expect(screen.getByRole("button", { name: /Log Action/i })).toBeDisabled();
  });

  it("submit button is enabled when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<ActionForm vehicleId="vehicle-001" />);

    await user.selectOptions(screen.getByRole("combobox"), "price_reduction");
    await user.type(screen.getByPlaceholderText("Enter your name"), "Test User");
    expect(screen.getByRole("button", { name: /Log Action/i })).not.toBeDisabled();
  });

  it("submits with correct data when form is submitted", async () => {
    const user = userEvent.setup();
    render(<ActionForm vehicleId="vehicle-001" />);

    await user.selectOptions(screen.getByRole("combobox"), "price_reduction");
    await user.type(screen.getByPlaceholderText("Add any notes about this action..."), "Test notes");
    await user.type(screen.getByPlaceholderText("Enter your name"), "Test User");
    await user.click(screen.getByRole("button", { name: /Log Action/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        action_type: "price_reduction",
        notes: "Test notes",
        created_by: "Test User",
      },
      expect.any(Object)
    );
  });

  it("shows 'Submitting...' during pending state", () => {
    mockMutation.isPending = true;
    render(<ActionForm vehicleId="vehicle-001" />);
    expect(screen.getByText("Submitting...")).toBeInTheDocument();
  });

  it("shows error message on failure", () => {
    mockMutation.isError = true;
    render(<ActionForm vehicleId="vehicle-001" />);
    expect(screen.getByText("Failed to log action. Please try again.")).toBeInTheDocument();
  });

  it("shows success message on success", () => {
    mockMutation.isSuccess = true;
    render(<ActionForm vehicleId="vehicle-001" />);
    expect(screen.getByText("Action logged successfully!")).toBeInTheDocument();
  });
});
