import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "@/components/pagination";

describe("Pagination", () => {
  it("renders page info text", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("renders page number buttons for small page counts", () => {
    render(<Pagination page={1} totalPages={4} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /page 1, current/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^page 2$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^page 3$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^page 4$/i })).toBeInTheDocument();
  });

  it("disables previous button when on page 1", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    // ChevronLeft button is the first button
    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it("disables next button when on last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it("calls onPageChange with correct page number when clicking a page button", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange(page-1) when clicking previous", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange(page+1) when clicking next", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("shows ellipsis for large page counts", () => {
    render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />);
    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThan(0);
  });
});

describe("Pagination accessibility", () => {
  it("wraps pagination in nav with aria-label", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toBeInTheDocument();
  });

  it("has previous and next buttons with descriptive aria-labels", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("marks current page button with aria-current", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    const currentBtn = screen.getByRole("button", { name: /page 2, current/i });
    expect(currentBtn).toHaveAttribute("aria-current", "page");
  });
});
