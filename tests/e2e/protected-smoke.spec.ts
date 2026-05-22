import { expect, test } from "@playwright/test";

const supportsProtectedFlows = process.env.E2E_PROTECTED_FLOWS === "1";
const requestOrigin = "http://127.0.0.1:3000";

test.describe("Protected smoke flows", () => {
  test.skip(!supportsProtectedFlows, "Protected E2E smoke tests require E2E_PROTECTED_FLOWS=1 with a real database-backed test environment.");

  test.beforeEach(async ({ page }) => {
    await page.goto(requestOrigin);

    const ok = await page.evaluate(async (reqOrigin) => {
      const res = await fetch("/api/test-auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: reqOrigin,
        },
        body: JSON.stringify({
          email: "e2e@example.com",
          name: "E2E User",
          onboardingCompleted: true,
        }),
        credentials: "include",
      });
      return res.ok;
    }, requestOrigin);

    expect(ok).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    await page.goto(requestOrigin);

    await page.evaluate(async (reqOrigin) => {
      await fetch("/api/test-auth/session", {
        method: "DELETE",
        headers: { origin: reqOrigin },
        credentials: "include",
      });
    }, requestOrigin);
  });

  test("practice page loads for an authenticated test user", async ({ page }) => {
    await page.goto("/practice");

    await expect(page.getByRole("heading", { name: /practice interview/i, level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/search or type your target role/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue|start interview/i })).toBeVisible();
  });

  test("questions page loads the bank for an authenticated test user", async ({ page }) => {
    await page.goto("/questions");

    await expect(page.getByRole("heading", { name: /question bank/i, level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/search questions/i)).toBeVisible();
  });

  test("dashboard page loads the welcome heading", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /welcome/i, level: 1 })).toBeVisible();
  });

  test("recordings page loads the recordings heading", async ({ page }) => {
    await page.goto("/recordings");

    await expect(page.getByRole("heading", { name: /recordings/i, level: 1 })).toBeVisible();
  });

  test("analytics page loads the analytics heading", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.getByRole("heading", { name: /analytics/i, level: 1 })).toBeVisible();
  });

  test("settings page loads profile settings", async ({ page }) => {
    await page.goto("/dashboard");

    // Open account drop-up and click Settings (target the button with the user's name)
    await page.locator('aside button').last().click();
    await page.locator('a:has-text("Settings")').first().click();
    await page.waitForURL('**/settings', { timeout: 10000 });

    // Confirm the page actually rendered (not just a blank route).
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible({ timeout: 10_000 });
  });
});
