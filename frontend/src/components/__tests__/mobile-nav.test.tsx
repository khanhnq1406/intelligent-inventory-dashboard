import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNav } from "@/components/mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

describe("MobileNav", () => {
  it("renders hamburger button by default", () => {
    render(<MobileNav />);
    expect(screen.getByRole("button", { name: /open menu/i })).toBeTruthy();
  });

  it("opens overlay when hamburger is clicked", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("closes overlay when X button is clicked", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows nav items when open", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Inventory")).toBeTruthy();
    expect(screen.getByText("Aging Stock")).toBeTruthy();
  });
});
