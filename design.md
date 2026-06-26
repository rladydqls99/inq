# Inq Design Plan

## Product Scope

Inq is a personal PIN-protected quiz PWA. There is no account system. The app is
mostly mobile-first, except quiz upload, which is optimized for desktop.

## Core Screens

### PIN Gate

- Task 1: Check whether a PIN exists.
- Task 2: Show setup form when no PIN exists.
- Task 3: Show unlock form when a PIN exists.
- Task 4: Keep desktop upload and mobile app routes behind the same PIN gate.
- Task 5: Add PIN change from settings.

### Mobile Shell

- Task 1: Provide bottom tabs for Home, Challenges, Decks, and Settings.
- Task 2: Keep upload out of the mobile tab shell.
- Task 3: Make list rows large enough for thumb navigation.
- Task 4: Route list item taps directly to each run screen.

### Home

- Task 1: Load active challenges.
- Task 2: Sort challenges by nearest due date first.
- Task 3: Show compact progress for each challenge.
- Task 4: Start challenge run when a challenge row is tapped.

### Challenges

- Task 1: List challenges.
- Task 2: Create a challenge with title, deck, and repeat intervals.
- Task 3: Edit challenge title.
- Task 4: Delete a challenge.
- Task 5: Update a challenge so newly added deck cards are added to the challenge.
- Task 6: Show progress as completed cards over total challenge cards.

### Challenge Run

- Task 1: Load the persisted run cursor.
- Task 2: Show the current card with answer segments hidden as blanks.
- Task 3: Reveal answers inline after Correct or Wrong is selected.
- Task 4: Highlight revealed answers green for Correct and red for Wrong.
- Task 5: Persist the selected result.
- Task 6: Keep an answered wrong card visible before moving the reordered queue.
- Task 7: Move wrong cards to the back of the queue.
- Task 8: Persist cursor changes when moving next or previous.
- Task 9: Auto-advance 5 seconds after a result is selected.
- Task 10: Allow previous and next navigation.
- Task 11: Allow changing a previously selected result.
- Task 12: Show Completed after moving past the final card.

### Decks

- Task 1: List decks.
- Task 2: Create a deck.
- Task 3: Rename a deck.
- Task 4: Delete a deck.
- Task 5: Open deck run when a deck row is tapped.
- Task 6: Open deck detail for card editing from an explicit edit action.

### Deck Detail And Card Editing

- Task 1: List cards in a deck.
- Task 2: Edit card text segments.
- Task 3: Edit card answer segments.
- Task 4: Delete a card.
- Task 5: Keep card editing mobile-friendly.
- Task 6: Do not support adding arbitrary blank blocks from the editor.

### Deck Run

- Task 1: Load the persisted deck cursor.
- Task 2: Show the current card with answer segments hidden as blanks.
- Task 3: Reveal answers inline after Show answer is tapped.
- Task 4: Highlight revealed answers with color and bold text.
- Task 5: Persist cursor changes on next or previous.
- Task 6: Auto-advance after 10 seconds.
- Task 7: Support next and previous media keys through Media Session API.
- Task 8: Show Completed after moving past the final card.
- Task 9: Support restart.

### Desktop Upload

- Task 1: Select an existing deck before import.
- Task 2: Create a deck inline if needed.
- Task 3: Edit or paste Markdown in the left pane.
- Task 4: Parse quiz cards separated by `---`.
- Task 5: Validate that each card has at least one answer segment.
- Task 6: Validate bracket matching.
- Task 7: Show validation errors beside the Markdown flow.
- Task 8: Show generated card previews in the right pane.
- Task 9: Confirm import to create cards.
- Task 10: Do not store the uploaded Markdown file.
- Task 11: Do not deduplicate cards.

### Settings

- Task 1: Change PIN.
- Task 2: Export backup JSON.

## Data Model

### Keep

- Deck
- Card
- Challenge
- ChallengeCardState
- ChallengeRunSession
- DeckRunState
- PIN settings

### Remove From Earlier Account-Oriented Model

- User
- Team or workspace ownership
- Membership
- OAuth account
- User session ownership
- Shared deck permissions
- Invite or collaboration state

### Answer Mode

- Keep `AnswerMode` only as an extensibility point for future typed or voice
  answering.
- Do not add user-facing answer modes in the first build.

## API Surface

- `GET /api/auth/status`
- `POST /api/auth/setup-pin`
- `POST /api/auth/unlock`
- `POST /api/auth/change-pin`
- `GET /api/decks`
- `POST /api/decks`
- `PATCH /api/decks/:deckId`
- `DELETE /api/decks/:deckId`
- `GET /api/decks/:deckId/cards`
- `PATCH /api/cards/:cardId`
- `DELETE /api/cards/:cardId`
- `GET /api/decks/:deckId/run`
- `PATCH /api/decks/:deckId/run`
- `POST /api/decks/:deckId/run/restart`
- `GET /api/challenges`
- `POST /api/challenges`
- `PATCH /api/challenges/:challengeId`
- `DELETE /api/challenges/:challengeId`
- `POST /api/challenges/:challengeId/update`
- `GET /api/challenges/:challengeId/run`
- `PATCH /api/challenges/:challengeId/run`
- `POST /api/challenges/:challengeId/results`
- `POST /api/import/markdown/preview`
- `POST /api/import/markdown/confirm`
- `GET /api/backup/export`

## Deployment

- Task 1: Build web assets with Vite.
- Task 2: Serve web assets through Nginx.
- Task 3: Reverse proxy `/api` to the API container.
- Task 4: Run API on Node 22.
- Task 5: Run Prisma migrations before API startup.
- Task 6: Store SQLite in a Docker named volume.
- Task 7: Keep local dev API proxy through Vite.
- Task 8: Verify typecheck, unit tests, build, E2E, and Docker image build in CI.

## Future Work

- Task 1: Add typed answer mode.
- Task 2: Add voice recognition answer mode.
- Task 3: Add speech synthesis for hands-free deck run.
- Task 4: Add backup import after the export format stabilizes.
- Task 5: Add richer markdown diagnostics with line and card anchors.
