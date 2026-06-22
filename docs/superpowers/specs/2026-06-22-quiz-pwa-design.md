# Quiz PWA Design

Date: 2026-06-22

## 1. Goal

Build a personal quiz PWA with no account signup. The app is protected by a PIN gate on both mobile and desktop. Most usage happens on mobile. The only desktop-first page is the markdown quiz upload page.

The final deployment target uses Docker and Nginx.

The app supports:

- Deck management
- Challenge management
- Challenge run mode
- Deck run mode
- Markdown quiz upload
- Mobile card editing
- JSON backup export

## 2. Non-Goals

These are intentionally excluded from the MVP:

- User signup
- Social login
- Multi-user data ownership
- Duplicate card detection
- Card search or filtering
- Soft delete or archive
- Backup import
- In-app markdown file storage
- Voice answer mode implementation
- Escaped bracket syntax in markdown quiz files

Voice support should remain possible later through `AnswerMode`.

## 3. Review Map

Review this document in small units:

1. App routing and PIN gate
2. Mobile shell and navigation
3. Quiz text model
4. Shared display components
5. Challenge run UX
6. Deck run UX
7. Deck and card management
8. Challenge management
9. Desktop markdown upload
10. Settings and backup export
11. API types
12. Database model
13. Deployment
14. Implementation work units

## 4. App Routing And PIN Gate

### 4.1 Behavior

All routes require PIN unlock before content is shown.

```txt
AppRoot
  PinGate
    PinLockScreen
    AuthenticatedApp
      MobileAppShell
      DesktopUploadLayout
```

The PIN gate applies to:

- Mobile pages
- Desktop upload page
- Settings page
- Any direct deep link

### 4.2 PIN Session

The app stores an unlocked session state after successful PIN entry. If the session expires, the current page is hidden and `PinLockScreen` is shown again.

The exact expiry duration can be chosen during implementation. The first version should use one simple duration shared by mobile and desktop.

### 4.3 Auth API Rules

All API routes require an unlocked PIN session except:

- `POST /api/auth/unlock`
- First-time PIN setup route, if no PIN exists yet

The API should use an httpOnly session cookie after successful unlock. The browser should not store the raw PIN.

First run behavior:

- If no PIN exists, the app shows a PIN setup screen.
- After PIN setup, the same PIN gate flow is used.

Lock behavior:

- Manual lock clears the auth session cookie.
- Session expiry also invalidates the current auth session.
- Direct deep links after lock must return to the PIN screen.

PIN change behavior:

- Requires current PIN.
- Requires new PIN confirmation.
- Clears existing sessions after a successful change.

Session invalidation model:

- `PinSettings` stores `sessionsInvalidatedAt`.
- Each auth session stores `createdAt`.
- Auth middleware rejects sessions where `session.createdAt < PinSettings.sessionsInvalidatedAt`.
- PIN change updates `sessionsInvalidatedAt` so old cookies stop working.

### 4.4 Work Units

- `PIN-01`: Create PIN gate route wrapper.
- `PIN-02`: Create PIN entry screen.
- `PIN-03`: Store and validate configured PIN.
- `PIN-04`: Add PIN session expiration.
- `PIN-05`: Add PIN change flow in settings.
- `PIN-06`: Verify direct desktop upload URL is locked.
- `PIN-07`: Verify direct mobile deep links are locked.
- `PIN-08`: Add first-time PIN setup.
- `PIN-09`: Use httpOnly session cookie after unlock.
- `PIN-10`: Clear sessions after PIN change.
- `PIN-11`: Add `sessionsInvalidatedAt` auth check.

## 5. Mobile Shell And Navigation

### 5.1 Bottom Tabs

Mobile uses four bottom tabs:

```txt
Home / Challenges / Decks / Settings
```

### 5.2 Navigation Rules

- Home challenge item tap opens challenge run mode.
- Challenge list item tap opens challenge run mode.
- Deck list item tap opens deck run mode.
- Deck card management opens through a separate `Manage Cards` row action.
- Edit, delete, update, and manage actions are separate icon/menu actions.

### 5.3 Work Units

- `NAV-01`: Create `MobileAppShell`.
- `NAV-02`: Create bottom tab navigation.
- `NAV-03`: Add home tab route.
- `NAV-04`: Add challenges tab route.
- `NAV-05`: Add decks tab route.
- `NAV-06`: Add settings tab route.
- `NAV-07`: Add route from home challenge item to challenge runner.
- `NAV-08`: Add route from challenge list item to challenge runner.
- `NAV-09`: Add route from deck list item to deck runner.
- `NAV-10`: Separate list row tap from row action menu tap.
- `NAV-11`: Add deck row action route to deck detail and card management.

## 6. Quiz Text Model

### 6.1 Segment Model

Cards are stored as ordered segments.

```ts
type QuizSegment =
  | { type: "text"; value: string }
  | { type: "answer"; id: string; value: string };
```

Example markdown:

```txt
훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.
```

Parsed segments:

