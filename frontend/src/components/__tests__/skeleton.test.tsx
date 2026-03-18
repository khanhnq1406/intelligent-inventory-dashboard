import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  StatsCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  VehicleInfoSkeleton,
} from "@/components/ui/skeleton";

describe("Skeleton primitives", () => {
  it("Skeleton renders with animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("Skeleton accepts custom className", () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    expect(container.firstChild).toHaveClass("h-8", "w-32");
  });

  it("StatsCardSkeleton renders 4 skeleton cards", () => {
    const { container } = render(<StatsCardSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("TableSkeleton renders skeleton rows", () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("ChartSkeleton renders a skeleton container", () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("VehicleInfoSkeleton renders skeleton for vehicle detail", () => {
    const { container } = render(<VehicleInfoSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
