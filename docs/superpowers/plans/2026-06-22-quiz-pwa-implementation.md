# Quiz PWA Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the personal PIN-protected quiz PWA described in `docs/superpowers/specs/2026-06-22-quiz-pwa-design.md`.

**Architecture:** Use a pnpm monorepo with a Vite React PWA in `apps/web`, a Hono API in `apps/api`, shared types/parser code in `packages/shared`, and Prisma/SQLite in `packages/db`. The app uses segment-based quiz cards, httpOnly PIN sessions, persisted challenge/deck run state, and Docker/Nginx for production.

**Tech Stack:** pnpm workspaces, TypeScript, React, Vite, vite-plugin-pwa, Hono, Prisma, SQLite, Vitest, Playwright, Docker, Nginx.

---

## Source Spec

- Design spec: `docs/superpowers/specs/2026-06-22-quiz-pwa-design.md`

## Execution Rules

- Follow TDD for parser, state transitions, repositories, and API behavior.
- Keep each checked task small enough to review independently.
- Commit after every task group that passes tests.
- Do not introduce signup, social login, soft delete, duplicate detection, backup import, or voice mode implementation.
- Use `/api` as the canonical external API prefix. Nginx must not strip it.
- Keep SQLite data on persistent storage in Docker.

## Planned File Structure

```txt
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── index.ts
│   │   │   ├── env.ts
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── backup.ts
│   │   │   │   ├── cards.ts
│   │   │   │   ├── challenges.ts
│   │   │   │   ├── deckRuns.ts
│   │   │   │   ├── decks.ts
│   │   │   │   └── imports.ts
│   │   │   └── services/
│   │   │       ├── authService.ts
│   │   │       ├── backupService.ts
│   │   │       ├── challengeRunService.ts
│   │   │       ├── challengeService.ts
│   │   │       ├── deckRunService.ts
│   │   │       └── importService.ts
│   │   ├── tests/
│   │   │   ├── auth.test.ts
│   │   │   ├── backup.test.ts
│   │   │   ├── challenges.test.ts
│   │   │   ├── deckRuns.test.ts
│   │   │   ├── decks.test.ts
│   │   │   └── imports.test.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── api/client.ts
│       │   ├── components/
│       │   │   ├── ActionListItem.tsx
│       │   │   ├── AutoAdvanceTimer.tsx
│       │   │   ├── BottomTabNav.tsx
│       │   │   ├── CardPlayer.tsx
│       │   │   ├── PageHeader.tsx
│       │   │   ├── PinGate.tsx
│       │   │   ├── QuizPreview.tsx
│       │   │   └── QuizTextRenderer.tsx
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── challenges/
│       │   │   ├── decks/
│       │   │   ├── runners/
│       │   │   ├── settings/
│       │   │   └── upload/
│       │   ├── layouts/
│       │   │   ├── DesktopUploadLayout.tsx
│       │   │   └── MobileAppShell.tsx
│       │   └── styles.css
│       ├── tests/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/
│   ├── db/
│   │   ├── prisma/schema.prisma
│   │   ├── src/client.ts
│   │   ├── src/repositories/
│   │   ├── src/seed.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/index.ts
│       ├── src/types.ts
│       ├── src/quizSegments.ts
│       ├── src/markdownImport.ts
│       ├── tests/markdownImport.test.ts
│       ├── tests/quizSegments.test.ts
│       ├── package.json
│       └── tsconfig.json
├── deploy/
│   ├── nginx.conf
│   └── docker-compose.prod.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vitest.config.ts
```

---

## Chunk 1: Monorepo Foundation

### Task 1.1: Initialize workspace metadata

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Add root package metadata**

Create root scripts:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "dev": "pnpm --parallel dev"
  }
}
```

- [ ] **Step 2: Add workspace globs**

`pnpm-workspace.yaml` should include:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Add shared TypeScript defaults**

Use strict TypeScript and `moduleResolution: "Bundler"` for app/packages.

- [ ] **Step 4: Add ignored generated files**

Ignore `node_modules`, `.env`, SQLite files, Prisma generated outputs if needed, build outputs, Playwright reports, and Docker local volumes.

- [ ] **Step 5: Verify workspace command**

Run: `pnpm install`

Expected: lockfile is created and install exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example pnpm-lock.yaml
git commit -m "chore: initialize pnpm workspace"
```