```ts
[
  { type: "text", value: "훈민정음을 만든 " },
  { type: "answer", id: "a1", value: "조선" },
  { type: "text", value: "의 왕은 " },
  { type: "answer", id: "a2", value: "세종대왕" },
  { type: "text", value: "이다." }
]
```

### 6.2 Display Modes

Prompt mode:

```txt
훈민정음을 만든 ____의 왕은 ____이다.
```

Revealed mode:

```txt
훈민정음을 만든 조선의 왕은 세종대왕이다.
```

Answers are not shown below the question. They are inserted into the original sentence.

### 6.3 Future Voice Support

Voice answer mode can extract expected answers from answer segments:

```ts
const answers = segments
  .filter((segment) => segment.type === "answer")
  .map((segment) => segment.value);
```

### 6.4 Work Units

- `QUIZ-01`: Define `QuizSegment` shared type.
- `QUIZ-02`: Add parser output for segment arrays.
- `QUIZ-03`: Add helper to get prompt text from segments.
- `QUIZ-04`: Add helper to get revealed text from segments.
- `QUIZ-05`: Add helper to extract answers from segments.
- `QUIZ-06`: Add validation that each card has at least one answer segment.

## 7. Shared Components

### 7.1 Component List

```txt
App/Layout
- MobileAppShell
- DesktopUploadLayout
- BottomTabNav
- PageHeader

Auth
- PinGate
- PinLockScreen
- PinChangeForm

Quiz Display
- QuizTextRenderer
- QuizPreview
- CardPlayer
- AutoAdvanceTimer
- MediaSessionController

Lists
- ActionListItem
- ChallengeListItem
- DeckListItem
- ProgressSummary

Forms
- ChallengeForm
- DeckForm
- CardSegmentEditForm
- DeckSelectOrCreate

Upload
- MarkdownUploadPane
- ImportValidationSummary
- ImportErrorList
- ImportPreviewList
- ImportConfirmBar

Settings
- BackupExportButton
```

### 7.2 QuizTextRenderer

`QuizTextRenderer` renders segment arrays.

Props:

```ts
type QuizTextMode = "prompt" | "revealed";
type AnswerTone = "neutral" | "correct" | "wrong" | "study";

type QuizTextRendererProps = {
  segments: QuizSegment[];
  mode: QuizTextMode;
  answerTone: AnswerTone;
};
```

Rules:

- `prompt`: answer segments render as blanks.
- `revealed`: answer segments render as answer text.
- `correct`: answer text is green.
- `wrong`: answer text is red.
- `study`: answer text uses the study highlight style and bold weight.
- `neutral`: no strong result color.

### 7.3 CardPlayer

`CardPlayer` owns generic card display interactions:

- Current card index
- Previous card action
- Next card action
- Revealed state
- Auto-advance timer display

It does not own:

- Correct or wrong result persistence
- Challenge stage calculation
- Deck cursor persistence
- Markdown parsing

### 7.4 Work Units

- `CMP-01`: Create `QuizTextRenderer`.
- `CMP-02`: Add prompt rendering.
- `CMP-03`: Add revealed rendering.
- `CMP-04`: Add answer tone styles.
- `CMP-05`: Create `QuizPreview`.
- `CMP-06`: Create `CardPlayer` shell.
- `CMP-07`: Add previous and next controls to `CardPlayer`.
- `CMP-08`: Add revealed state to `CardPlayer`.
- `CMP-09`: Add auto-advance timer display.
- `CMP-10`: Add list item base component.
- `CMP-11`: Add progress summary component.

## 8. Home Page

### 8.1 Purpose

The home page is for quickly starting due challenges.

### 8.2 Content

Show active challenges sorted by nearest due date.

Each item shows:

- Challenge name
- Deck title
- Due card count
- Next due date
- Progress

### 8.3 Empty States

- No challenges: show an action to create a challenge.
- No due cards: keep challenges visible but make due state clear.

### 8.4 Work Units

- `HOME-01`: Fetch active challenge summaries.
- `HOME-02`: Sort by nearest due date.
- `HOME-03`: Render challenge list items.
- `HOME-04`: Render progress summary.
- `HOME-05`: Link item tap to challenge runner.
- `HOME-06`: Add empty state for no challenges.
- `HOME-07`: Add empty state for no due cards.

## 9. Challenge Management

### 9.1 List

The challenges page lists all challenges.

Row tap starts the challenge. Row actions are separate:

- Edit name
- Edit intervals
- Delete
- Update from deck

### 9.2 Create Form

Fields:

- Challenge name
- Deck
- Review intervals

Default intervals:

```ts
[3, 5, 10]
```

### 9.3 Update From Deck

If a deck gets new cards, those cards are not automatically added to existing challenges. The user must tap update on a challenge.

### 9.4 Work Units

