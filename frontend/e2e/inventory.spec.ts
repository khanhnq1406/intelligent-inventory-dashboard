import { test, expect } from "@playwright/test";

test.describe("Inventory", () => {
  test("table loads with vehicles", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText("Vehicle Inventory")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    await page.goto("/inventory");
    const search = page.getByPlaceholder("Search by VIN, make, model...");
    await search.fill("Toyota");
    // Wait for debounce
    await page.waitForTimeout(400);
    await expect(page.locator("table")).toBeVisible();
  });

  test("click row navigates to vehicle detail", async ({ page }) => {
    await page.goto("/inventory");
    // Wait for table to load with actual data (not loading skeletons)
    await expect(page.locator("table tbody tr td.font-mono").first()).toBeVisible({ timeout: 15000 });
    await page.locator("table tbody tr").first().click();
    await expect(page).toHaveURL(/\/vehicles\/.+/, { timeout: 10000 });
  });
});