### Task 1.2: Add package shells

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/client.ts`

- [ ] **Step 1: Add minimal API package**

Use Hono with `/api/health`.

- [ ] **Step 2: Add minimal web package**

Use React + Vite with placeholder `App`.

- [ ] **Step 3: Add shared package shell**

Export a placeholder constant from `packages/shared/src/index.ts`.

- [ ] **Step 4: Add db package shell**

Export placeholder DB module until Prisma is added.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`

Expected: all packages typecheck.

- [ ] **Step 6: Commit**

```bash
git add apps packages
git commit -m "chore: add workspace package shells"
```

---

## Chunk 2: Shared Types And Markdown Parser

### Task 2.1: Add shared domain types

**Files:**
- Create: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/types.test.ts`

- [ ] **Step 1: Write type smoke test**

Import `QuizSegment`, `AnswerMode`, and representative request/response types.

- [ ] **Step 2: Run test and confirm failure**

Run: `pnpm --filter @inq/shared test`

Expected: fails because types are missing.

- [ ] **Step 3: Add types from spec section 15**

Include:

- `QuizSegment`
- deck/card/challenge types
- auth types
- import types
- run types
- backup types

- [ ] **Step 4: Re-export from index**

`packages/shared/src/index.ts` should export from `types.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @inq/shared test`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add domain types"
```

### Task 2.2: Add quiz segment helpers

**Files:**
- Create: `packages/shared/src/quizSegments.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/quizSegments.test.ts`

- [ ] **Step 1: Test prompt rendering**

Input segments for `훈민정음을 만든 [조선]...` should produce `훈민정음을 만든 ____의 왕은 ____이다.`

- [ ] **Step 2: Test revealed rendering**

Same input should produce `훈민정음을 만든 조선의 왕은 세종대왕이다.`

- [ ] **Step 3: Test answer extraction**

Expected answers: `["조선", "세종대왕"]`.

- [ ] **Step 4: Run tests and confirm failure**

Run: `pnpm --filter @inq/shared test -- quizSegments`

- [ ] **Step 5: Implement helpers**

Add:

```ts
export function getPromptText(segments: QuizSegment[]): string;
export function getRevealedText(segments: QuizSegment[]): string;
export function getAnswers(segments: QuizSegment[]): string[];
export function hasAnswerSegment(segments: QuizSegment[]): boolean;
```

- [ ] **Step 6: Run tests**

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add quiz segment helpers"
```

### Task 2.3: Add markdown import parser

**Files:**
- Create: `packages/shared/src/markdownImport.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/markdownImport.test.ts`

- [ ] **Step 1: Test valid single answer**

Markdown: `훈민정음을 만든 조선의 왕은 [세종대왕]이다.`

Expected: one preview card with one answer segment.

- [ ] **Step 2: Test valid multiple answers**

Markdown: `훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.`

Expected: one preview card with two answer segments.

- [ ] **Step 3: Test separator behavior**

Only lines where trimmed text equals `---` split cards.

- [ ] **Step 4: Test missing answer**

Block without answer should return `missing_answer`.

- [ ] **Step 5: Test unmatched brackets**

Cover `unmatched_open_bracket` and `unmatched_close_bracket`.

- [ ] **Step 6: Test empty and whitespace answers**

`[]` and `[   ]` should return `empty_answer`.

- [ ] **Step 7: Test nested brackets**

`[[답]]` should return `nested_bracket`.

- [ ] **Step 8: Run tests and confirm failure**

Run: `pnpm --filter @inq/shared test -- markdownImport`

- [ ] **Step 9: Implement parser**

Export:

```ts
export function parseMarkdownImport(markdown: string): ImportPreviewResponse;
```

- [ ] **Step 10: Verify tests**

Run: `pnpm --filter @inq/shared test`

Expected: pass.

- [ ] **Step 11: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add markdown quiz parser"
```