- `CHG-01`: Create challenge list page.
- `CHG-02`: Add challenge list item.
- `CHG-03`: Add create challenge form.
- `CHG-04`: Validate challenge name.
- `CHG-05`: Add deck selector to challenge form.
- `CHG-06`: Add interval inputs.
- `CHG-07`: Default intervals to `[3, 5, 10]`.
- `CHG-08`: Add edit name flow.
- `CHG-09`: Add edit intervals flow.
- `CHG-10`: Add delete flow.
- `CHG-11`: Add update-from-deck action.
- `CHG-12`: Show update result count.
- `CHG-13`: Keep row tap separate from action menu.

## 10. Challenge Run

### 10.1 Queue Rules

Cards appear in order. If the user stops after 20 cards out of 100, the next session starts at card 21.

If a card is marked wrong, it moves to the back of the current queue.

Challenge runs use a persisted run session.

The run session stores:

- Challenge id
- Cursor
- Ordered queue of session cards
- Per-session selected result for each card
- Completion timestamp

The queue is generated from due, incomplete challenge card states when the runner starts. A later app launch resumes the existing active run session if it is not completed.

Wrong-card requeue rule:

- When a card is marked wrong for the first time in the current run session, move that session card to the end of the queue.
- If the user goes back and changes the result from wrong to correct, keep the current queue order stable for the rest of that session.
- The persisted challenge card state is recalculated from the latest selected result when the user leaves the card or submits the changed result.
- Active run-session queues ignore `dueAt` after the queue is generated. This allows a wrong card to appear again at the back of the current queue even though its persisted `dueAt` is set for a future review.

### 10.2 Card Interaction

Initial state:

- Prompt text is shown.
- Answers are hidden.
- `Correct` and `Wrong` buttons are visible.

After result selection:

- Revealed sentence is shown.
- Answer segments are highlighted.
- Correct result uses green.
- Wrong result uses red.
- `Next` button appears.
- If the user does nothing, the app auto-advances after 5 seconds.

### 10.3 Previous And Next

The user can move backward and forward.

When returning to a previous card:

- Existing selected result is shown.
- The user can change the result.
- The latest selected result is the final result for that card.

### 10.4 Stage Rules

Default challenge intervals are 3, 5, and 10 days. A card must be answered correctly through all stages to complete.

If a card is wrong, it resets to the first stage.

Stage numbering:

- New challenge card states start at `stage = 0`.
- `maxStage` equals `reviewIntervalsDays.length`.
- A card is complete when it is answered correctly while `stage = maxStage`.

Transition table:

| Current state | Result | Next state | `dueAt` |
| --- | --- | --- | --- |
| `stage = 0` | correct | `stage = 1` | now + `reviewIntervalsDays[0]` days |
| `stage = 1` | correct | `stage = 2` | now + `reviewIntervalsDays[1]` days |
| `stage = 2` | correct | `stage = 3` | now + `reviewIntervalsDays[2]` days |
| `stage = 3` | correct | completed | null |
| any incomplete stage | wrong | `stage = 0` | now + `reviewIntervalsDays[0]` days |

For custom intervals, the same rule applies by index.

Due calculations:

- `dueCount` counts incomplete states where `dueAt <= now`.
- `nextDueAt` is the earliest `dueAt` among incomplete states.
- `completedCards` counts states with `completedAt != null`.
- Completed states are excluded from due counts.

Result correction:

- The latest selected result in the active run session is authoritative for that session card.
- If a user changes a previous result before leaving the session, the system reverses the prior transition for that session card and applies the new transition.
- `ChallengeAnswerEvent` records both the original event and the correction event, with the latest event determining current state.

### 10.5 Work Units

- `RUN-CHG-01`: Create challenge runner route.
- `RUN-CHG-02`: Load run state by challenge id.
- `RUN-CHG-03`: Render current card prompt.
- `RUN-CHG-04`: Add correct and wrong buttons.
- `RUN-CHG-05`: Reveal answers after result selection.
- `RUN-CHG-06`: Apply green highlight for correct.
- `RUN-CHG-07`: Apply red highlight for wrong.
- `RUN-CHG-08`: Add next button after selection.
- `RUN-CHG-09`: Add 5 second auto-advance.
- `RUN-CHG-10`: Add previous navigation.
- `RUN-CHG-11`: Add next navigation.
- `RUN-CHG-12`: Allow previous result correction.
- `RUN-CHG-13`: Persist latest selected result.
- `RUN-CHG-14`: Persist cursor on exit.
- `RUN-CHG-15`: Resume from cursor on next start.
- `RUN-CHG-16`: Move wrong cards to queue back.
- `RUN-CHG-17`: Apply stage advancement for correct.
- `RUN-CHG-18`: Reset stage for wrong.
- `RUN-CHG-19`: Complete challenge when all cards finish all stages.
- `RUN-CHG-20`: Add completed state.
- `RUN-CHG-21`: Persist challenge run session queue.
- `RUN-CHG-22`: Persist per-session selected results.
- `RUN-CHG-23`: Recalculate state when a previous result is corrected.
- `RUN-CHG-24`: Record correction answer events.

## 11. Deck Management

### 11.1 List

