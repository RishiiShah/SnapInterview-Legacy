import { expect, test } from "@playwright/test";

const supportsProtectedFlows = process.env.E2E_PROTECTED_FLOWS === "1";

test.describe("Protected smoke flows", () => {
  test.skip(!supportsProtectedFlows, "Protected E2E smoke tests require E2E_PROTECTED_FLOWS=1 with a real database-backed test environment.");

  test.beforeEach(async ({ page }) => {
    const response = await page.request.post("/api/test-auth/session", {
      data: {
        email: "e2e@example.com",
        name: "E2E User",
        onboardingCompleted: true,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/test-auth/session");
  });

  test("practice page loads for an authenticated test user", async ({ page }) => {
    await page.goto("/practice");

    await expect(page.getByRole("heading", { name: /practice interview/i })).toBeVisible();
    await expect(page.getByLabel(/role \/ position/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /start interview/i })).toBeVisible();
  });

  test("questions page loads the bank for an authenticated test user", async ({ page }) => {
    await page.goto("/questions");

    await expect(page.getByRole("heading", { name: /question bank/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search questions/i)).toBeVisible();
  });
});