---

## Chunk 3: Database And Core Services

### Task 3.1: Add Prisma schema

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Modify: `packages/db/package.json`
- Modify: `packages/db/src/client.ts`

- [ ] **Step 1: Add Prisma dependencies**

Add Prisma client and CLI to `packages/db`.

- [ ] **Step 2: Define models**

Add models from spec section 16:

- `Deck`
- `Card`
- `Challenge`
- `ChallengeCardState`
- `ChallengeAnswerEvent`
- `ChallengeRunSession`
- `DeckRunState`
- `PinSettings`

- [ ] **Step 3: Add SQLite datasource**

Use `DATABASE_URL`.

- [ ] **Step 4: Generate client**

Run: `pnpm --filter @inq/db prisma generate`

Expected: generated client succeeds.

- [ ] **Step 5: Run migration**

Run: `pnpm --filter @inq/db prisma migrate dev --name init`

Expected: migration created.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add initial Prisma schema"
```

### Task 3.2: Add repository tests and repositories

**Files:**
- Create: `packages/db/src/repositories/decks.ts`
- Create: `packages/db/src/repositories/cards.ts`
- Create: `packages/db/src/repositories/challenges.ts`
- Create: `packages/db/src/repositories/runs.ts`
- Create: `packages/db/tests/repositories.test.ts`

- [ ] **Step 1: Test deck CRUD**

Create, list, rename, delete deck.

- [ ] **Step 2: Test card CRUD**

Create card with segments, list by deck, update with version.

- [ ] **Step 3: Test challenge create**

Creating a challenge creates card states for current deck cards.

- [ ] **Step 4: Test update-from-deck**

New deck cards are added only after explicit update.

- [ ] **Step 5: Test deck run state**

Cursor persists and restart clears completed state.

- [ ] **Step 6: Run tests and confirm failure**

Run: `pnpm --filter @inq/db test`

- [ ] **Step 7: Implement repositories**

Keep repository functions focused and avoid API response formatting here.

- [ ] **Step 8: Run tests**

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add packages/db
git commit -m "feat(db): add core repositories"
```

### Task 3.3: Add challenge run transition service

**Files:**
- Create: `apps/api/src/services/challengeRunService.ts`
- Test: `apps/api/tests/challengeRunService.test.ts`

- [ ] **Step 1: Test stage transitions**

For `[3, 5, 10]`:

- stage 0 correct -> stage 1 due +3
- stage 1 correct -> stage 2 due +5
- stage 2 correct -> stage 3 due +10
- stage 3 correct -> completed
- any wrong -> stage 0 due +3

- [ ] **Step 2: Test active queue ignores dueAt**

Wrong card can be requeued in current session even when persisted dueAt is future.

- [ ] **Step 3: Test correction**

Changing previous wrong to correct recalculates current state and records correction event.

- [ ] **Step 4: Run tests and confirm failure**

Run: `pnpm --filter @inq/api test -- challengeRunService`

- [ ] **Step 5: Implement transition service**

Keep date math injectable so tests can freeze `now`.

- [ ] **Step 6: Run tests**

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/services/challengeRunService.ts apps/api/tests/challengeRunService.test.ts
git commit -m "feat(api): add challenge run transition service"
```

---

## Chunk 4: API Routes

### Task 4.1: Add Hono app and auth middleware

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/routes/auth.ts`
- Test: `apps/api/tests/auth.test.ts`

- [ ] **Step 1: Test locked API route**

Unauthenticated `GET /api/decks` should return 401.

- [ ] **Step 2: Test first-time PIN setup**

When no PIN exists, `POST /api/auth/setup-pin` succeeds.

- [ ] **Step 3: Test unlock**

`POST /api/auth/unlock` returns httpOnly cookie and `expiresAt`.

- [ ] **Step 4: Test PIN change invalidates old session**

