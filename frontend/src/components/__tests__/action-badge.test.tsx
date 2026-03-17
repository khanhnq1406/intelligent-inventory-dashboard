import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActionBadge } from "@/components/action-badge";

describe("ActionBadge", () => {
  it("renders 'Price Reduction' for price_reduction", () => {
    render(<ActionBadge actionType="price_reduction" />);
    expect(screen.getByText("Price Reduction")).toBeInTheDocument();
  });

  it("renders 'Marketing Campaign' for marketing", () => {
    render(<ActionBadge actionType="marketing" />);
    expect(screen.getByText("Marketing Campaign")).toBeInTheDocument();
  });

  it("renders 'Transfer' for transfer", () => {
    render(<ActionBadge actionType="transfer" />);
    expect(screen.getByText("Transfer")).toBeInTheDocument();
  });

  it("renders 'Auction' for auction", () => {
    render(<ActionBadge actionType="auction" />);
    expect(screen.getByText("Auction")).toBeInTheDocument();
  });

  it("renders 'Wholesale' for wholesale", () => {
    render(<ActionBadge actionType="wholesale" />);
    expect(screen.getByText("Wholesale")).toBeInTheDocument();
  });

  it("renders 'Custom' for custom", () => {
    render(<ActionBadge actionType="custom" />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("falls back to raw action type text for unknown type", () => {
    render(<ActionBadge actionType="unknown_action" />);
    expect(screen.getByText("unknown_action")).toBeInTheDocument();
  });
});