The decks page lists decks. Row tap starts deck run mode.

Row actions are separate:

- Edit deck name
- Delete deck
- Manage cards

### 11.2 Deck Detail

Deck detail opens from the `Manage Cards` row action. It shows cards in the deck. Tapping a card opens mobile card editing.

### 11.3 Card Editing

Card editing is mobile-only.

Allowed:

- Edit existing text segment values.
- Edit existing answer segment values.

Not allowed in MVP:

- Add segment
- Delete segment
- Reorder segment
- Change segment type

The edit page shows:

- Segment edit fields
- Prompt preview
- Revealed preview
- Save button
- Cancel button

### 11.4 Work Units

- `DECK-01`: Create deck list page.
- `DECK-02`: Add deck list item.
- `DECK-03`: Link deck item tap to deck runner.
- `DECK-04`: Add deck create form.
- `DECK-05`: Add deck rename flow.
- `DECK-06`: Add deck delete flow.
- `DECK-07`: Add deck detail page.
- `DECK-08`: Add card list in deck detail.
- `DECK-09`: Link card tap to card edit page.
- `DECK-10`: Create card segment edit form.
- `DECK-11`: Render text segment inputs.
- `DECK-12`: Render answer segment inputs.
- `DECK-13`: Add prompt preview.
- `DECK-14`: Add revealed preview.
- `DECK-15`: Save segment value changes.
- `DECK-16`: Prevent segment add, delete, reorder, and type changes.
- `DECK-17`: Add manage cards action from deck list rows.

## 12. Deck Run

### 12.1 Queue Rules

Cards appear in order. If the user stops after 20 cards out of 100, the next session starts at card 21.

When the last card is reached, the run stops in a completed state. The user must start again to return to card 1.

### 12.2 Card Interaction

Initial state:

- Prompt text is shown.
- Answers are hidden.
- `Show Answer` and `Next` controls are available.

After `Show Answer`:

- Revealed sentence is shown.
- Answer segments are highlighted with study styling.

If the user does nothing, the app auto-advances after 10 seconds.

### 12.3 Media Controls

The app should attempt to support previous and next through browser media controls, such as car media buttons or AirPods previous/next controls.

Implementation should use Media Session API where available. If unavailable, screen controls remain the fallback.

### 12.4 Work Units

- `RUN-DECK-01`: Create deck runner route.
- `RUN-DECK-02`: Load deck run state.
- `RUN-DECK-03`: Render current card prompt.
- `RUN-DECK-04`: Add show answer button.
- `RUN-DECK-05`: Reveal answers with study highlight.
- `RUN-DECK-06`: Add next button.
- `RUN-DECK-07`: Add 10 second auto-advance.
- `RUN-DECK-08`: Add previous navigation.
- `RUN-DECK-09`: Add next navigation.
- `RUN-DECK-10`: Persist cursor on exit.
- `RUN-DECK-11`: Resume from cursor on next start.
- `RUN-DECK-12`: Stop at completed state after final card.
- `RUN-DECK-13`: Add restart action from completed state.
- `RUN-DECK-14`: Add Media Session API next handler.
- `RUN-DECK-15`: Add Media Session API previous handler.
- `RUN-DECK-16`: Add fallback when media controls are unavailable.

## 13. Desktop Markdown Upload

### 13.1 Layout

The desktop upload page uses a two-column layout:

```txt
Left: Markdown upload and source
Right: Validation result and card preview
```

It is protected by the same PIN gate as mobile.

### 13.2 Flow

1. Select an existing deck or create a new deck.
2. Upload a markdown file.
3. Split cards by `---`.
4. Validate bracket syntax.
5. Show errors if validation fails.
6. Show card preview if validation passes.
7. Confirm to create cards by sending the markdown again.
8. Do not store the markdown file.

The server must re-parse and re-validate markdown on confirm. It must not trust preview card data sent from the browser.

### 13.3 Markdown Rules

- `---` separates quiz cards only when it appears alone on a line after trimming whitespace.
- `[` starts an answer.
- `]` ends an answer.
- At least one answer is required per card.
- Empty or whitespace-only answers are invalid.
- Nested brackets are invalid in the MVP.
- Empty blocks between separators are ignored.
- Error `line` and `column` values are 1-based.
- Escape syntax is not supported in the MVP.

### 13.4 Error Display

Each error should include:

- Block index
- Line number when available
- Column number when available
- Error code
- Message
- Snippet

### 13.5 Preview

Each preview card shows:

- Prompt text
- Revealed text
- Answer count

### 13.6 Work Units