Old cookie fails after `sessionsInvalidatedAt` updates.

- [ ] **Step 5: Implement middleware and auth routes**

Use signed session cookie with `SESSION_SECRET`.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @inq/api test -- auth`

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add PIN auth routes"
```

### Task 4.2: Add deck, card, and challenge API routes

**Files:**
- Create: `apps/api/src/routes/decks.ts`
- Create: `apps/api/src/routes/cards.ts`
- Create: `apps/api/src/routes/challenges.ts`
- Create: `apps/api/src/services/challengeService.ts`
- Test: `apps/api/tests/decks.test.ts`
- Test: `apps/api/tests/challenges.test.ts`

- [ ] **Step 1: Test deck endpoints**

Cover `GET/POST/PATCH/DELETE /api/decks`.

- [ ] **Step 2: Test card endpoints**

Cover `GET /api/decks/:deckId/cards` and `PATCH /api/cards/:cardId`.

- [ ] **Step 3: Test challenge endpoints**

Cover list/create/update/delete/update-from-deck.

- [ ] **Step 4: Implement routes**

Use shared request/response types and repository functions.

- [ ] **Step 5: Run API tests**

Run: `pnpm --filter @inq/api test`

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): add deck card and challenge routes"
```

### Task 4.3: Add run, import, and backup API routes

**Files:**
- Create: `apps/api/src/routes/deckRuns.ts`
- Create: `apps/api/src/routes/imports.ts`
- Create: `apps/api/src/routes/backup.ts`
- Create: `apps/api/src/services/deckRunService.ts`
- Create: `apps/api/src/services/importService.ts`
- Create: `apps/api/src/services/backupService.ts`
- Test: `apps/api/tests/deckRuns.test.ts`
- Test: `apps/api/tests/imports.test.ts`
- Test: `apps/api/tests/backup.test.ts`

- [ ] **Step 1: Test challenge run endpoints**

`GET /api/challenges/:challengeId/run` returns a persisted session.

`POST /api/challenges/:challengeId/results` returns updated run state and progress.

- [ ] **Step 2: Test deck run endpoints**

Cover get, cursor update, restart.

- [ ] **Step 3: Test import preview**

`POST /api/imports/markdown/preview` returns parser output.

- [ ] **Step 4: Test import confirm revalidates markdown**

Confirm must accept markdown, not trusted preview cards.

- [ ] **Step 5: Test backup export**

Backup includes decks, cards, challenges, challenge states, answer events, challenge sessions, and deck run states. It excludes PIN hash.

- [ ] **Step 6: Implement routes and services**

Mount all routes under `/api`.

- [ ] **Step 7: Run API tests**

Run: `pnpm --filter @inq/api test`

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add run import and backup routes"
```

---

## Chunk 5: Web Foundation And Shared Components

### Task 5.1: Add web app routing and API client

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/layouts/MobileAppShell.tsx`
- Create: `apps/web/src/layouts/DesktopUploadLayout.tsx`
- Create: `apps/web/src/components/BottomTabNav.tsx`
- Create: `apps/web/src/components/PageHeader.tsx`

- [ ] **Step 1: Add routes**

Routes:

- `/`
- `/challenges`
- `/challenges/:challengeId/run`
- `/decks`
- `/decks/:deckId/manage`
- `/decks/:deckId/run`
- `/cards/:cardId/edit`
- `/settings`
- `/upload`

- [ ] **Step 2: Add API client**

Use `fetch` with `credentials: "include"` and `/api` base path.

- [ ] **Step 3: Add mobile shell**

Bottom tabs: Home, Challenges, Decks, Settings.

- [ ] **Step 4: Add desktop upload shell**

Two-column layout for `/upload`.

- [ ] **Step 5: Verify web typecheck**

Run: `pnpm --filter @inq/web typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add routing shells"
```

### Task 5.2: Add quiz display components

**Files:**
- Create: `apps/web/src/components/QuizTextRenderer.tsx`
- Create: `apps/web/src/components/QuizPreview.tsx`
- Create: `apps/web/src/components/CardPlayer.tsx`
- Create: `apps/web/src/components/AutoAdvanceTimer.tsx`
- Test: `apps/web/tests/QuizTextRenderer.test.tsx`
- Test: `apps/web/tests/CardPlayer.test.tsx`

- [ ] **Step 1: Test prompt rendering**

Answer segments render as blanks.

- [ ] **Step 2: Test revealed rendering**

Answer segments render inline, not below the sentence.

- [ ] **Step 3: Test answer tones**

Correct is green, wrong is red, study is highlighted and bold.

- [ ] **Step 4: Test CardPlayer controls**

Previous/next callbacks fire; reveal state changes.

- [ ] **Step 5: Implement components**

Use shared helpers from `@inq/shared`.

- [ ] **Step 6: Run web tests**

Run: `pnpm --filter @inq/web test`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components apps/web/tests
git commit -m "feat(web): add quiz display components"
```

