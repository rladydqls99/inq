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
  await expect(
    page.getByRole("navigation", { name: "주요 메뉴" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "챌린지", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "챌린지", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "덱", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "덱", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "설정", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "설정", exact: true }),
  ).toBeVisible();
});
