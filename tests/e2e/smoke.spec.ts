import { expect, test } from "@playwright/test";

test("public site and pricing are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BUYBIZ/i);
  await expect(page.getByRole("link", { name: /Marketplace/i }).first()).toBeVisible();
  await page.goto("/pricing");
  await expect(page.getByText("24-Hour Proxy").first()).toBeVisible();
  await page.goto("/coming-soon");
  await expect(page.getByText(/Virtual phone numbers/i).first()).toBeVisible();
});

test("demo customer can sign in with a local account", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@buybiz.test");
  await page.fill('input[name="password"]', "Demo1234!");
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText(/Wallet balance/i).first()).toBeVisible();
});

test("demo admin console opens and lists users", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@buybiz.test");
  await page.fill('input[name="password"]', "Admin1234!");
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByText("admin@buybiz.test").first()).toBeVisible();
});