### Task 5.3: Add PIN gate UI

**Files:**
- Create: `apps/web/src/components/PinGate.tsx`
- Create: `apps/web/src/features/auth/PinLockScreen.tsx`
- Create: `apps/web/src/features/auth/PinSetupScreen.tsx`
- Create: `apps/web/src/features/auth/PinChangeForm.tsx`

- [ ] **Step 1: Add unlock flow**

If locked, show PIN input before any route content.

- [ ] **Step 2: Add first-time setup flow**

If API indicates no PIN exists, show setup screen.

- [ ] **Step 3: Add change PIN form**

Requires current PIN, next PIN, confirmation.

- [ ] **Step 4: Verify direct route locking**

Manually open `/upload` and `/decks`; both should show PIN first.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PinGate.tsx apps/web/src/features/auth
git commit -m "feat(web): add PIN gate UI"
```

---

## Chunk 6: Mobile Screens

### Task 6.1: Build home and challenge management

**Files:**
- Create: `apps/web/src/features/challenges/HomePage.tsx`
- Create: `apps/web/src/features/challenges/ChallengeListPage.tsx`
- Create: `apps/web/src/features/challenges/ChallengeForm.tsx`
- Create: `apps/web/src/features/challenges/ChallengeListItem.tsx`
- Create: `apps/web/src/components/ActionListItem.tsx`
- Create: `apps/web/src/components/ProgressSummary.tsx`

- [ ] **Step 1: Build home list**

Show active challenges sorted by nearest due date.

- [ ] **Step 2: Link home item to runner**

Tap challenge row -> `/challenges/:challengeId/run`.

- [ ] **Step 3: Build challenge list**

Row tap -> runner; menu actions separate.

- [ ] **Step 4: Build create/edit form**

Fields: name, deck, intervals default `[3, 5, 10]`.

- [ ] **Step 5: Wire delete and update-from-deck**

Show update result count.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/challenges apps/web/src/components
git commit -m "feat(web): add challenge management screens"
```

### Task 6.2: Build challenge runner

**Files:**
- Create: `apps/web/src/features/runners/ChallengeRunnerPage.tsx`

- [ ] **Step 1: Load run state**

Call `GET /api/challenges/:challengeId/run`.

- [ ] **Step 2: Render prompt**

Use `CardPlayer` and `QuizTextRenderer`.

- [ ] **Step 3: Add correct/wrong buttons**

Before selection, answer remains hidden.

- [ ] **Step 4: Reveal inline answer**

Correct -> green answer segments. Wrong -> red answer segments.

- [ ] **Step 5: Add 5 second auto-advance**

Show `Next` after selection and auto-advance after 5 seconds.

- [ ] **Step 6: Add previous/next**

Previous card can edit selected result.

- [ ] **Step 7: Persist result changes**

Call `POST /api/challenges/:challengeId/results`.

- [ ] **Step 8: Add completed state**

