# AI Handoff

## Current focus

Complete the photo-first workflow milestone on branch `codex/new_workflow`.

## Current state

The implementation now starts with photo import, presents photo-aspect-weighted Horizontal and Vertical generation plus a Manual path, and continues to collage fine-tuning. Manual asks for a preset or validated custom canvas aspect before layout drawing. Changing the imported photo set invalidates stale layout and placement state; Clear releases imported-photo object URLs and resets the app to Start.

## Files recently changed

- `src/App.tsx`, `src/App.test.tsx`
- `src/types.ts`
- `src/store/useCollageStore.ts`, `src/store/useCollageStore.test.ts`
- `src/lib/layout.ts`, `src/lib/layout.test.ts`
- `src/lib/photoAssets.ts`, `src/lib/photoAssets.test.ts`
- `src/components/WorkflowStartScreen.tsx`
- `src/components/ChooseLayoutScreen.tsx`
- `src/components/EmptyCanvasPreview.tsx`
- `src/components/LayoutOptionCard.tsx`
- `src/components/ManualAspectPanel.tsx`
- `src/components/AdvancedSpacingControls.tsx`
- `src/components/LayoutEditor.tsx`, `src/components/LayoutEditor.test.tsx`
- `src/components/CollageEditor.tsx`, `src/components/CollageEditor.test.tsx`
- `src/components/Toolbar.tsx`, `src/components/Toolbar.test.tsx`
- `src/components/WorkflowScreens.test.tsx`
- `src/styles.css`
- `README.md`, `CHANGELOG.md`, `docs/AI_HANDOFF.md`

## Important decisions

- Imported photos are the input to layout selection; layout options stay disabled until photos exist.
- Generated Horizontal and Vertical layouts use imported-photo aspect ratios for cell weights and automatically map photos to leaves in import order.
- Manual layout creation owns explicit canvas-aspect selection and retains the existing split-tree editing model.
- Any photo-set addition or removal clears layout structure and placements before returning to layout selection.
- Clear is a full reset to Start and revokes unique browser object URLs; imports remain local-only.

## Tests run

- `pnpm test`: 11 files, 71 tests passed.
- `pnpm exec tsc -b`: passed.
- `pnpm build`: passed; Vite reported a non-blocking 545.93 kB JavaScript chunk warning.
- `git diff --check`: no whitespace errors; only expected CRLF conversion notices.
- Browser QA was blocked because the QA agent found zero available in-app browser instances.
- The attempted QA server (`vite --host 127.0.0.1 --port 4173 --strictPort`, PID 1689100) was stopped and port 4173 was confirmed closed.

## Known issues

- The production JavaScript chunk is 545.93 kB, above Vite's 500 kB warning threshold.
- Placement pan offsets are stored as preview pixels but applied directly to the 2048px export. A correct fix needs normalized placement state across preview and export layers.
- Non-default export `options.size` values do not scale spacing; the normal UI uses the default 2048px export size.

## Next recommended step

Perform desktop and mobile browser checks of import, generated layouts, Manual aspect selection, fine-tuning, photo-set invalidation, Clear, and PNG export when browser capability is available.

## Suggested scope for the next thread

Browser QA and any narrowly scoped fixes found there. Keep chunk splitting and preview/export pan-offset scaling as separate follow-up work unless explicitly requested.
