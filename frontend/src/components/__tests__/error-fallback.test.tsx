import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ErrorFallback } from "@/components/error-fallback";

const mockReset = vi.fn();

describe("ErrorFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockReset.mockClear();
  });

  it("renders error title and description", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error occurred/i)
    ).toBeInTheDocument();
  });

  it("does NOT display error.message to user", () => {
    render(<ErrorFallback error={new Error("secret internal detail")} reset={mockReset} />);
    expect(screen.queryByText("secret internal detail")).not.toBeInTheDocument();
  });

  it("logs error to console.error", () => {
    const err = new Error("test error");
    render(<ErrorFallback error={err} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Error boundary caught:", err);
  });

  it("calls reset when Try Again is clicked", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders Go to Dashboard link", () => {
    render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders AlertTriangle icon", () => {
    const { container } = render(<ErrorFallback error={new Error("test")} reset={mockReset} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