Show completion screen when run is complete.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/runners/ChallengeRunnerPage.tsx
git commit -m "feat(web): add challenge runner"
```

### Task 6.3: Build deck management and card edit

**Files:**
- Create: `apps/web/src/features/decks/DeckListPage.tsx`
- Create: `apps/web/src/features/decks/DeckDetailPage.tsx`
- Create: `apps/web/src/features/decks/DeckForm.tsx`
- Create: `apps/web/src/features/decks/CardSegmentEditForm.tsx`

- [ ] **Step 1: Build deck list**

Row tap -> `/decks/:deckId/run`.

- [ ] **Step 2: Add row action menu**

Actions: rename, delete, manage cards.

- [ ] **Step 3: Build deck detail**

Opened through `Manage Cards`; list cards.

- [ ] **Step 4: Build card edit shell**

Mobile-only route for card editing.

- [ ] **Step 5: Render segment fields**

Allow editing existing `value` only. No add/delete/reorder/type change.

- [ ] **Step 6: Add prompt and revealed preview**

Use `QuizPreview`.

- [ ] **Step 7: Save with version**

Call `PATCH /api/cards/:cardId`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/decks
git commit -m "feat(web): add deck management and card edit"
```

### Task 6.4: Build deck runner and settings

**Files:**
- Create: `apps/web/src/features/runners/DeckRunnerPage.tsx`
- Create: `apps/web/src/features/runners/MediaSessionController.ts`
- Create: `apps/web/src/features/settings/SettingsPage.tsx`
- Create: `apps/web/src/features/settings/BackupExportButton.tsx`

- [ ] **Step 1: Load deck run state**

Call `GET /api/decks/:deckId/run`.

- [ ] **Step 2: Render prompt and answer reveal**

`Show Answer` reveals inline answer with study highlight.

- [ ] **Step 3: Add 10 second auto-advance**

If user does nothing, move to next after 10 seconds.

- [ ] **Step 4: Add previous/next**

Persist cursor through `PATCH /api/decks/:deckId/run`.

- [ ] **Step 5: Add completed/restart state**

Last card stops. Restart calls `/restart`.

- [ ] **Step 6: Add Media Session handlers**

Support previous/next when available; keep screen buttons as fallback.

- [ ] **Step 7: Build settings**

Include PIN change and backup export.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/runners apps/web/src/features/settings
git commit -m "feat(web): add deck runner and settings"
```

---

## Chunk 7: Desktop Upload

### Task 7.1: Build desktop upload UI

**Files:**
- Create: `apps/web/src/features/upload/UploadPage.tsx`
- Create: `apps/web/src/features/upload/MarkdownUploadPane.tsx`
- Create: `apps/web/src/features/upload/DeckSelectOrCreate.tsx`
- Create: `apps/web/src/features/upload/ImportValidationSummary.tsx`
- Create: `apps/web/src/features/upload/ImportErrorList.tsx`
- Create: `apps/web/src/features/upload/ImportPreviewList.tsx`
- Create: `apps/web/src/features/upload/ImportConfirmBar.tsx`

- [ ] **Step 1: Build two-column layout**

Left: markdown source. Right: validation and preview.

- [ ] **Step 2: Add deck select/create**

Create deck inline if needed.

- [ ] **Step 3: Add markdown file picker**

Read markdown as browser text. Do not persist file.

- [ ] **Step 4: Wire preview API**

Call `POST /api/imports/markdown/preview`.

- [ ] **Step 5: Render validation result**

Show block, line, column, error code, message, snippet.

- [ ] **Step 6: Render preview cards**

Show prompt text, revealed text, answer count.

- [ ] **Step 7: Disable confirm with errors**

Create button only enabled if no errors and deck selected.

- [ ] **Step 8: Confirm import**

Call `POST /api/imports/markdown/confirm` with deckId and markdown.

- [ ] **Step 9: Clear markdown after successful create**

Reset upload state.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/features/upload
git commit -m "feat(web): add desktop markdown upload"
```

---

## Chunk 8: PWA, Browser Verification, And Deployment

### Task 8.1: Add PWA config

