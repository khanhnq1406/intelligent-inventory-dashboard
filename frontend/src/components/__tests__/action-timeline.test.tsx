import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActionTimeline } from "@/components/action-timeline";
import { mockAction } from "@/test/mocks";
import type { components } from "@/lib/api/types";

type VehicleAction = components["schemas"]["VehicleAction"];

describe("ActionTimeline", () => {
  it("renders action list items", () => {
    render(<ActionTimeline actions={[mockAction]} />);
    expect(screen.getByText("Price Reduction")).toBeInTheDocument();
  });

  it("shows empty state 'No actions recorded yet.'", () => {
    render(<ActionTimeline actions={[]} />);
    expect(screen.getByText("No actions recorded yet.")).toBeInTheDocument();
  });

  it("first (latest) action has blue dot", () => {
    const { container } = render(<ActionTimeline actions={[mockAction]} />);
    const blueDot = container.querySelector(".bg-blue-600");
    expect(blueDot).toBeInTheDocument();
  });

  it("subsequent actions have zinc/gray dots", () => {
    const secondAction: VehicleAction = {
      ...mockAction,
      id: "action-002",
      action_type: "marketing",
      notes: "Campaign",
    };
    const { container } = render(<ActionTimeline actions={[mockAction, secondAction]} />);
    const grayDots = container.querySelectorAll(".bg-zinc-300");
    expect(grayDots.length).toBeGreaterThan(0);
  });

  it("renders action notes when present", () => {
    render(<ActionTimeline actions={[mockAction]} />);
    expect(screen.getByText("Reduced by $500")).toBeInTheDocument();
  });

  it("renders 'By: {created_by}' for each action", () => {
    render(<ActionTimeline actions={[mockAction]} />);
    expect(screen.getByText("By: Test User")).toBeInTheDocument();
  });

  it("does not render notes paragraph when notes is absent", () => {
    const actionNoNotes: VehicleAction = {
      ...mockAction,
      notes: undefined,
    };
    render(<ActionTimeline actions={[actionNoNotes]} />);
    expect(screen.queryByText("Reduced by $500")).not.toBeInTheDocument();
  });
});
