-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "studyViewCount" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "answerMode" TEXT NOT NULL DEFAULT 'manual',
    "reviewIntervalsDays" JSONB NOT NULL,
    "maxStage" INTEGER NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Challenge_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeCardState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "challengeViewCount" INTEGER NOT NULL DEFAULT 0,
    "dueAt" DATETIME,
    "lastChallengedAt" DATETIME,
    "result" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeCardState_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCardState_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeAnswerEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "sessionCardId" TEXT NOT NULL,
    "finalResult" TEXT NOT NULL,
    "previousStage" INTEGER NOT NULL,
    "nextStage" INTEGER,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeAnswerEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeAnswerEvent_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "ChallengeCardState" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeAnswerEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeRunSession" (
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

-- CreateTable
CREATE TABLE "DeckRunState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeckRunState_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PinSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pinHash" TEXT NOT NULL,
    "sessionsInvalidatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Card_deckId_idx" ON "Card"("deckId");

-- CreateIndex
CREATE INDEX "Challenge_deckId_idx" ON "Challenge"("deckId");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "ChallengeCardState_challengeId_dueAt_idx" ON "ChallengeCardState"("challengeId", "dueAt");

-- CreateIndex
CREATE INDEX "ChallengeCardState_cardId_idx" ON "ChallengeCardState"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCardState_challengeId_cardId_key" ON "ChallengeCardState"("challengeId", "cardId");

-- CreateIndex
CREATE INDEX "ChallengeAnswerEvent_challengeId_idx" ON "ChallengeAnswerEvent"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeAnswerEvent_stateId_idx" ON "ChallengeAnswerEvent"("stateId");

-- CreateIndex
CREATE INDEX "ChallengeAnswerEvent_cardId_idx" ON "ChallengeAnswerEvent"("cardId");

-- CreateIndex
CREATE INDEX "ChallengeAnswerEvent_sessionCardId_idx" ON "ChallengeAnswerEvent"("sessionCardId");

-- CreateIndex
CREATE INDEX "ChallengeRunSession_challengeId_idx" ON "ChallengeRunSession"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeRunSession_status_idx" ON "ChallengeRunSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeckRunState_deckId_key" ON "DeckRunState"("deckId");