- `UP-01`: Create desktop upload route.
- `UP-02`: Add two-column desktop layout.
- `UP-03`: Add deck selector.
- `UP-04`: Add create deck inline flow.
- `UP-05`: Add markdown file picker.
- `UP-06`: Read markdown file text in browser.
- `UP-07`: Show markdown source on left.
- `UP-08`: Split markdown by `---`.
- `UP-09`: Validate missing answer.
- `UP-10`: Validate unmatched open bracket.
- `UP-11`: Validate unmatched close bracket.
- `UP-12`: Validate empty answer.
- `UP-13`: Convert valid blocks to segments.
- `UP-14`: Show validation summary.
- `UP-15`: Show error list with location and snippet.
- `UP-16`: Show preview card list.
- `UP-17`: Disable create button when errors exist.
- `UP-18`: Create cards after confirmation.
- `UP-19`: Clear uploaded markdown after successful create.
- `UP-20`: Verify markdown file is not persisted.
- `UP-21`: Re-validate markdown on confirm before creating cards.
- `UP-22`: Reject nested brackets.

## 14. Settings And Backup Export

### 14.1 Settings

Settings is a mobile bottom tab.

Settings includes:

- PIN change
- JSON backup export

### 14.2 Backup Export

Export a JSON file with all app data required to inspect or manually recover the app state.

Backup import is not included in the MVP.

Backup export includes learning state:

- Decks
- Cards
- Challenges
- Challenge card states
- Challenge answer events
- Challenge run sessions
- Deck run states

Backup export excludes PIN data. `PinSettings.pinHash` should not be included.

### 14.3 Work Units

- `SET-01`: Create settings page.
- `SET-02`: Add PIN change form.
- `SET-03`: Add backup export button.
- `SET-04`: Add backup JSON generation endpoint.
- `SET-05`: Download backup JSON from mobile browser.
- `SET-06`: Exclude backup import UI.

## 15. Shared API Types

### 15.1 Base Types

```ts
type AnswerMode = "manual";

type QuizSegment =
  | { type: "text"; value: string }
  | { type: "answer"; id: string; value: string };
```

### 15.2 Auth Types

```ts
type PinSetupRequest = {
  pin: string;
};

type UnlockRequest = {
  pin: string;
};

type UnlockResponse = {
  unlocked: true;
  expiresAt: string;
};

type ChangePinRequest = {
  currentPin: string;
  nextPin: string;
  nextPinConfirm: string;
};
```

### 15.3 Deck Types

```ts
type CreateDeckRequest = {
  title: string;
};

type UpdateDeckRequest = {
  title: string;
};

type DeckResponse = {
  id: string;
  title: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};
```

### 15.4 Card Types

```ts
type CardResponse = {
  id: string;
  deckId: string;
  segments: QuizSegment[];
  studyViewCount: number;
  lastStudiedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type UpdateCardRequest = {
  segments: QuizSegment[];
  version: number;
};
```

### 15.5 Challenge Types

```ts
type ChallengeStatus = "active" | "completed";

type ChallengeProgress = {
  totalCards: number;
  completedCards: number;
  dueCards: number;
  currentStageCounts: Record<number, number>;
};

type CreateChallengeRequest = {
  name: string;
  deckId: string;
  reviewIntervalsDays: number[];
};

type UpdateChallengeRequest = {
  name?: string;
  reviewIntervalsDays?: number[];
};

type ChallengeResponse = {
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
```

### 15.6 Import Types

```ts
type ImportPreviewRequest = {
  markdown: string;
};

type ImportValidationErrorCode =
  | "missing_answer"
  | "unmatched_open_bracket"
  | "unmatched_close_bracket"
  | "empty_answer"
  | "nested_bracket";

type ImportValidationError = {
  blockIndex: number;
  line: number | null;
  column: number | null;
  code: ImportValidationErrorCode;
  message: string;
  snippet: string;
};

type ImportPreviewCard = {
  blockIndex: number;
  segments: QuizSegment[];
};

type ImportPreviewResponse = {
  parsed: number;
  errors: ImportValidationError[];
  previewCards: ImportPreviewCard[];
};

type ImportConfirmRequest = {
  deckId: string;
  markdown: string;
};
```

### 15.7 Run Types

```ts
type ChallengeResult = "correct" | "wrong" | "completed";

type ChallengeRunSessionStatus = "active" | "completed";

type ChallengeRunCard = {
  sessionCardId: string;
  stateId: string;
  cardId: string;
  segments: QuizSegment[];
  queueIndex: number;
  selectedResult: "correct" | "wrong" | null;
};

type ChallengeRunState = {
  sessionId: string;
  challengeId: string;
  status: ChallengeRunSessionStatus;
  cursor: number;
  cards: ChallengeRunCard[];
};

type SubmitChallengeCardResultRequest = {
  sessionCardId: string;
  finalResult: "correct" | "wrong";
};

type SubmitChallengeCardResultResponse = {
  runState: ChallengeRunState;
  progress: ChallengeProgress;
};

type DeckRunCard = {
  cardId: string;
  segments: QuizSegment[];
};

type DeckRunResponse = {
  deckId: string;
  cursor: number;
  completedAt: string | null;
  cards: DeckRunCard[];
};

type UpdateDeckRunRequest = {
  cursor: number;
};
```

### 15.8 Backup Type

