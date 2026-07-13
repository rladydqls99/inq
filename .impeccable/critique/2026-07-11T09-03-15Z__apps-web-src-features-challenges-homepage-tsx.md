---
target: apps/web/src/features/challenges/HomePage.tsx
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-07-11T09-03-15Z
slug: apps-web-src-features-challenges-homepage-tsx
---
⚠️ DEGRADED: single-context (critique A sub-agent failed: usage limit; A was completed before detector evidence entered synthesis)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 4 | Skeleton, error, completion, and retry states are explicit and timely. |
| 2 | Match System / Real World | 4 | Korean review language and absolute schedules match the learner's mental model. |
| 3 | User Control and Freedom | 3 | Browser navigation and tabs are intact, but secondary rows do not state whether tapping starts a run or opens details. |
| 4 | Consistency and Standards | 4 | System type, semantic tokens, one Lucide set, and standard links/buttons are coherent. |
| 5 | Error Prevention | 3 | The featured CTA is explicit; mixed destinations in the same next-review row pattern can still surprise. |
| 6 | Recognition Rather Than Recall | 4 | Titles, deck names, counts, dates, labels, and active tab remain visible. |
| 7 | Flexibility and Efficiency | 3 | The primary review starts in one tap and keyboard focus works; secondary review actions are less explicit. |
| 8 | Aesthetic and Minimalist Design | 4 | One featured action, rare lime, flat dividers, and no dashboard metrics keep the surface focused. |
| 9 | Error Recovery | 4 | The error explains preservation and exposes a real retry that reissues the request. |
| 10 | Help and Documentation | 3 | First-run guidance is strong; the normal next-review rows rely on information scent rather than an action label. |
| **Total** |  | **36/40** | **Excellent range; a small interaction/state polish backlog remains.** |

## Anti-Patterns Verdict

**LLM assessment:** This does not read as AI-generated. The interface rejects the category-default dashboard, metric hero, repeated bordered cards, huge radii, gradients, glass, decorative motion, and generic motivational copy. The highlighter metaphor is visible once in the due count and once in the active tab, so it retains semantic force.

**Deterministic scan:** `detect.mjs --json apps/web/src/features/challenges/HomePage.tsx` returned `[]` (0 findings). The browser detector loaded from `http://localhost:8400/detect.js` in a mutable fresh Playwright tab and logged `[impeccable] No anti-patterns found.` No false positives were present.

**Visual overlays:** Injection succeeded in the `[Human] inq home critique` tab. Zero overlays were drawn because the live detector found no anti-patterns.

## Overall Impression

The redesign now behaves like a daily review launcher rather than a management dashboard. The first two-second read is `오늘의 복습 → challenge → 복습 시작`; all secondary content recedes into divider rows. The largest remaining opportunity is to make state fidelity and secondary-row outcomes as precise as the primary flow.

## What's Working

1. **Primary hierarchy is unambiguous.** `HomePage.tsx` renders one featured due challenge and a direct `/challenges/:id/run` CTA; the CTA remains visible in the first viewport at 320×568, 390×844, 430×932, and 768×1024.
2. **The visual language earns the brand metaphor.** `styles.css` reserves lime for due count and active destination, uses ink for the CTA, and builds the next list with separators rather than card repetition.
3. **The edge-state system is unusually complete.** Loading, retryable error, no-active-challenge, no-due completion, invalid date, long title, dark appearance, reduced motion, and 200% text are all represented and browser-tested.

## Priority Issues

### [P2] Loading skeleton introduces a surface that the final featured review does not use

- **Why it matters:** The large tinted skeleton container predicts a card, then resolves into a flat composition. That creates a subtle hierarchy/layout-material shift during the first load.
- **Location:** `apps/web/src/styles.css`, `.home-skeleton-feature`.
- **Fix:** Keep the skeleton geometry but remove the container fill and padding so it previews the same flat featured hierarchy.
- **Suggested command:** `$impeccable polish`

### [P2] Secondary review rows have two different outcomes without an explicit action cue

- **Why it matters:** A due row navigates straight to `/run`, while a future row opens `/cards`; both end with the same arrow. A cautious learner cannot predict whether tapping begins a quiz.
- **Location:** `apps/web/src/features/challenges/HomePage.tsx`, `UpcomingReviews` destination selection.
- **Fix:** Use one consistent destination for all secondary rows, or add a concise visible/accessible outcome cue that distinguishes `복습 시작` from `챌린지 보기` without adding dashboard noise.
- **Suggested command:** `$impeccable clarify`

### [P3] The completed state repeats the nearest schedule immediately below

- **Why it matters:** The completion panel names the nearest schedule and the first `다음 복습` row repeats it. This is harmless but slightly weakens the otherwise disciplined information economy.
- **Location:** `CompletedReview` plus `UpcomingReviews` in `HomePage.tsx`.
- **Fix:** Keep the reassurance sentence but shorten it to a general completion message when the same next item is visible below, or leave it as an accepted redundancy for interrupted users.
- **Suggested command:** `$impeccable distill`

## Persona Red Flags

**Jordan (first-timer):** The first action is clear in under five seconds and all navigation icons have labels. The only red flag is the identical arrow used for two secondary outcomes; Jordan may not know a due row begins immediately.

**Sam (accessibility-dependent):** Heading order, link semantics, natural Korean accessible names, 3px focus ring, 48px targets, live loading/error, reduced motion, and 200% focus scrolling all work. No blocking red flag remains. The mixed secondary destinations are still a recognition issue rather than a screen-reader failure.

**Casey (distracted mobile):** The primary CTA stays in the first standard-size viewport, the bottom tabs stay in the thumb zone, and retry is one tap. At 200% text, focusing the CTA scrolls it above the fixed tab bar. No touch-target or interruption red flag remains.

## Cognitive Load

Checklist failures: **0/8 (low cognitive load)**.

- Single focus: one featured review and one dominant CTA.
- Chunking/grouping: featured item plus one secondary list; no decision point exceeds four visible choices beyond the persistent four-tab navigation.
- Hierarchy/one thing at a time: today first, next later.
- Working memory: title, deck, count, and schedule are co-located.
- Progressive disclosure: deck management stays in its own tab.

## Emotional Journey

The arrival is calm and competent rather than celebratory or pressuring. The due count gives a concrete commitment, the ink CTA signals readiness, errors reassure that data is preserved, and completion closes quietly with the next return point. The peak is the one-tap start; the end state avoids streaks and exaggerated celebration.

## Minor Observations

- Two-line clamping is intentional and keeps full text in the accessibility tree; this matches the brief and is not a detector false positive.
- At 768px the 38rem content measure and 720px tab track avoid a stretched phone layout.
- The active lime tab indicator stays well inside the 15% highlighter budget.

## Questions to Consider

- Should every item under `다음 복습` open details, reserving immediate quiz start exclusively for the featured CTA?
- When today is complete, is repeating the exact next time reassuring for interrupted learners or merely redundant?
