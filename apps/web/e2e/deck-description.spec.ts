import { expect, test } from "@playwright/test";

test("deck description is collapsed by default and editable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  let description: string | null = "중간고사 시험 범위\n1단원부터 3단원";
  const deck = () => ({
    id: "deck-1",
    title: "국어",
    description,
    cardCount: 0,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
  });

  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
  await page.route("**/api/decks/deck-1", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as {
        description: string | null;
      };
      description = body.description;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(deck()),
    });
  });
  await page.route("**/api/decks/deck-1/cards", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/decks/deck-1/manage");

  const disclosure = page.locator("details");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await page.getByText("덱 설명", { exact: true }).click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(page.getByText("중간고사 시험 범위")).toBeVisible();

  await page.getByRole("button", { name: "설명 수정" }).click();
  await page.getByLabel(/덱 설명/).fill("기말고사 시험 범위");
  await page.getByRole("button", { name: "변경사항 저장" }).click();

  await expect(page.getByText("기말고사 시험 범위")).toBeVisible();
  await expect(disclosure).toHaveAttribute("open", "");

  if (process.env.DECK_DESCRIPTION_SCREENSHOT) {
    await page.screenshot({
      path: process.env.DECK_DESCRIPTION_SCREENSHOT,
      fullPage: true,
    });
  }
});

test("deck creation collects an optional description", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
  await page.route("**/api/decks", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        contentType: "application/json",
        status: 201,
        body: JSON.stringify({
          id: "deck-1",
          title: "영어",
          description: "토익 단어 복습",
          cardCount: 0,
          createdAt: "2026-08-24T00:00:00.000Z",
          updatedAt: "2026-08-24T00:00:00.000Z",
        }),
      });
      return;
    }

    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/decks");
  await page.getByRole("button", { name: "덱 등록하기" }).click();
  await page.getByLabel("덱 이름").fill("영어");
  await page.getByLabel(/덱 설명/).fill("토익 단어 복습");

  if (process.env.DECK_CREATE_SCREENSHOT) {
    await page.screenshot({
      path: process.env.DECK_CREATE_SCREENSHOT,
      fullPage: true,
    });
  }

  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/decks") && request.method() === "POST",
  );
  await page
    .getByRole("dialog", { name: "덱 만들기" })
    .getByRole("button", { name: "덱 만들기" })
    .click();

  await expect((await createRequest).postDataJSON()).toEqual({
    title: "영어",
    description: "토익 단어 복습",
  });
});
