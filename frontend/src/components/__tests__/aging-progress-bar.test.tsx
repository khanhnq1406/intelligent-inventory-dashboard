import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AgingProgressBar } from "@/components/aging-progress-bar";

describe("AgingProgressBar", () => {
  it("shows correct day count text", () => {
    render(<AgingProgressBar days={90} />);
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

  it("shows orange color for 90 days (<=120)", () => {
    const { container } = render(<AgingProgressBar days={90} />);
    const bar = container.querySelector(".bg-orange-400");
    expect(bar).toBeInTheDocument();
    expect(screen.getByText("90 days")).toHaveClass("text-orange-500");
  });

  it("shows red color for 150 days (>120)", () => {
    const { container } = render(<AgingProgressBar days={150} />);
    const bar = container.querySelector(".bg-red-500");
    expect(bar).toBeInTheDocument();
    expect(screen.getByText("150 days")).toHaveClass("text-red-600");
  });

  it("caps width at 100% for days over 180", () => {
    const { container } = render(<AgingProgressBar days={200} />);
    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("shows 120 days as orange (boundary)", () => {
    const { container } = render(<AgingProgressBar days={120} />);
    const bar = container.querySelector(".bg-orange-400");
    expect(bar).toBeInTheDocument();
  });

  it("shows 121 days as red (just over boundary)", () => {
    const { container } = render(<AgingProgressBar days={121} />);
    const bar = container.querySelector(".bg-red-500");
    expect(bar).toBeInTheDocument();
  });
});