```ts
type ChallengeCardStateExport = {
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

type ChallengeAnswerEventExport = {
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

type ChallengeRunSessionExport = {
  id: string;
  challengeId: string;
  status: ChallengeRunSessionStatus;
  cursor: number;
  queue: ChallengeRunCard[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeckRunStateExport = {
  id: string;
  deckId: string;
  cursor: number;
  completedAt: string | null;
  updatedAt: string;
};

type BackupExport = {
  exportedAt: string;
  decks: DeckResponse[];
  cards: CardResponse[];
  challenges: ChallengeResponse[];
  challengeCardStates: ChallengeCardStateExport[];
  challengeAnswerEvents: ChallengeAnswerEventExport[];
  challengeRunSessions: ChallengeRunSessionExport[];
  deckRunStates: DeckRunStateExport[];
};
```

## 16. Database Model

### 16.1 Remove

Remove account and soft-delete concepts:

- `User`
- `UserIdentity`
- `AuthProvider`
- `userId`
- `email`
- `displayName`
- `archivedAt`
- `ThemePreference`

### 16.2 Keep Or Add

```txt
Deck
- id
- title
- createdAt
- updatedAt

Card
- id
- deckId
- segments Json
- studyViewCount
- lastStudiedAt
- version
- createdAt
- updatedAt

Challenge
- id
- name
- deckId
- status
- answerMode
- reviewIntervalsDays Json
- maxStage
- completedAt
- createdAt
- updatedAt

ChallengeCardState
- id
- challengeId
- cardId
- stage
- challengeViewCount
- dueAt
- lastChallengedAt
- result
- completedAt
- createdAt
- updatedAt

ChallengeAnswerEvent
- id
- challengeId
- stateId
- cardId
- sessionCardId
- finalResult
- previousStage
- nextStage
- answeredAt

ChallengeRunSession
- id
- challengeId
- status
- cursor
- queue Json
- completedAt
- createdAt
- updatedAt

DeckRunState
- id
- deckId
- cursor
- completedAt
- updatedAt

PinSettings
- id
- pinHash
- sessionsInvalidatedAt
- updatedAt
```

### 16.3 Work Units

- `DB-01`: Create deck model.
- `DB-02`: Create card model with JSON segments.
- `DB-03`: Create challenge model with name.
- `DB-04`: Create challenge card state model.
- `DB-05`: Create challenge answer event model.
- `DB-06`: Create challenge run session model.
- `DB-07`: Create deck run state model.
- `DB-08`: Create PIN settings model.
- `DB-09`: Remove user identity assumptions.
- `DB-10`: Remove soft-delete assumptions.
- `DB-11`: Add cascade delete rules where appropriate.

## 17. API Surface

All external API routes are mounted under `/api`. Nginx proxies `/api/*` to the Hono API container without stripping the prefix. Hono should serve the same `/api` base path directly in development and production.

### 17.1 Decks

- `GET /api/decks`
- `POST /api/decks`
- `PATCH /api/decks/:deckId`
- `DELETE /api/decks/:deckId`
- `GET /api/decks/:deckId/cards`
- `PATCH /api/cards/:cardId`

### 17.2 Challenges

- `GET /api/challenges`
- `POST /api/challenges`
- `PATCH /api/challenges/:challengeId`
- `DELETE /api/challenges/:challengeId`
- `POST /api/challenges/:challengeId/update-from-deck`
- `GET /api/challenges/:challengeId/run`
- `POST /api/challenges/:challengeId/results`

### 17.3 Deck Run

- `GET /api/decks/:deckId/run`
- `PATCH /api/decks/:deckId/run`
- `POST /api/decks/:deckId/run/restart`

`GET /api/decks/:deckId/run` returns `DeckRunResponse`.

`PATCH /api/decks/:deckId/run` accepts `UpdateDeckRunRequest`.

### 17.4 Import

- `POST /api/imports/markdown/preview`
- `POST /api/imports/markdown/confirm`

Preview accepts `ImportPreviewRequest`.

Confirm accepts `ImportConfirmRequest` and revalidates markdown server-side before creating cards.

### 17.5 Settings

- `POST /api/auth/setup-pin`
- `POST /api/auth/unlock`
- `POST /api/auth/change-pin`
- `POST /api/auth/lock`
- `GET /api/backup/export`

### 17.6 Work Units

- `API-01`: Implement deck list endpoint.
- `API-02`: Implement deck create endpoint.
- `API-03`: Implement deck update endpoint.
- `API-04`: Implement deck delete endpoint.
- `API-05`: Implement card list endpoint.
- `API-06`: Implement card update endpoint.
- `API-07`: Implement challenge list endpoint.
- `API-08`: Implement challenge create endpoint.
- `API-09`: Implement challenge update endpoint.
- `API-10`: Implement challenge delete endpoint.
- `API-11`: Implement update-from-deck endpoint.
- `API-12`: Implement challenge run state endpoint.
- `API-13`: Implement challenge result submit endpoint.
- `API-14`: Implement deck run state endpoint.
- `API-15`: Implement deck run cursor update endpoint.
- `API-16`: Implement deck run restart endpoint.
- `API-17`: Implement markdown preview endpoint.
- `API-18`: Implement markdown confirm endpoint.
- `API-19`: Implement PIN setup endpoint.
- `API-20`: Implement PIN unlock endpoint.
- `API-21`: Implement PIN change endpoint.
- `API-22`: Implement lock endpoint.
- `API-23`: Implement backup export endpoint.

