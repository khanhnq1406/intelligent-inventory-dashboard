import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsCard } from "@/components/stats-card";


describe("StatsCard", () => {
  it("renders title and value", () => {
    render(<StatsCard title="Total Vehicles" value={150} />);
    expect(screen.getByText("Total Vehicles")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("shows up arrow and green text when change.positive is true", () => {
    render(<StatsCard title="Stock" value={100} change={{ value: "10%", positive: true }} />);
    const changeText = screen.getByText(/10%/);
    expect(changeText).toHaveClass("text-green-600");
    expect(changeText.textContent).toContain("↑");
  });

  it("shows down arrow and red text when change.positive is false", () => {
    render(<StatsCard title="Stock" value={100} change={{ value: "5%", positive: false }} />);
    const changeText = screen.getByText(/5%/);
    expect(changeText).toHaveClass("text-red-600");
    expect(changeText.textContent).toContain("↓");
  });

  it("renders with optional description", () => {
    render(<StatsCard title="Stock" value={100} description="As of today" />);
    expect(screen.getByText("As of today")).toBeInTheDocument();
  });

  it("renders without optional props", () => {
    render(<StatsCard title="Stock" value={100} />);
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // No change, no description — just these two present
    expect(screen.queryByText("↑")).not.toBeInTheDocument();
    expect(screen.queryByText("↓")).not.toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<StatsCard title="Avg Days" value="45.3" />);
    expect(screen.getByText("45.3")).toBeInTheDocument();
  });
});

describe("StatsCard accessibility", () => {
  it("has role=status and dynamic aria-label", () => {
    render(<StatsCard title="Total Vehicles" value={150} />);
    const card = screen.getByRole("status");
    expect(card).toHaveAttribute("aria-label", "Total Vehicles: 150");
  });
});
