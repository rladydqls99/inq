export type AnswerMode = "manual";

export type QuizSegment =
  | { type: "text"; value: string }
  | { type: "answer"; id: string; value: string };

export type PinSetupRequest = {
  pin: string;
};

export type UnlockRequest = {
  pin: string;
};

export type UnlockResponse = {
  unlocked: true;
  expiresAt: string;
};

export type ChangePinRequest = {
  currentPin: string;
  nextPin: string;
  nextPinConfirm: string;
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
  deckId: string;
  deckTitle: string;
  status: ChallengeStatus;
  answerMode: AnswerMode;
  reviewIntervalsDays: number[];
  maxStage: number;
  dueCount: number;
  progress: ChallengeProgress;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportPreviewRequest = {
  markdown: string;
};

export type ImportValidationErrorCode =
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
  cardId: string;
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
  cursor: number;
  completedAt: string | null;
  cards: DeckRunCard[];
};

export type UpdateDeckRunRequest = {
  cursor: number;
};

export type ChallengeCardStateExport = {
  id: string;
  challengeId: string;
  cardId: string;
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
  cardId: string;
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
  exportedAt: string;
  decks: DeckResponse[];
  cards: CardResponse[];
  challenges: ChallengeResponse[];
  challengeCardStates: ChallengeCardStateExport[];
  challengeAnswerEvents: ChallengeAnswerEventExport[];
  challengeRunSessions: ChallengeRunSessionExport[];
  deckRunStates: DeckRunStateExport[];
};
