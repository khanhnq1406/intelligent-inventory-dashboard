import { test, expect } from "@playwright/test";

test.describe("Aging Stock", () => {
  test("page loads with title", async ({ page }) => {
    await page.goto("/aging");
    await expect(page.getByText("Aging Stock")).toBeVisible();
  });

  test("alert banner shows vehicle count when vehicles exist", async ({ page }) => {
    await page.goto("/aging");
    // The page may show empty state or vehicles depending on data
    const hasVehicles = await page.locator("table tbody tr").count() > 0;
    if (hasVehicles) {
      await expect(page.getByText(/vehicles/i)).toBeVisible();
      await expect(page.getByText("require attention")).toBeVisible();
    } else {
      await expect(page.getByText("No aging vehicles — great job!")).toBeVisible();
    }
  });

  test("stats cards are visible", async ({ page }) => {
    await page.goto("/aging");
    await expect(page.getByText("Total Aging Vehicles")).toBeVisible();
    await expect(page.getByText("Avg. Days in Stock")).toBeVisible();
    await expect(page.getByText("Actions Taken")).toBeVisible();
  });
});
