UPDATE "ChallengeCardState"
SET
    "stage" = 0,
    "dueAt" = NULL,
    "completedAt" = NULL
WHERE "result" = 'wrong'
  AND "completedAt" IS NULL;
