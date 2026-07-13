# Mobile home craft direction

## Locked palette

- Strategy: restrained product palette.
- Canvas: `#FCFCFC`; surface: `#F4F7F3`; ink: `#0D160F`; soft ink: `#3D463F`; line: `#D4DAD3`.
- Semantic highlighter: `#CAFF19` with pressed/contrast companion `#9ED800`; lime stays below roughly 15% of the screen.
- Primary action remains solid ink. Lime marks the due count, current destination, and completed-review confirmation only.
- Artifact: `inq-home-palette.png`.

## Mock selection

- Selected: Direction A, the editorial start sheet.
- Reason: it wins the two-second squint test, keeps one unequivocal start action in the first viewport, and lets future reviews settle into quiet divider rows.
- Direction B was rejected because its decorative progress track implies progress data the home brief does not need.
- Direction C was rejected because the agenda timeline adds scanning and time precision that the API does not consistently provide.
- Artifact: `inq-home-structure-mocks.png`.

## Fidelity inventory

Carry into code:

- compact top-level home context;
- a dominant `오늘의 복습` section with a two-line title, deck name, due count, and full-width ink CTA;
- one rare highlighter mark around the due count;
- `다음 복습` as flat divider rows;
- a safe-area-aware four-tab mobile navigation.

Do not literalize:

- phone frame, status bar, bell icon, or mock device chrome;
- mock progress bars or invented completion data;
- rasterized UI text or icons;
- exact mock dates where the API provides no valid date;
- any photographic or generated raster asset in the production UI.
