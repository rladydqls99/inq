import { expect, test } from "@playwright/test";

test("deck runner reveals answers and persists next cursor", async ({ page }) => {
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
  await page.route("**/api/decks/deck-1/run", async (route, request) => {
    const isPatch = request.method() === "PATCH";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(deckRun(isPatch ? 1 : 0)),
    });
  });

  await page.goto("/decks/deck-1/run");

  await expect(page.getByText("훈민정음을 만든 ____이다.")).toBeVisible();
  await page.getByRole("button", { name: "정답 보기" }).click();
  await expect(page.getByText("훈민정음을 만든 세종대왕이다.")).toBeVisible();

  await page.getByRole("button", { name: "다음 카드" }).click();
  await expect(page.getByText("수도는 ____이다.")).toBeVisible();
});

function deckRun(cursor: number) {
  return {
    deckId: "deck-1",
    cursor,
    completedAt: null,
    cards: [
      {
        cardId: "card-1",
        segments: [
          { type: "text", value: "훈민정음을 만든 " },
          { type: "answer", id: "answer-1", value: "세종대왕" },
          { type: "text", value: "이다." },
        ],
      },
      {
        cardId: "card-2",
        segments: [
          { type: "text", value: "수도는 " },
          { type: "answer", id: "answer-1", value: "서울" },
          { type: "text", value: "이다." },
        ],
      },
    ],
  };
}
