import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("page loads with stats cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Total Vehicles")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Aging Stock")).toBeVisible();
    await expect(page.getByText("Avg. Days in Stock")).toBeVisible();
  });

  test("recent actions section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recent Actions" })).toBeVisible();
  });

  test("navigate to inventory via sidebar", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[title="Inventory"]').click();
    await expect(page).toHaveURL("/inventory");
    await expect(page.getByText("Vehicle Inventory")).toBeVisible();
  });
});
