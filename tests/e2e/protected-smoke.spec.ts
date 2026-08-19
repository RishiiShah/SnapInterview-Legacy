import { expect, test } from "@playwright/test";

const supportsProtectedFlows = process.env.E2E_PROTECTED_FLOWS === "1";
const requestOrigin = "http://127.0.0.1:3000";

test.describe("Protected smoke flows", () => {
  test.skip(!supportsProtectedFlows, "Protected E2E smoke tests require E2E_PROTECTED_FLOWS=1 with a real database-backed test environment.");

  test.beforeEach(async ({ page }, testInfo) => {
    const suffix = `${testInfo.workerIndex}-${testInfo.retry}-${testInfo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

    await page.goto(requestOrigin);

    const ok = await page.evaluate(async ({ reqOrigin, suffix }) => {
      const res = await fetch("/api/test-auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: reqOrigin,
        },
        body: JSON.stringify({
          userId: `e2e-${suffix}`,
          email: `e2e+${suffix}@example.com`,
          name: "E2E User",
          onboardingCompleted: true,
        }),
        credentials: "include",
      });
      return res.ok;
    }, { reqOrigin: requestOrigin, suffix });

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

    await expect(page.getByRole("heading", { name: /set up your interview|practice/i, level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/software engineer|search or type/i)).toBeVisible();
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
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /settings/i, level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/personal information/i)).toBeVisible();
  });
});
