import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("renders 'Available' with blue styling for available", () => {
    render(<StatusBadge status="available" />);
    const badge = screen.getByText("Available");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-blue-600");
    expect(badge).toHaveClass("bg-blue-50");
  });

  it("renders 'Sold' with red styling for sold", () => {
    render(<StatusBadge status="sold" />);
    const badge = screen.getByText("Sold");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-red-600");
    expect(badge).toHaveClass("bg-red-50");
  });

  it("renders 'Reserved' with amber styling for reserved", () => {
    render(<StatusBadge status="reserved" />);
    const badge = screen.getByText("Reserved");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-amber-600");
    expect(badge).toHaveClass("bg-amber-50");
  });

  it("falls back to raw status text for unknown status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });
});