**Files:**
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/`

- [ ] **Step 1: Add vite-plugin-pwa**

Configure manifest and service worker.

- [ ] **Step 2: Add app metadata**

Name, short name, theme color, display mode.

- [ ] **Step 3: Verify production build**

Run: `pnpm --filter @inq/web build`

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add PWA configuration"
```

### Task 8.2: Add browser tests

**Files:**
- Create: `apps/web/e2e/pin-gate.spec.ts`
- Create: `apps/web/e2e/navigation.spec.ts`
- Create: `apps/web/e2e/challenge-run.spec.ts`
- Create: `apps/web/e2e/deck-run.spec.ts`
- Create: `apps/web/e2e/upload.spec.ts`
- Create: `apps/web/playwright.config.ts`

- [ ] **Step 1: Test PIN gate**

Direct deep links show PIN before content.

- [ ] **Step 2: Test mobile navigation**

Bottom tabs route correctly.

- [ ] **Step 3: Test challenge run**

Correct/wrong reveal inline answers and auto-advance.

- [ ] **Step 4: Test deck run**

Show answer, next, completed/restart state.

- [ ] **Step 5: Test desktop upload**

Valid markdown previews and confirms; invalid markdown shows errors.

- [ ] **Step 6: Run browser tests**

Run: `pnpm --filter @inq/web test:e2e`

- [ ] **Step 7: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts
git commit -m "test(web): add browser coverage"
```

### Task 8.3: Add Docker and Nginx deployment

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `deploy/nginx.conf`
- Create: `deploy/docker-compose.prod.yml`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Add API Dockerfile**

Build API and run production server.

- [ ] **Step 2: Add Nginx config**

Rules:

- serve web static assets
- fallback to `index.html`
- proxy `/api/*` without stripping prefix
- preserve cookies
- service worker cache headers

- [ ] **Step 3: Add Docker Compose production file**

Services:

- `nginx`
- `api`
- persistent SQLite volume

- [ ] **Step 4: Add migration startup command**

Run Prisma migration before API starts or through explicit compose command.

- [ ] **Step 5: Add environment template**

Include `DATABASE_URL`, `SESSION_SECRET`, `PIN_SESSION_TTL_SECONDS`, `NODE_ENV`.

- [ ] **Step 6: Build containers**

Run: `docker compose -f deploy/docker-compose.prod.yml build`

Expected: exits 0.

- [ ] **Step 7: Run locally through Nginx**

Run: `docker compose -f deploy/docker-compose.prod.yml up`

Expected: Nginx serves web and proxies `/api`.

- [ ] **Step 8: Verify persistence**

Create a deck, restart containers, confirm deck remains.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Dockerfile deploy .env.example package.json
git commit -m "chore: add Docker and Nginx deployment"
```

---

## Final Verification

- [ ] Run: `pnpm install`
- [ ] Run: `pnpm typecheck`
- [ ] Run: `pnpm test`
- [ ] Run: `pnpm build`
- [ ] Run: `pnpm --filter @inq/web test:e2e`
- [ ] Run: `docker compose -f deploy/docker-compose.prod.yml build`
- [ ] Run: `docker compose -f deploy/docker-compose.prod.yml up`
- [ ] Manually verify PIN gate on `/`, `/upload`, `/decks`, and `/challenges`.
- [ ] Manually verify mobile viewport for Home, Challenges, Decks, Settings.
- [ ] Manually verify desktop upload layout.
- [ ] Manually verify SQLite data survives container restart.

## Review Checkpoints

Review after each chunk:

1. Chunk 1: repo can install, typecheck, and start placeholder apps.
2. Chunk 2: parser and shared types are tested.
3. Chunk 3: DB schema and core state transitions are tested.
4. Chunk 4: API behavior is tested behind `/api`.
5. Chunk 5: core web shell and shared components are tested.
6. Chunk 6: mobile workflows are usable.
7. Chunk 7: desktop upload is usable.
8. Chunk 8: PWA and Docker/Nginx deployment work.

## Known Deferrals

- Voice answer mode implementation
- Backup import
- Duplicate detection
- Card search/filter
- Escaped bracket markdown syntax
- Multi-user support
