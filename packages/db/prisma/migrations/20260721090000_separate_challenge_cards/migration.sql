PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceDeckId" TEXT,
    "sourceDeckTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "answerMode" TEXT NOT NULL DEFAULT 'manual',
    "reviewIntervalsDays" JSONB NOT NULL,
    "maxStage" INTEGER NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Challenge_sourceDeckId_fkey" FOREIGN KEY ("sourceDeckId") REFERENCES "Deck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Challenge" (
    "id",
    "name",
    "sourceDeckId",
    "sourceDeckTitle",
    "status",
    "answerMode",
    "reviewIntervalsDays",
    "maxStage",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    challenge."id",
    challenge."name",
    challenge."deckId",
    deck."title",
    challenge."status",
    challenge."answerMode",
    challenge."reviewIntervalsDays",
    challenge."maxStage",
    challenge."completedAt",
    challenge."createdAt",
    challenge."updatedAt"
FROM "Challenge" AS challenge
JOIN "Deck" AS deck ON deck."id" = challenge."deckId";

CREATE TABLE "ChallengeCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "sourceDeckCardId" TEXT,
    "segments" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeCard_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCard_sourceDeckCardId_fkey" FOREIGN KEY ("sourceDeckCardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "ChallengeCard" (
    "id",
    "challengeId",
    "sourceDeckCardId",
    "segments",
    "createdAt",
    "updatedAt"
)
SELECT
    'challenge-card-' || state."id",
    state."challengeId",
    state."cardId",
    card."segments",
    state."createdAt",
    state."updatedAt"
FROM "ChallengeCardState" AS state
JOIN "Card" AS card ON card."id" = state."cardId";

CREATE TABLE "new_ChallengeCardState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "challengeCardId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "challengeViewCount" INTEGER NOT NULL DEFAULT 0,
    "dueAt" DATETIME,
    "lastChallengedAt" DATETIME,
    "result" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeCardState_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCardState_challengeCardId_fkey" FOREIGN KEY ("challengeCardId") REFERENCES "ChallengeCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ChallengeCardState" (
    "id",
    "challengeId",
    "challengeCardId",
    "stage",
    "challengeViewCount",
    "dueAt",
    "lastChallengedAt",
    "result",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    state."id",
    state."challengeId",
    'challenge-card-' || state."id",
    state."stage",
    state."challengeViewCount",
    state."dueAt",
    state."lastChallengedAt",
    state."result",
    state."completedAt",
    state."createdAt",
    state."updatedAt"
FROM "ChallengeCardState" AS state;

CREATE TABLE "new_ChallengeAnswerEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "challengeCardId" TEXT NOT NULL,
    "sessionCardId" TEXT NOT NULL,
    "finalResult" TEXT NOT NULL,
    "previousStage" INTEGER NOT NULL,
    "nextStage" INTEGER,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeAnswerEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeAnswerEvent_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "ChallengeCardState" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeAnswerEvent_challengeCardId_fkey" FOREIGN KEY ("challengeCardId") REFERENCES "ChallengeCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ChallengeAnswerEvent" (
    "id",
    "challengeId",
    "stateId",
    "challengeCardId",
    "sessionCardId",
    "finalResult",
    "previousStage",
    "nextStage",
    "answeredAt"
)
SELECT
    event."id",
    event."challengeId",
    event."stateId",
    'challenge-card-' || event."stateId",
    event."sessionCardId",
    event."finalResult",
    event."previousStage",
    event."nextStage",
    event."answeredAt"
FROM "ChallengeAnswerEvent" AS event;

CREATE TABLE "new_ChallengeRunSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "queue" JSONB NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeRunSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ChallengeRunSession" (
    "id",
    "challengeId",
    "status",
    "cursor",
    "queue",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    session."id",
    session."challengeId",
    session."status",
    session."cursor",
    COALESCE(
        (
            SELECT json_group_array(json(queue_item."value"))
            FROM (
                SELECT json_remove(
                    json_set(
                        queue_entry."value",
                        '$.challengeCardId',
                        'challenge-card-' || json_extract(queue_entry."value", '$.stateId')
                    ),
                    '$.cardId'
                ) AS "value"
                FROM json_each(session."queue") AS queue_entry
                ORDER BY CAST(queue_entry."key" AS INTEGER)
            ) AS queue_item
        ),
        json('[]')
    ),
    session."completedAt",
    session."createdAt",
    session."updatedAt"
FROM "ChallengeRunSession" AS session;

DROP TABLE "ChallengeAnswerEvent";
DROP TABLE "ChallengeCardState";
DROP TABLE "ChallengeRunSession";
DROP TABLE "Challenge";

ALTER TABLE "new_Challenge" RENAME TO "Challenge";
ALTER TABLE "new_ChallengeCardState" RENAME TO "ChallengeCardState";
ALTER TABLE "new_ChallengeAnswerEvent" RENAME TO "ChallengeAnswerEvent";
ALTER TABLE "new_ChallengeRunSession" RENAME TO "ChallengeRunSession";

CREATE INDEX "Challenge_sourceDeckId_idx" ON "Challenge"("sourceDeckId");
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");
CREATE UNIQUE INDEX "ChallengeCard_challengeId_sourceDeckCardId_key" ON "ChallengeCard"("challengeId", "sourceDeckCardId");
CREATE INDEX "ChallengeCard_challengeId_idx" ON "ChallengeCard"("challengeId");
CREATE INDEX "ChallengeCard_sourceDeckCardId_idx" ON "ChallengeCard"("sourceDeckCardId");
CREATE UNIQUE INDEX "ChallengeCardState_challengeCardId_key" ON "ChallengeCardState"("challengeCardId");
CREATE INDEX "ChallengeCardState_challengeId_dueAt_idx" ON "ChallengeCardState"("challengeId", "dueAt");
CREATE INDEX "ChallengeAnswerEvent_challengeId_idx" ON "ChallengeAnswerEvent"("challengeId");
CREATE INDEX "ChallengeAnswerEvent_stateId_idx" ON "ChallengeAnswerEvent"("stateId");
CREATE INDEX "ChallengeAnswerEvent_challengeCardId_idx" ON "ChallengeAnswerEvent"("challengeCardId");
CREATE INDEX "ChallengeAnswerEvent_sessionCardId_idx" ON "ChallengeAnswerEvent"("sessionCardId");
CREATE INDEX "ChallengeRunSession_challengeId_idx" ON "ChallengeRunSession"("challengeId");
CREATE INDEX "ChallengeRunSession_status_idx" ON "ChallengeRunSession"("status");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
