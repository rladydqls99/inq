---
target: apps/web/src/features/challenges/HomePage.tsx
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-07-11T09-10-45Z
slug: apps-web-src-features-challenges-homepage-tsx
---
⚠️ DEGRADED: single-context (critique A sub-agent failed: usage limit; final A was completed before detector evidence entered synthesis)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 4 | Flat structural skeleton, explicit completion/error, and real retry cover all async states. |
| 2 | Match System / Real World | 4 | Korean learner language, deck context, counts, and readable schedules match the task. |
| 3 | User Control and Freedom | 4 | Browser history, labeled tabs, predictable secondary detail links, and direct featured start are intact. |
| 4 | Consistency and Standards | 4 | Semantic tokens, one icon system, one row behavior, and platform-standard links/buttons are coherent. |
| 5 | Error Prevention | 4 | Only the explicit featured CTA starts a run; secondary rows consistently open challenge details. |
| 6 | Recognition Rather Than Recall | 4 | All required context and action labels stay visible or naturally named for assistive tech. |
| 7 | Flexibility and Efficiency | 3 | One-tap start and keyboard operation are excellent; the intentionally minimal home has no expert accelerators beyond direct routes. |
| 8 | Aesthetic and Minimalist Design | 4 | Every visible element supports today's review or the next return point. |
| 9 | Error Recovery | 4 | Specific reassurance, isolated alert message, and a 48px retry provide complete recovery. |
| 10 | Help and Documentation | 3 | First-run guidance is task-focused; broader help correctly remains outside this start surface. |
| **Total** |  | **38/40** | **Excellent; no unresolved P0/P1/P2.** |

## Anti-Patterns Verdict

**LLM assessment:** The final home does not look AI-generated. It is a flat task surface with one primary action, not a metric hero or card dashboard. Lime remains scarce and semantic; typography is platform-native; motion is state-only.

**Deterministic scan:** Layout scope `[]`, type scope `[]`, and full detector `[]` on the final home/shell target. Browser detector injection previously succeeded and reported no anti-patterns; final code changes removed material drift and did not introduce new detector findings.

## Overall Impression

The interface now lands the intended product promise immediately: the learner sees what to review and starts it in one tap. Secondary reviews are calm, predictable detail links, and every edge state uses the same visual system.

## What's Working

1. The featured review and ink CTA dominate every required portrait viewport and 844×390 landscape without dashboard noise.
2. Loading resolves from a flat skeleton into the same flat hierarchy, eliminating material/layout expectation drift.
3. Accessibility is designed into structure: semantic headings/regions, full long-title names, natural deck/date sentences, strong focus, 200% reflow, safe-area focus scrolling, and reduced motion.

## Priority Issues

No P0, P1, or non-exempt P2 findings remain.

The repeated nearest schedule in the completion panel and first future row is a deliberate requirement-driven exception: one sentence confirms the next return point, while the list must still expose multiple future reviews. It is not counted as an unresolved defect.

## Persona Red Flags

- **Jordan (first-timer):** none; first action and first-run path are explicit.
- **Sam (accessibility-dependent):** none; keyboard, screen-reader names, focus order, contrast, 200% text, and state announcements remain complete.
- **Casey (distracted mobile):** none; CTA stays discoverable, touch targets exceed 48px, retry is direct, and the tab bar respects fixed/safe-area clearance.

## Cognitive Load

Checklist failures: **0/8**. One primary action, one secondary group, four stable destinations, co-located context, and no working-memory bridge.

## Emotional Journey

Arrival is quiet and confident, the due count makes effort concrete, the CTA creates a clean peak, errors reassure without humor, and completion closes with the next return point rather than competitive metrics.

## Minor Observations

- The two-line visual clamp is intentional; full titles remain in the accessibility tree and expand under sufficiently narrow browser zoom.
- `content-visibility: auto` preserves the complete required list while reducing unusual off-screen paint cost.

## Questions to Consider

No product-direction question remains for this scope.
