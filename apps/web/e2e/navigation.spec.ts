import { expect, test } from "@playwright/test";

test("mobile bottom tabs route between main screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
  await page.route("**/api/challenges", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.route("**/api/decks", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.getByRole("link", { name: /Challenges/ }).click();
  await expect(page.getByRole("heading", { name: "Challenges" })).toBeVisible();

  await page.getByRole("link", { name: /Decks/ }).click();
  await expect(page.getByRole("heading", { name: "Decks" })).toBeVisible();

  await page.getByRole("link", { name: /Settings/ }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
