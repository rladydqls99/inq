const CHALLENGE_TIME_ZONE_OFFSET_MS = 9 * 60 * 60 * 1000;

export function startOfChallengeDayAfter(date: Date, days: number): Date {
  const challengeLocalDate = new Date(
    date.getTime() + CHALLENGE_TIME_ZONE_OFFSET_MS,
  );
  const startOfTargetDayUtc = Date.UTC(
    challengeLocalDate.getUTCFullYear(),
    challengeLocalDate.getUTCMonth(),
    challengeLocalDate.getUTCDate() + days,
  );

  return new Date(startOfTargetDayUtc - CHALLENGE_TIME_ZONE_OFFSET_MS);
}

export function challengeRetryAvailableAt(
  session: { completedAt: Date | null; queue: unknown } | undefined | null,
): Date | null {
  if (
    !session?.completedAt ||
    !Array.isArray(session.queue) ||
    session.queue.length === 0
  ) {
    return null;
  }

  return startOfChallengeDayAfter(session.completedAt, 1);
}
