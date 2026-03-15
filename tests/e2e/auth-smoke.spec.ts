import { expect, test } from "@playwright/test";

test.describe("Public auth smoke flows", () => {
  test("login page renders primary auth controls", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("signup page renders account creation controls", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/^full name$/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("forgot-password page supports requesting a reset code", async ({ page }) => {
    await page.route("**/api/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "If an account with that email exists, a reset code has been sent.",
        }),
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel(/^email$/i).fill("user@example.com");
    await page.getByRole("button", { name: /send reset code/i }).click();

    await expect(page.locator("h1", { hasText: /reset your password/i })).toBeVisible();
    await expect(page.getByText(/enter the 6-digit code sent to/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /reset password/i })).toBeVisible();
  });
});
