import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { createPrismaClient, type PrismaClient } from "../src/client";
import {
  createCard,
  listCardsByDeck,
  updateCard,
} from "../src/repositories/cards";
import {
  createChallenge,
  updateChallengeFromDeck,
} from "../src/repositories/challenges";
import {
  createDeck,
  deleteDeck,
  listDecks,
  renameDeck,
} from "../src/repositories/decks";
import {
  getDeckRunState,
  restartDeckRun,
  updateDeckRunCursor,
} from "../src/repositories/runs";

const sampleSegments: QuizSegment[] = [
  { type: "text", value: "훈민정음을 만든 왕은 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];
const testDirname = dirname(fileURLToPath(import.meta.url));

let prisma: PrismaClient;

beforeEach(() => {
  const databaseUrl = createMigratedDatabaseUrl();
  prisma = createPrismaClient(databaseUrl);
});

afterEach(async () => {
  await prisma?.$disconnect();
});

describe("deck repositories", () => {
  it("creates, lists, renames, and deletes decks", async () => {
    const deck = await createDeck(prisma, { title: "국어" });

    await expect(listDecks(prisma)).resolves.toMatchObject([
      { id: deck.id, title: "국어", cardCount: 0 },
    ]);

    await renameDeck(prisma, deck.id, { title: "한국어" });
    await expect(listDecks(prisma)).resolves.toMatchObject([
      { id: deck.id, title: "한국어", cardCount: 0 },
    ]);

    await deleteDeck(prisma, deck.id);
    await expect(listDecks(prisma)).resolves.toEqual([]);
  });
});

describe("card repositories", () => {
  it("creates cards, lists by deck, and updates segments with version bump", async () => {
    const deck = await createDeck(prisma, { title: "국어" });
    const card = await createCard(prisma, {
      deckId: deck.id,
      segments: sampleSegments,
    });

    await expect(listCardsByDeck(prisma, deck.id)).resolves.toMatchObject([
      {
        id: card.id,
        deckId: deck.id,
        segments: sampleSegments,
        version: 1,
      },
    ]);

    const nextSegments: QuizSegment[] = [
      { type: "text", value: "수정된 " },
      { type: "answer", id: "answer-1", value: "정답" },
    ];
    const updated = await updateCard(prisma, card.id, {
      segments: nextSegments,
      version: 1,
    });

    expect(updated).toMatchObject({
      id: card.id,
      segments: nextSegments,
      version: 2,
    });
  });
});

describe("challenge repositories", () => {
  it("creates challenge card states for current deck cards", async () => {
    const deck = await createDeck(prisma, { title: "국어" });
    const firstCard = await createCard(prisma, {
      deckId: deck.id,
      segments: sampleSegments,
    });
    const secondCard = await createCard(prisma, {
      deckId: deck.id,
      segments: sampleSegments,
    });

    const challenge = await createChallenge(prisma, {
      name: "중간고사",
      deckId: deck.id,
      reviewIntervalsDays: [3, 5, 10],
    });

    const challengeCards = await prisma.challengeCard.findMany({
      where: { challengeId: challenge.id },
      include: { state: true },
      orderBy: { sourceDeckCardId: "asc" },
    });

    expect(
      challengeCards.map((card) => card.sourceDeckCardId).sort(),
    ).toEqual(
      [firstCard.id, secondCard.id].sort(),
    );
    expect(challengeCards.map((card) => card.segments)).toEqual([
      sampleSegments,
      sampleSegments,
    ]);
    expect(challengeCards.every((card) => card.state)).toBe(true);
    expect(challenge).toMatchObject({
      name: "중간고사",
      sourceDeckId: deck.id,
      sourceDeckTitle: "국어",
      status: "active",
      answerMode: "manual",
      reviewIntervalsDays: [3, 5, 10],
      maxStage: 3,
    });
  });

  it("adds new deck cards only after explicit challenge update", async () => {
    const deck = await createDeck(prisma, { title: "국어" });
    await createCard(prisma, { deckId: deck.id, segments: sampleSegments });
    const challenge = await createChallenge(prisma, {
      name: "기말고사",
      deckId: deck.id,
      reviewIntervalsDays: [3, 5, 10],
    });
    await createCard(prisma, { deckId: deck.id, segments: sampleSegments });

    await expect(
      prisma.challengeCardState.count({
        where: { challengeId: challenge.id },
      }),
    ).resolves.toBe(1);

    await expect(updateChallengeFromDeck(prisma, challenge.id)).resolves.toEqual(
      { addedCount: 1 },
    );
    await expect(
      prisma.challengeCardState.count({
        where: { challengeId: challenge.id },
      }),
    ).resolves.toBe(2);
  });

  it("keeps challenge snapshots when source cards and the deck change or are deleted", async () => {
    const deck = await createDeck(prisma, { title: "국어" });
    const sourceCard = await createCard(prisma, {
      deckId: deck.id,
      segments: sampleSegments,
    });
    const challenge = await createChallenge(prisma, {
      name: "독립 복습",
      deckId: deck.id,
      reviewIntervalsDays: [3, 5, 10],
    });
    const snapshot = await prisma.challengeCard.findFirstOrThrow({
      where: { challengeId: challenge.id },
    });

    await updateCard(prisma, sourceCard.id, {
      version: 1,
      segments: [
        { type: "text", value: "수정된 " },
        { type: "answer", id: "answer-1", value: "원본" },
      ],
    });
    await prisma.card.delete({ where: { id: sourceCard.id } });

    await expect(
      prisma.challengeCard.findUniqueOrThrow({ where: { id: snapshot.id } }),
    ).resolves.toMatchObject({
      sourceDeckCardId: null,
      segments: sampleSegments,
    });

    await deleteDeck(prisma, deck.id);

    await expect(
      prisma.challenge.findUniqueOrThrow({ where: { id: challenge.id } }),
    ).resolves.toMatchObject({
      sourceDeckId: null,
      sourceDeckTitle: "국어",
    });
    await expect(
      prisma.challengeCardState.count({ where: { challengeId: challenge.id } }),
    ).resolves.toBe(1);
    await expect(updateChallengeFromDeck(prisma, challenge.id)).rejects.toThrow(
      "Source deck is unavailable",
    );
  });
});

describe("run repositories", () => {
  it("persists deck run cursor and restart clears completed state", async () => {
    const deck = await createDeck(prisma, { title: "국어" });

    await expect(getDeckRunState(prisma, deck.id)).resolves.toMatchObject({
      deckId: deck.id,
      cursor: 0,
      completedAt: null,
    });

    await updateDeckRunCursor(prisma, deck.id, {
      cursor: 3,
      completedAt: new Date("2026-06-22T00:00:00.000Z"),
    });
    await expect(getDeckRunState(prisma, deck.id)).resolves.toMatchObject({
      deckId: deck.id,
      cursor: 3,
      completedAt: new Date("2026-06-22T00:00:00.000Z"),
    });

    await restartDeckRun(prisma, deck.id);
    await expect(getDeckRunState(prisma, deck.id)).resolves.toMatchObject({
      deckId: deck.id,
      cursor: 0,
      completedAt: null,
    });
  });
});

function createMigratedDatabaseUrl(): string {
  const databasePath = join(mkdtempSync(join(tmpdir(), "inq-db-test-")), "test.db");
  const databaseUrl = `file:${databasePath}`;
  const migrationsDirectory = join(testDirname, "../prisma/migrations");

  for (const migration of readdirSync(migrationsDirectory, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    execFileSync("sqlite3", [databasePath], {
      input: readFileSync(
        join(migrationsDirectory, migration, "migration.sql"),
        "utf8",
      ),
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  return databaseUrl;
}
