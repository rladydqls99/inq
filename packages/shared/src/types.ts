export type QuizSegment =
  | { type: "text"; value: string }
  | { type: "answer"; id: string; value: string };

export type UnlockRequest = {
  pin: string;
};

export type UnlockResponse = {
  unlocked: true;
  expiresAt: string;
};

export type CreateDeckRequest = {
  title: string;
};

export type UpdateDeckRequest = {
  title: string;
};

export type DeckResponse = {
  id: string;
  title: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CardResponse = {
  id: string;
  deckId: string;
  segments: QuizSegment[];
  studyViewCount: number;
  lastStudiedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCardRequest = {
  segments: QuizSegment[];
  version: number;
};

export type ChallengeStatus = "active" | "completed";

export type ChallengeProgress = {
  totalCards: number;
  completedCards: number;
  dueCards: number;
  currentStageCounts: Record<number, number>;
};

export type CreateChallengeRequest = {
  name: string;
  deckId: string;
  reviewIntervalsDays: number[];
};

export type UpdateChallengeRequest = {
  name?: string;
  reviewIntervalsDays?: number[];
};

export type ChallengeResponse = {
  id: string;
  name: string;
  sourceDeckId: string | null;
  deckTitle: string;
  status: ChallengeStatus;
  answerMode: "manual";
  reviewIntervalsDays: number[];
  maxStage: number;
  dueCount: number;
  progress: ChallengeProgress;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeCardResponse = {
  stateId: string;
  challengeId: string;
  challengeCardId: string;
  sourceDeckCardId: string | null;
  segments: QuizSegment[];
  stage: number;
  challengeViewCount: number;
  dueAt: string | null;
  lastChallengedAt: string | null;
  result: ChallengeResult | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportPreviewRequest = {
  markdown: string;
};

export type ImportValidationErrorCode =
  | "empty_import"
  | "missing_answer"
  | "unmatched_open_bracket"
  | "unmatched_close_bracket"
  | "empty_answer"
  | "nested_bracket";

export type ImportValidationError = {
  blockIndex: number;
  line: number | null;
  column: number | null;
  code: ImportValidationErrorCode;
  message: string;
  snippet: string;
};

export type ImportPreviewCard = {
  blockIndex: number;
  segments: QuizSegment[];
};

export type ImportPreviewResponse = {
  parsed: number;
  errors: ImportValidationError[];
  previewCards: ImportPreviewCard[];
};

export type ImportConfirmRequest = {
  deckId: string;
  markdown: string;
};

export type ChallengeResult = "correct" | "wrong" | "completed";

export type ChallengeRunSessionStatus = "active" | "completed";

export type ChallengeRunCard = {
  sessionCardId: string;
  stateId: string;
  challengeCardId: string;
  segments: QuizSegment[];
  queueIndex: number;
  selectedResult: "correct" | "wrong" | null;
};

export type ChallengeRunState = {
  sessionId: string;
  challengeId: string;
  status: ChallengeRunSessionStatus;
  cursor: number;
  cards: ChallengeRunCard[];
};

export type SubmitChallengeCardResultRequest = {
  sessionCardId: string;
  finalResult: "correct" | "wrong";
};

export type SubmitChallengeCardResultResponse = {
  runState: ChallengeRunState;
  progress: ChallengeProgress;
};

export type DeckRunCard = {
  cardId: string;
  segments: QuizSegment[];
};

export type DeckRunResponse = {
  deckId: string;
  deckTitle: string;
  cursor: number;
  completedAt: string | null;
  cards: DeckRunCard[];
};

export type UpdateDeckRunRequest = {
  cursor: number;
};

export type ChallengeCardExport = {
  id: string;
  challengeId: string;
  sourceDeckCardId: string | null;
  segments: QuizSegment[];
  createdAt: string;
  updatedAt: string;
};

export type ChallengeCardStateExport = {
  id: string;
  challengeId: string;
  challengeCardId: string;
  stage: number;
  challengeViewCount: number;
  dueAt: string | null;
  lastChallengedAt: string | null;
  result: ChallengeResult | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeAnswerEventExport = {
  id: string;
  challengeId: string;
  stateId: string;
  challengeCardId: string;
  sessionCardId: string;
  finalResult: "correct" | "wrong";
  previousStage: number;
  nextStage: number | null;
  answeredAt: string;
};

export type ChallengeRunSessionExport = {
  id: string;
  challengeId: string;
  status: ChallengeRunSessionStatus;
  cursor: number;
  queue: ChallengeRunCard[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeckRunStateExport = {
  id: string;
  deckId: string;
  cursor: number;
  completedAt: string | null;
  updatedAt: string;
};

export type BackupExport = {
  schemaVersion: 2;
  exportedAt: string;
  decks: DeckResponse[];
  cards: CardResponse[];
  challenges: ChallengeResponse[];
  challengeCards: ChallengeCardExport[];
  challengeCardStates: ChallengeCardStateExport[];
  challengeAnswerEvents: ChallengeAnswerEventExport[];
  challengeRunSessions: ChallengeRunSessionExport[];
  deckRunStates: DeckRunStateExport[];
};