## 18. Implementation Work Units

These units are intentionally small so review can happen frequently.

### 18.1 Foundation

- `FOUND-01`: Initialize pnpm workspace.
- `FOUND-02`: Add `apps/web`.
- `FOUND-03`: Add `apps/api`.
- `FOUND-04`: Add `packages/shared`.
- `FOUND-05`: Add `packages/db`.
- `FOUND-06`: Add TypeScript configs.
- `FOUND-07`: Add lint and format commands.
- `FOUND-08`: Add basic test command.
- `FOUND-09`: Add PWA shell dependencies.
- `FOUND-10`: Add API server bootstrap.
- `FOUND-11`: Add production environment variable template.

### 18.2 Shared Types And Parser

- `SHARED-01`: Add base shared types.
- `SHARED-02`: Add quiz segment helpers.
- `SHARED-03`: Add markdown split function.
- `SHARED-04`: Add markdown bracket parser.
- `SHARED-05`: Add parser validation errors.
- `SHARED-06`: Add parser tests for valid single answer.
- `SHARED-07`: Add parser tests for valid multiple answers.
- `SHARED-08`: Add parser tests for missing answer.
- `SHARED-09`: Add parser tests for unmatched open bracket.
- `SHARED-10`: Add parser tests for unmatched close bracket.
- `SHARED-11`: Add parser tests for empty answer.

### 18.3 Database And API

- `BACK-01`: Add Prisma schema.
- `BACK-02`: Add SQLite database config.
- `BACK-03`: Add DB client.
- `BACK-04`: Add seed PIN setup.
- `BACK-05`: Add deck create/list repository functions.
- `BACK-06`: Add deck update/delete repository functions.
- `BACK-07`: Add card list/update repository functions.
- `BACK-08`: Add challenge create/list repository functions.
- `BACK-09`: Add challenge update/delete repository functions.
- `BACK-10`: Add challenge update-from-deck repository function.
- `BACK-11`: Add challenge run session repository functions.
- `BACK-12`: Add deck run state repository functions.
- `BACK-13`: Add Hono route structure.
- `BACK-14`: Add auth middleware.
- `BACK-15`: Add PIN setup/unlock routes.
- `BACK-16`: Add PIN change/lock routes.
- `BACK-17`: Add deck list/create routes.
- `BACK-18`: Add deck update/delete routes.
- `BACK-19`: Add card list/update routes.
- `BACK-20`: Add challenge list/create routes.
- `BACK-21`: Add challenge update/delete routes.
- `BACK-22`: Add challenge update-from-deck route.
- `BACK-23`: Add challenge run state route.
- `BACK-24`: Add challenge result submit route.
- `BACK-25`: Add deck run state route.
- `BACK-26`: Add deck cursor update route.
- `BACK-27`: Add deck restart route.
- `BACK-28`: Add markdown preview route.
- `BACK-29`: Add markdown confirm route.
- `BACK-30`: Add backup route.

### 18.4 Frontend Foundation

- `FRONT-01`: Add Vite React app.
- `FRONT-02`: Add routing.
- `FRONT-03`: Add API client.
- `FRONT-04`: Add global styles.
- `FRONT-05`: Add PWA manifest.
- `FRONT-06`: Add service worker config.
- `FRONT-07`: Add mobile safe-area layout.
- `FRONT-08`: Add PIN gate UI.
- `FRONT-09`: Add bottom tabs.

### 18.5 Mobile Screens

- `MOB-01`: Build home page.
- `MOB-02`: Build challenge list page.
- `MOB-03`: Build challenge form.
- `MOB-04`: Build challenge runner route shell.
- `MOB-05`: Render challenge runner prompt state.
- `MOB-06`: Add challenge correct/wrong controls.
- `MOB-07`: Add challenge reveal state.
- `MOB-08`: Add challenge previous/next controls.
- `MOB-09`: Add challenge auto-advance.
- `MOB-10`: Add challenge result correction UI.
- `MOB-11`: Build deck list page.
- `MOB-12`: Build deck detail page.
- `MOB-13`: Build deck form.
- `MOB-14`: Build card edit route shell.
- `MOB-15`: Build card segment edit fields.
- `MOB-16`: Build card edit previews.
- `MOB-17`: Build deck runner route shell.
- `MOB-18`: Render deck runner prompt state.
- `MOB-19`: Add deck show-answer control.
- `MOB-20`: Add deck previous/next controls.
- `MOB-21`: Add deck auto-advance.
- `MOB-22`: Add deck completed/restart state.
- `MOB-23`: Add deck media control handlers.
- `MOB-24`: Build settings page.

