import { test, expect } from "@playwright/test";

test.describe("Vehicle Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to first vehicle from inventory
    await page.goto("/inventory");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().click();
    await expect(page).toHaveURL(/\/vehicles\/.+/);
  });

  test("info card shows vehicle data", async ({ page }) => {
    await expect(page.getByText("VIN:")).toBeVisible();
    await expect(page.getByText("Make")).toBeVisible();
    await expect(page.getByText("Model")).toBeVisible();
  });

  test("action timeline shows history", async ({ page }) => {
    await expect(page.getByText("Action History")).toBeVisible();
  });

  test("action form is visible", async ({ page }) => {
    await expect(page.getByText("Log New Action")).toBeVisible();
    await expect(page.getByText("Action Type")).toBeVisible();
    await expect(page.getByText("Your Name")).toBeVisible();
  });

  test("submit action form and see result", async ({ page }) => {
    await page.locator("select").first().selectOption("price_reduction");
    await page.getByPlaceholder("Enter your name").fill("E2E Test User");
    await page.getByPlaceholder("Add any notes about this action...").fill("E2E test action");
    await page.getByRole("button", { name: /Log Action/i }).click();
    // Wait for success or new action to appear
    await expect(page.getByText(/successfully|Price Reduction/i)).toBeVisible({ timeout: 10000 });
  });
});
