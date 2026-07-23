import { expect, test } from "@playwright/test";

test("desktop upload previews and confirms valid markdown", async ({
  page,
}) => {
  await mockUnlocked(page);
  await page.route("**/api/decks", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ id: "deck-1", title: "국어", cardCount: 0 }]),
    });
  });
  await page.route("**/api/import/markdown/preview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        parsed: 1,
        errors: [],
        previewCards: [
          {
            blockIndex: 0,
            segments: [
              { type: "text", value: "훈민정음을 만든 " },
              { type: "answer", id: "answer-1", value: "세종대왕" },
              { type: "text", value: "이다." },
            ],
          },
        ],
      }),
    });
  });
  await page.route("**/api/import/markdown/confirm", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ createdCount: 1 }),
    });
  });

  await page.goto("/upload");
  await page
    .getByLabel("마크다운 내용")
    .fill("훈민정음을 만든 [세종대왕]이다.");
  await page.getByRole("button", { name: "검증하기" }).click();

  await expect(page.getByText("1장 검증 완료")).toBeVisible();
  await expect(page.getByText("훈민정음을 만든 세종대왕이다.")).toBeVisible();
  await page.getByRole("button", { name: "카드 만들기" }).click();
  await expect(page.getByText("1장의 카드를 만들었습니다.")).toBeVisible();
  await expect(page.getByLabel("마크다운 내용")).toHaveValue("");
});

test("desktop upload shows validation errors", async ({ page }) => {
  await mockUnlocked(page);
  await page.route("**/api/decks", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ id: "deck-1", title: "국어", cardCount: 0 }]),
    });
  });
  await page.route("**/api/import/markdown/preview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        parsed: 0,
        errors: [
          {
            blockIndex: 0,
            line: 1,
            column: null,
            code: "missing_answer",
            message: "Quiz card must contain at least one answer segment.",
            snippet: "정답 괄호가 없다.",
          },
        ],
        previewCards: [],
      }),
    });
  });

  await page.goto("/upload");
  await page.getByLabel("마크다운 내용").fill("정답 괄호가 없다.");
  await page.getByRole("button", { name: "검증하기" }).click();

  await expect(page.getByText("missing_answer")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "카드 만들기" }),
  ).toBeDisabled();
});

async function mockUnlocked(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
}
