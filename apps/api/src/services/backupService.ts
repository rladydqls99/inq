import type { PrismaClient } from "@inq/db";
import type {
  BackupExport,
  CardResponse,
  ChallengeAnswerEventExport,
  ChallengeCardExport,
  ChallengeCardStateExport,
  ChallengeRunCard,
  ChallengeRunSessionExport,
  DeckRunStateExport,
  QuizSegment,
} from "@inq/shared";
import { listDecks } from "@inq/db/repositories/decks";
import { listChallengeResponses } from "./challengeService";

export async function exportBackup(
  prisma: PrismaClient,
  now = new Date(),
): Promise<BackupExport> {
  const [
    decks,
    cards,
    challenges,
    challengeCards,
    challengeCardStates,
    challengeAnswerEvents,
    challengeRunSessions,
    deckRunStates,
  ] = await Promise.all([
    listDecks(prisma),
    prisma.card.findMany({ orderBy: { createdAt: "asc" } }),
    listChallengeResponses(prisma, now),
    prisma.challengeCard.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.challengeCardState.findMany({
      include: { challengeCard: { select: { challengeId: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.challengeAnswerEvent.findMany({
      include: { challengeCard: { select: { challengeId: true } } },
      orderBy: { answeredAt: "asc" },
    }),
    prisma.challengeRunSession.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.deckRunState.findMany({ orderBy: { updatedAt: "asc" } }),
  ]);
  const challengeCardMap = new Map(
    challengeCards.map((card) => [card.id, card]),
  );

  return {
    schemaVersion: 2,
    exportedAt: now.toISOString(),
    decks: decks.map((deck) => ({
      ...deck,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    })),
    cards: cards.map(toCardResponse),
    challenges,
    challengeCards: challengeCards.map(toChallengeCardExport),
    challengeCardStates: challengeCardStates.map(toChallengeCardStateExport),
    challengeAnswerEvents: challengeAnswerEvents.map(toChallengeAnswerEventExport),
    challengeRunSessions: challengeRunSessions.map((session) => {
      const queue = toChallengeRunQueueExport(session.queue, challengeCardMap);
      const completedAt =
        queue.length === 0
          ? session.completedAt ?? now
          : session.completedAt;

      return {
        id: session.id,
        challengeId: session.challengeId,
        status: (queue.length === 0 ? "completed" : session.status) as
          ChallengeRunSessionExport["status"],
        cursor: Math.min(session.cursor, queue.length),
        queue,
        completedAt: completedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };
    }),
    deckRunStates: deckRunStates.map(toDeckRunStateExport),
  };
}

function toChallengeRunQueueExport(
  queue: unknown,
  challengeCardMap: Map<string, { segments: unknown }>,
): ChallengeRunCard[] {
  if (!Array.isArray(queue)) {
    return [];
  }

  return (queue as Array<Omit<ChallengeRunCard, "segments">>)
    .filter((queueCard) =>
      challengeCardMap.has(queueCard.challengeCardId),
    )
    .map((queueCard, queueIndex) => ({
      ...queueCard,
      queueIndex,
      segments: challengeCardMap.get(queueCard.challengeCardId)
        ?.segments as QuizSegment[],
    }));
}

function toChallengeCardExport(card: {
  id: string;
  challengeId: string;
  sourceDeckCardId: string | null;
  segments: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ChallengeCardExport {
  return {
    id: card.id,
    challengeId: card.challengeId,
    sourceDeckCardId: card.sourceDeckCardId,
    segments: card.segments as QuizSegment[],
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function toCardResponse(card: {
  id: string;
  deckId: string;
  segments: unknown;
  studyViewCount: number;
  lastStudiedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): CardResponse {
  return {
    id: card.id,
    deckId: card.deckId,
    segments: card.segments as QuizSegment[],
    studyViewCount: card.studyViewCount,
    lastStudiedAt: card.lastStudiedAt?.toISOString() ?? null,
    version: card.version,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function toChallengeCardStateExport(state: {
  id: string;
  challengeCardId: string;
  challengeCard: { challengeId: string };
  stage: number;
  challengeViewCount: number;
  dueAt: Date | null;
  lastChallengedAt: Date | null;
  result: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ChallengeCardStateExport {
  return {
    id: state.id,
    challengeId: state.challengeCard.challengeId,
    challengeCardId: state.challengeCardId,
    stage: state.stage,
    challengeViewCount: state.challengeViewCount,
    dueAt: state.dueAt?.toISOString() ?? null,
    lastChallengedAt: state.lastChallengedAt?.toISOString() ?? null,
    result: state.result as ChallengeCardStateExport["result"],
    completedAt: state.completedAt?.toISOString() ?? null,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

function toChallengeAnswerEventExport(event: {
  id: string;
  stateId: string;
  challengeCardId: string;
  challengeCard: { challengeId: string };
  sessionCardId: string;
  finalResult: string;
  previousStage: number;
  nextStage: number | null;
  answeredAt: Date;
}): ChallengeAnswerEventExport {
  return {
    id: event.id,
    challengeId: event.challengeCard.challengeId,
    stateId: event.stateId,
    challengeCardId: event.challengeCardId,
    sessionCardId: event.sessionCardId,
    finalResult: event.finalResult as ChallengeAnswerEventExport["finalResult"],
    previousStage: event.previousStage,
    nextStage: event.nextStage,
    answeredAt: event.answeredAt.toISOString(),
  };
}

function toDeckRunStateExport(state: {
  id: string;
  deckId: string;
  cursor: number;
  completedAt: Date | null;
  updatedAt: Date;
}): DeckRunStateExport {
  return {
    id: state.id,
    deckId: state.deckId,
    cursor: state.cursor,
    completedAt: state.completedAt?.toISOString() ?? null,
    updatedAt: state.updatedAt.toISOString(),
  };
}
