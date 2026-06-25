import { expect, test } from "@playwright/test";

test("direct desktop upload URL is protected by the PIN gate", async ({ page }) => {
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: false }),
    });
  });

  await page.goto("/upload");

  await expect(page.getByRole("heading", { name: "Unlock" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload" })).toHaveCount(0);
});