### 18.6 Desktop Upload

- `DESK-01`: Build desktop upload shell.
- `DESK-02`: Build markdown upload pane.
- `DESK-03`: Build deck select or create control.
- `DESK-04`: Build validation summary.
- `DESK-05`: Build import error list.
- `DESK-06`: Build import preview list.
- `DESK-07`: Build confirm bar.
- `DESK-08`: Wire upload preview API.
- `DESK-09`: Wire import confirm API.

### 18.7 Verification

- `VERIFY-01`: Unit test quiz parser.
- `VERIFY-02`: Unit test quiz text helpers.
- `VERIFY-03`: API test deck CRUD.
- `VERIFY-04`: API test card update version.
- `VERIFY-05`: API test challenge stage transitions.
- `VERIFY-06`: API test challenge update from deck.
- `VERIFY-07`: API test deck cursor persistence.
- `VERIFY-08`: API test backup export.
- `VERIFY-09`: Browser test PIN gate.
- `VERIFY-10`: Browser test mobile navigation.
- `VERIFY-11`: Browser test challenge run.
- `VERIFY-12`: Browser test deck run.
- `VERIFY-13`: Browser test desktop upload.
- `VERIFY-14`: Browser test PWA install metadata.
- `VERIFY-15`: Build Docker image locally.
- `VERIFY-16`: Run app through local Docker Compose.
- `VERIFY-17`: Verify Nginx routes API and web traffic correctly.

## 19. Deployment

### 19.1 Target Shape

Production runs with Docker and Nginx.

Recommended container layout:

```txt
nginx
  - serves built web assets
  - reverse proxies /api to api container

api
  - runs Hono API server
  - reads/writes SQLite database from mounted volume
```

SQLite must live on a persistent Docker volume or host-mounted directory. The container filesystem should not be the only copy of the database.

### 19.2 Nginx Rules

Nginx should:

- Serve the PWA static files.
- Fall back to `index.html` for client-side routes.
- Proxy `/api/*` to the Hono API container.
- Preserve cookies for PIN session auth.
- Set cache headers carefully for service worker files.
- Allow larger request bodies for markdown upload if needed.

### 19.3 Docker Rules

Docker should:

- Build the web app as static assets.
- Build the API as a production Node process.
- Run Prisma migrations before or during API startup.
- Mount SQLite data to persistent storage.
- Expose only Nginx publicly.

### 19.4 Environment

Production config should include:

- `DATABASE_URL`
- `SESSION_SECRET`
- `PIN_SESSION_TTL_SECONDS`
- `NODE_ENV=production`

The raw PIN must not be stored in environment variables. Only the hashed PIN belongs in the database.

### 19.5 Work Units

- `DEPLOY-01`: Add web production build command.
- `DEPLOY-02`: Add API production build command.
- `DEPLOY-03`: Add API Dockerfile.
- `DEPLOY-04`: Add Nginx Dockerfile or config mount.
- `DEPLOY-05`: Add Nginx config for static web assets.
- `DEPLOY-06`: Add Nginx `/api` reverse proxy.
- `DEPLOY-07`: Add Nginx SPA fallback.
- `DEPLOY-08`: Add service worker cache header rules.
- `DEPLOY-09`: Add Docker Compose production template.
- `DEPLOY-10`: Add persistent SQLite volume.
- `DEPLOY-11`: Add migration startup command.
- `DEPLOY-12`: Add `.env.example` for production.
- `DEPLOY-13`: Verify PIN cookies work behind Nginx.
- `DEPLOY-14`: Verify PWA assets load behind Nginx.

## 20. Open Decisions

These can be decided during implementation planning:

- PIN session duration
- Exact visual style for study answer highlight
- Whether due-less active challenges appear on home below due challenges or in a separate section
- Whether desktop upload source pane supports paste as well as file upload
- How much Media Session API support is reliable on the target phone/browser combination
- Whether production uses one combined Nginx image with static assets copied in, or separate `web-build` and `nginx` stages
- Whether migrations run automatically on API startup or as a manual deployment step

## 21. Acceptance Criteria

The MVP is complete when:

- Mobile and desktop routes are locked by PIN.
- Mobile bottom tabs work.
- Home lists active challenges by due date.
- Challenge run supports correct/wrong, reveal, 5 second auto-advance, previous/next, cursor resume, wrong-card queue movement, and result correction.
- Deck run supports reveal, 10 second auto-advance, previous/next, cursor resume, completed state, and restart.
- Decks can be created, renamed, deleted, and run.
- Cards can be edited on mobile by changing existing segment values.
- Challenges can be created, renamed, deleted, updated from deck, and run.
- Desktop upload can parse markdown, show errors, preview cards, and create cards.
- Backup JSON can be exported.
- Account and social-login types are removed.
- Cards use `QuizSegment[]` as the source model.
- Production can run through Docker and Nginx.
- SQLite data persists across container restarts.
- Nginx serves PWA routes and proxies API routes.
