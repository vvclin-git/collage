# AI Handoff

## Current focus

GitHub issue #3 is implemented on `codex/issue-3-edit-generated-layouts`. No commit, push, PR, or GitHub issue mutation was performed.

## Current state

- Splitting keeps the original leaf ID as the first visual child and its placement.
- Divider deletion collapses the selected subtree deterministically, retains the first assigned visual leaf (or first visual leaf when empty), and removes displaced placements while preserving imported assets.
- `PhotoPlacement` now writes a canvas-normalized image frame (`imageWidth`, `zoom`, `centerX`, `centerY`). Preview and export share `getPlacementTransform`; layout, aspect, spacing, and divider edits do not rewrite frames, and blank cell background is allowed.
- Generated and manual layouts share the full Adjust Layout path in `CollageEditor`: divider selection/dragging, cell splitting, cell selection, equalization, delete, reset confirmation, aspect controls, and spacing controls. Photo gestures and tray assignment are disabled in that mode.

## Files recently changed

- `src/types.ts`
- `src/lib/layout.ts`, `src/lib/photos.ts`, `src/lib/export.ts`
- `src/store/useCollageStore.ts`
- `src/components/CollageEditor.tsx`
- `src/lib/layout.test.ts`, `src/lib/photos.test.ts`, `src/lib/export.test.ts`
- `src/store/useCollageStore.test.ts`, `src/components/CollageEditor.test.tsx`
- `README.md`, `CHANGELOG.md`

## Important decisions

Canonical frames use the export-sized aspect canvas as their coordinate space. Initial placement cover-fits the target cell, then stores image width relative to the canvas and center coordinates relative to the canvas. Legacy placement fields remain optional only to keep old in-memory test snapshots readable; new state writes canonical fields.

## Tests run

- Focused Vitest: 5 files, 61 tests passed.
- Full direct Vitest: 11 files, 81 tests passed.
- Direct `tsc -b`: passed.
- Direct Vite production build: passed; Vite emitted only the existing chunk-size warning.
- `git diff --check`: passed.
- Vite smoke server: `vite --host 127.0.0.1 --port 4173`; `/collage/` returned HTTP 200; server stopped.
- Playwright Chromium QA: desktop and 390px mobile sessions passed. Verified Adjust Layout controls, aspect selection, disabled tray assignment, cell selection, split gesture, and no mobile horizontal overflow. Vite and Chromium were stopped.
- Playwright export check: PNG download completed successfully with a timestamped filename.

## Known issues and verification remaining

- `pnpm test`, `pnpm exec tsc -b`, and `pnpm build` cannot run through pnpm after the reset because pnpm attempts registry metadata repair and aborts without a TTY. Equivalent local binaries pass.
- Playwright was added as a dev dependency for local browser QA (`package.json`, `pnpm-lock.yaml`).
- Legacy placement fields remain optional for old in-memory snapshots; new application writes use normalized fields exclusively.

## Next recommended step

Install or expose the repository’s browser automation dependency, then exercise generated/manual layouts, splitting, deletion, aspect changes, blank areas, tray preservation, photo editing, and PNG export at desktop and mobile widths.
