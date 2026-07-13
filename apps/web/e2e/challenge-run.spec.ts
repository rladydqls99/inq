import { expect, test } from "@playwright/test";

test("challenge runner reveals inline answers when self-scoring", async ({ page }) => {
  const runState = {
    sessionId: "session-1",
    challengeId: "challenge-1",
    status: "active",
    cursor: 0,
    cards: [
      {
        sessionCardId: "session-card-1",
        stateId: "state-1",
        cardId: "card-1",
        queueIndex: 0,
        selectedResult: null,
        segments: [
          { type: "text", value: "훈민정음을 만든 " },
          { type: "answer", id: "answer-1", value: "세종대왕" },
          { type: "text", value: "이다." },
        ],
      },
    ],
  };

  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinConfigured: true, unlocked: true }),
    });
  });
  await page.route("**/api/challenges/challenge-1/run", async (route, request) => {
    if (request.method() === "PATCH") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...runState, cursor: 1 }),
      });
      return;
    }

    await route.fulfill({ contentType: "application/json", body: JSON.stringify(runState) });
  });
  await page.route("**/api/challenges/challenge-1/results", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        runState: {
          ...runState,
          cards: [{ ...runState.cards[0], selectedResult: "correct" }],
        },
        progress: {
          totalCards: 1,
          completedCards: 0,
          dueCards: 0,
          currentStageCounts: { 1: 1 },
        },
      }),
    });
  });

  await page.goto("/challenges/challenge-1/run");

  await expect(page.getByText("훈민정음을 만든 ____이다.")).toBeVisible();
  await expect(page.getByText("1 / 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 카드" })).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await page.getByRole("button", { name: "맞았어요" }).click();
  await expect(page.getByText("훈민정음을 만든 세종대왕이다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "맞았어요" })).toHaveCSS(
    "background-color",
    "rgb(46, 111, 62)",
  );
  await expect(page.getByText("5초")).toBeVisible();
  await expect(page.getByText("4초")).toBeVisible({ timeout: 2000 });
  await page.getByRole("button", { name: /다음 문제/ }).click();
  await expect(page.getByText("완료되었습니다.")).toBeVisible();
});
