import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as navigation from "next/navigation";
import { Sidebar } from "@/components/sidebar";

// usePathname is mocked globally in setup.tsx to return "/"

describe("Sidebar", () => {
  it("renders logo link to /", () => {
    render(<Sidebar />);
    const logoLink = screen.getByText("IV").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders 3 nav items", () => {
    render(<Sidebar />);
    const navLinks = screen.getAllByRole("link");
    // logo + 3 nav items = 4 links
    expect(navLinks).toHaveLength(4);
  });

  it("renders Dashboard, Inventory, Aging Stock nav links", () => {
    render(<Sidebar />);
    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByTitle("Inventory")).toBeInTheDocument();
    expect(screen.getByTitle("Aging Stock")).toBeInTheDocument();
  });

  it("gives Dashboard active styling when pathname is /", () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByTitle("Dashboard");
    expect(dashboardLink).toHaveClass("bg-zinc-800");
  });

  it("gives non-active styling to Inventory when pathname is /", () => {
    render(<Sidebar />);
    const inventoryLink = screen.getByTitle("Inventory");
    expect(inventoryLink).not.toHaveClass("bg-zinc-800");
    expect(inventoryLink).toHaveClass("text-zinc-400");
  });

  it("gives active styling to Inventory when pathname is /inventory", () => {
    vi.spyOn(navigation, "usePathname").mockReturnValue("/inventory");

    render(<Sidebar />);
    const inventoryLink = screen.getByTitle("Inventory");
    expect(inventoryLink).toHaveClass("bg-zinc-800");
  });
});
