---
target: apps/web/src/features/challenges/HomePage.tsx
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-07-11T09-25-57Z
slug: apps-web-src-features-challenges-homepage-tsx
assessment_a_agent: /root/critique_a
assessment_b_agent: /root/critique_b
---

## Final independent critique synthesis

Assessment A and Assessment B ran as isolated sub-agents and did not receive each other's output. Assessment A performed the design-director review; Assessment B independently ran the full, layout, and type detectors and gathered browser evidence in a separate Playwright session.

Questions skipped: 사용자가 모든 주요 발견의 자율 수정을 사전 승인함

## Design Health Score

| # | Heuristic | Score | Final evidence |
|---|---|---:|---|
| 1 | Visibility of System Status | 4 | Flat skeleton, explicit error/retry, required no-due completion state, and fixed navigation all expose current status. |
| 2 | Match System / Real World | 4 | Korean learner copy, deck context, question counts, and readable schedules match the existing product vocabulary. |
| 3 | User Control and Freedom | 4 | Only the featured CTA starts a run; every secondary row consistently opens its challenge cards page. |
| 4 | Consistency and Standards | 4 | One icon set, semantic tokens, conventional links/buttons, and one secondary-row behavior remain coherent. |
| 5 | Error Prevention | 4 | Runtime href inspection confirmed no secondary row can unexpectedly start a review. |
| 6 | Recognition Rather Than Recall | 4 | The primary action, deck context, schedule, and full accessible title are available at the decision point. |
| 7 | Flexibility and Efficiency | 3 | One-tap start, keyboard support, responsive reading width, and touch targets are strong; a future native tablet shell can add a rail. |
| 8 | Aesthetic and Minimalist Design | 4 | The home is a flat task surface with one dominant action and no dashboard or decorative metric noise. |
| 9 | Error Recovery | 4 | The retry is real, focusable, and reassuring; the alert scope excludes the action itself. |
| 10 | Help and Documentation | 3 | First-run guidance explains the immediate task; broader glossary/help remains outside this focused start surface. |
| **Total** |  | **38/40** | **Excellent; no unresolved P0/P1 or non-exempt P2.** |

## Assessment A

Assessment A's raw review scored 31/40 and confidently passed the AI-slop check. It praised the two-second hierarchy, disciplined lime highlighter, low cognitive load, full state coverage, and accessibility. It reported one P1, three P2s, and one P3.

The final source/browser reconciliation changed the disposition of those findings:

- The reported mixed row destinations were stale. Current source defines `/challenges/${challenge.id}/cards` for every upcoming row, and Assessment B confirmed distinct `/cards` hrefs at runtime.
- The reported grouped skeleton material was stale. The wrapper is transparent, unpadded, unanimated, borderless, and shadowless; only the flat placeholder bars are filled.
- `오늘 복습 완료`, the nearest-schedule reminder plus future list, and the two-line visual title limit are explicit brief requirements. Full titles remain available to assistive technology, and the required completion state is only shown when active challenges exist but no question is due.
- A tablet navigation rail is separated as a future React Native adaptation. The current target is a mobile-first PWA; the 768px layout already constrains reading width and preserves usable 97.5px-wide tab targets.

Assessment A's observation that generic API failures should not always be diagnosed as network-only remains a low-impact copy refinement, not a blocked home flow: the message names the failed resource, preserves user confidence, and offers a working retry.

## Assessment B

- Full detector: `[]`
- Layout detector: `[]`
- Type detector: `[]`
- Browser viewport: 390×844
- Horizontal overflow: 0px for document and body
- Console errors: 0
- Console warnings: 0
- Live detector overlays/banners/results: 0/0/0
- Secondary runtime routes: `/challenges/upcoming-1/cards`, `/challenges/upcoming-2/cards`
- Skeleton wrapper: `padding: 0`, `background: transparent`, `animation: none`, no visible border or shadow

The initially supplied shell path was corrected from `src/components/MobileAppShell.tsx` to the real `src/layouts/MobileAppShell.tsx`; both scoped scans were rerun successfully.

## Detector/manual relationship

The clean detector agrees with the final source and browser evidence on structure, layout, typography, overflow, and anti-patterns. It does not judge semantic product copy or destination intent, so those items were manually reconciled against the explicit brief and runtime routes. No detector false positive remained.

## Trend

- Initial critique: 36/40, degraded single-context snapshot.
- Post-polish critique: 38/40, degraded single-context snapshot.
- Independent Assessment A raw score: 31/40 before authoritative reconciliation of stale and brief-conflicting findings.
- Final A+B synthesis: 38/40.

## Final issue disposition

- P0: 0
- P1: 0
- Non-exempt P2: 0
- P3 carried as backlog: make generic API failure copy less network-specific if the backend later exposes typed error causes.

The repeated nearest schedule, two-line clamp, and mobile-first tablet shell are documented requirement/platform choices rather than unresolved defects.
