import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirname = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(testDirname, "../prisma/migrations");

describe("challenge card separation migration", () => {
  it("preserves legacy snapshots, progress, answer events, and active queues", () => {
    const directory = mkdtempSync(join(tmpdir(), "inq-migration-test-"));
    const databasePath = join(directory, "legacy.db");

    try {
      applyMigration(databasePath, "20260622135735_init");
      executeSql(
        databasePath,
        `
          PRAGMA foreign_keys=ON;
          INSERT INTO Deck VALUES ('deck-1', '원본 덱', '2026-01-01', '2026-01-02');
          INSERT INTO Card VALUES (
            'card-1',
            'deck-1',
            '[{"type":"answer","id":"answer-1","value":"정답"}]',
            7,
            '2026-01-03',
            2,
            '2026-01-01',
            '2026-01-02'
          );
          INSERT INTO Challenge VALUES (
            'challenge-1',
            '복습',
            'deck-1',
            'active',
            'manual',
            '[3,5]',
            2,
            NULL,
            '2026-01-01',
            '2026-01-02'
          );
          INSERT INTO ChallengeCardState VALUES (
            'state-1',
            'challenge-1',
            'card-1',
            1,
            4,
            '2026-01-05',
            '2026-01-04',
            'wrong',
            NULL,
            '2026-01-01',
            '2026-01-02'
          );
          INSERT INTO ChallengeAnswerEvent VALUES (
            'event-1',
            'challenge-1',
            'state-1',
            'card-1',
            'session-card-1',
            'wrong',
            1,
            0,
            '2026-01-04'
          );
          INSERT INTO ChallengeRunSession VALUES (
            'session-1',
            'challenge-1',
            'active',
            0,
            '[{"sessionCardId":"session-card-1","stateId":"state-1","cardId":"card-1","queueIndex":0,"startingStage":1,"selectedResult":"wrong"}]',
            NULL,
            '2026-01-04',
            '2026-01-04'
          );
        `,
      );

      applyMigration(databasePath, "20260721090000_separate_challenge_cards");

      expect(queryRows(databasePath, "PRAGMA foreign_key_check;")).toEqual([]);
      expect(
        queryRows(
          databasePath,
          'SELECT id, sourceDeckId, sourceDeckTitle FROM Challenge;',
        ),
      ).toEqual([
        {
          id: "challenge-1",
          sourceDeckId: "deck-1",
          sourceDeckTitle: "원본 덱",
        },
      ]);
      expect(
        queryRows(
          databasePath,
          'SELECT id, challengeId, sourceDeckCardId, json(segments) AS segments FROM ChallengeCard;',
        ),
      ).toEqual([
        {
          id: "challenge-card-state-1",
          challengeId: "challenge-1",
          sourceDeckCardId: "card-1",
          segments:
            '[{"type":"answer","id":"answer-1","value":"정답"}]',
        },
      ]);
      expect(
        queryRows(
          databasePath,
          'SELECT id, challengeId, challengeCardId, stage, challengeViewCount, dueAt, lastChallengedAt, result FROM ChallengeCardState;',
        ),
      ).toEqual([
        {
          id: "state-1",
          challengeId: "challenge-1",
          challengeCardId: "challenge-card-state-1",
          stage: 1,
          challengeViewCount: 4,
          dueAt: "2026-01-05",
          lastChallengedAt: "2026-01-04",
          result: "wrong",
        },
      ]);
      expect(
        queryRows(
          databasePath,
          'SELECT id, challengeId, stateId, challengeCardId, sessionCardId FROM ChallengeAnswerEvent;',
        ),
      ).toEqual([
        {
          id: "event-1",
          challengeId: "challenge-1",
          stateId: "state-1",
          challengeCardId: "challenge-card-state-1",
          sessionCardId: "session-card-1",
        },
      ]);

      const [session] = queryRows(
        databasePath,
        'SELECT id, status, cursor, json(queue) AS queue FROM ChallengeRunSession;',
      );
      expect(session).toMatchObject({
        id: "session-1",
        status: "active",
        cursor: 0,
      });
      expect(JSON.parse(String(session?.queue))).toEqual([
        {
          sessionCardId: "session-card-1",
          stateId: "state-1",
          challengeCardId: "challenge-card-state-1",
          queueIndex: 0,
          startingStage: 1,
          selectedResult: "wrong",
        },
      ]);

      executeSql(
        databasePath,
        "PRAGMA foreign_keys=ON; DELETE FROM Deck WHERE id = 'deck-1';",
      );

      expect(
        queryRows(
          databasePath,
          'SELECT sourceDeckId, sourceDeckTitle FROM Challenge;',
        ),
      ).toEqual([{ sourceDeckId: null, sourceDeckTitle: "원본 덱" }]);
      expect(
        queryRows(
          databasePath,
          'SELECT sourceDeckCardId FROM ChallengeCard;',
        ),
      ).toEqual([{ sourceDeckCardId: null }]);
      expect(
        queryRows(databasePath, "SELECT count(*) AS count FROM ChallengeCardState;"),
      ).toEqual([{ count: 1 }]);
      expect(
        queryRows(databasePath, "SELECT count(*) AS count FROM ChallengeAnswerEvent;"),
      ).toEqual([{ count: 1 }]);
      expect(
        queryRows(databasePath, "SELECT count(*) AS count FROM ChallengeRunSession;"),
      ).toEqual([{ count: 1 }]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

function applyMigration(databasePath: string, migration: string) {
  execFileSync("sqlite3", [databasePath], {
    input: readFileSync(
      join(migrationsDirectory, migration, "migration.sql"),
      "utf8",
    ),
  });
}

function executeSql(databasePath: string, sql: string) {
  execFileSync("sqlite3", [databasePath], { input: sql });
}

function queryRows(databasePath: string, sql: string) {
  const output = execFileSync("sqlite3", ["-json", databasePath, sql], {
    encoding: "utf8",
  }).trim();

  return output ? (JSON.parse(output) as Array<Record<string, unknown>>) : [];
}
