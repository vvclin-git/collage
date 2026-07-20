# AI Handoff

## Current focus

Implement GitHub issue #3, "allow layout edit after horizontal/vertical layout selected," on a new branch named `codex/issue-3-edit-generated-layouts`.

Use `gpt-5.6-terra` with medium reasoning and one implementation owner without subagents to minimize cost and latency. Do not commit, push, open a pull request, or mutate the GitHub issue unless the user separately requests it.

## Starting state

- Start from local branch `main` and create `codex/issue-3-edit-generated-layouts` before editing implementation files.
- `README.md` already has an uncommitted user change. Inspect its diff and preserve all unrelated content; do not revert or overwrite it.
- The existing Adjust Layout mode only resizes dividers. It does not yet provide splitting, deletion, equalization, reset, or canvas-aspect controls in the collage editor.
- Current photo offsets are preview pixels and are applied directly during 2048px export, so preview and export transforms are inconsistent.
- Keep all photo handling local to the browser. Do not add uploads, analytics, remote processing, or new dependencies.

## Approved behavior

- Horizontal, Vertical, and Manual layouts must all remain structurally editable after photos are assigned.
- Entering or leaving Adjust Layout must preserve imported photos, tray contents, assignments, and image transforms.
- Splitting an occupied cell retains the original leaf ID, photo, and transform in the first/top-left child; the second child is new and empty.
- Deleting a divider collapses its subtree and keeps the first assigned photo in visual order: left before right or top before bottom. If no photo is assigned, retain the first visual leaf ID.
- Photos displaced by deletion remain imported and return to the tray. IDs and placements outside the affected subtree remain unchanged.
- Layout or canvas-aspect changes preserve each image's visible canvas-relative size and focal position. Images are not automatically cover-refitted, and exposed cell background is allowed.
- Preview and PNG export must use the same normalized placement calculations.

## Ordered implementation work

1. **Layout mutations**
   - Update split-tree helpers so splitting preserves the original leaf as the first child.
   - Make subtree collapse deterministic and expose enough metadata for the store to migrate placements without duplicating layout traversal.
   - Add focused tests for root and nested operations, visual ordering, retained IDs, and unaffected subtrees.

2. **Normalized photo transforms**
   - Replace cell-relative preview-pixel offsets with a canonical canvas-normalized image frame in `PhotoPlacement`.
   - Initial placement still cover-fits its target cell; subsequent layout changes leave its frame unchanged.
   - Update pan, zoom, pinch, rendering, clipping, and photo helpers to use the normalized representation and allow blank cell background.

3. **Store integration**
   - Apply layout and placement migrations atomically in Zustand actions.
   - Preserve valid selections and clear selected cell or divider IDs that no longer exist.
   - Ensure displaced photos reappear in the tray without changing the imported asset list or object-URL lifecycle.

4. **Full Adjust Layout controls**
   - Extend `CollageEditor` Adjust Layout mode with cell splitting, divider selection and dragging, deletion, selected-cell equalization, reset, gap/padding, and preset/custom canvas-aspect controls.
   - Reuse layout helpers and controls rather than duplicating geometry behavior.
   - Disable photo selection, placement, drag, pan, pinch zoom, and zoom controls while layout gestures are active.
   - Confirm destructive reset behavior before returning affected photos to the tray.

5. **Export, tests, and documentation**
   - Route preview and export through shared normalized transform math, including non-default export sizes.
   - Add layout, store, photo, component, and export regression coverage for the approved behavior.
   - Update user-facing README instructions only after carefully preserving its pre-existing modification. Update `CHANGELOG.md` because this is a user-visible enhancement.
   - Overwrite this handoff after implementation with the actual branch state, files changed, decisions, verification results, known risks, and next step.

## Verification

Run the smallest relevant Vitest files first, followed by:

```powershell
pnpm test
pnpm exec tsc -b
pnpm build
git diff --check
```

Perform desktop and mobile browser checks for generated and manual layouts, splitting, divider deletion, aspect changes, intentional blank areas, tray preservation, photo editing, and PNG export. Record the server command, host, and port, and stop the Vite server before finishing.

## Completion report

Report:

- Branch created
- Behavior and files changed
- Focused and full test commands with results
- Type-check and build results
- Desktop and mobile browser checks
- Known risks or remaining coverage gaps
- README, CHANGELOG, and handoff updates
- Confirmation that the pre-existing README change was preserved
- Local server command, port, and stopped status
- Confirmation that no commit, push, PR, or GitHub issue mutation was performed

## Stop conditions

- Stop and ask before discarding or overwriting the existing README change.
- Stop and report if the normalized placement design cannot preserve preview/export equivalence without expanding scope materially.
- Do not weaken TypeScript checks, geometry constraints, browser-local privacy, or object-URL cleanup to make tests pass.
