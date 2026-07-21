# AI Handoff

## Current focus

The Adjust Layout touch-capture fix is implemented; complete the post-fix real-browser and physical Pixel acceptance.

## Current state

- Initial Manual layout works with genuine CDP touch input in Chromium 149 and Edge 150: tap selects/deselects cells and swipes split cells.
- Adjust Layout fails with the current behavior in both browsers: tap remains `0 cells selected` and swipe creates no split.
- A browser-only no-capture variant makes Adjust Layout selection and splitting work in both browsers.
- The cause is confirmed: `.stage-host` captured touch pointers during Adjust Layout, retargeting `pointerup` away from the Konva Stage.
- `CollageEditor` now bypasses host capture/tracking in Adjust Layout, clears pinch/pointer/layout state on every mode switch, and drops cancelled layout gestures.

## Files recently changed

- `src/components/CollageEditor.tsx`
- `src/components/CollageEditor.test.tsx`
- `scripts/verify_touch_gestures.mjs`
- `docs/AI_HANDOFF.md`
- `output/playwright/` is untracked diagnostic output; do not commit it unless explicitly requested.

## Important decisions

- Host capture belongs exclusively to Photo Editing; Konva owns Adjust Layout gesture completion.
- Keep Manual layout behavior unchanged.
- Add a real-browser regression before declaring the fix complete; it must use genuine touch events, not mobile viewport plus mouse events.

## Tests run

- Chromium 149 and Edge 150, `412x892`, `isMobile: true`, touch enabled, device scale factor 3, genuine CDP touch events.
- Current and temporary no-capture variants were recorded with screenshots, pointer logs, and Playwright traces in `output/playwright/`.
- TypeScript passed.
- Focused editor tests passed: 2 files, 10 tests.
- Full Vitest passed: 11 files, 86 tests.
- Production build passed with only the existing chunk-size warning; `git diff --check` passed.
- The new verifier initially exposed an assertion-coordinate issue while validating post-split cell selection; its post-fix browser run still needs to be repeated after the verifier adjustment.
- Vite was stopped after verification.

## Known issues

- Physical Pixel 7 Pro acceptance, three-run browser reliability, desktop divider regression, and post-fix Photo Editing pan/pinch checks remain outstanding.

## Implementation task list

### Task 1: Separate touch ownership by interaction mode

- In `src/components/CollageEditor.tsx`, make `onHostPointerDown` return without tracking or capturing when `isAdjustMode` is true.
- Retain host touch capture in Photo Editing so existing pan and two-touch pinch behavior remains unchanged.
- Clear `activePointersRef` and `pinchRef` when switching interaction modes so Photo Editing state cannot leak into Adjust Layout.
- Do not change split geometry, the 64px gesture threshold, placements, store behavior, or Manual layout handling.

Acceptance:

- Adjust Layout touch starts remain owned by the Konva canvas.
- Photo Editing touch starts remain owned by the host pinch tracker.

### Task 2: Handle interrupted layout gestures

- Add Adjust Layout pointer-cancellation cleanup on the Konva Stage.
- Clear `layoutDragStartRef` when a gesture is cancelled; do not select a cell or create a split.
- Ensure a cancelled gesture cannot be completed by a later unrelated pointer event.

Acceptance:

- `pointercancel` leaves selection and topology unchanged.
- The next tap or swipe starts from a clean gesture state.

### Task 3: Add focused component regressions

- Update `src/components/CollageEditor.test.tsx` so its Konva mock exposes the pointer handlers needed by the tests.
- Assert that touch down does not call host `setPointerCapture` in Adjust Layout.
- Assert that Photo Editing still calls `setPointerCapture` for touch.
- Cover mode-switch cleanup and pointer-cancellation behavior.
- Keep existing Manual layout tests unchanged unless shared test infrastructure requires a minimal adjustment.

Acceptance:

- The confirmed pointer-capture regression fails before the fix and passes afterward.
- Existing CollageEditor and LayoutEditor tests remain green.

### Task 4: Add a real-browser touch verifier

- Convert the successful diagnostic flow into a reusable Playwright verifier without adding dependencies.
- Use genuine CDP touch start/move/end/cancel events at `412x892`, `isMobile: true`, touch enabled, and device scale factor 3.
- Run initial Manual and later Adjust Layout in bundled Chromium and installed Edge.
- Verify tap select/deselect, horizontal split, vertical split, cancellation, and three-run reliability.
- Store traces, event logs, and screenshots under `output/playwright/`; keep that directory untracked.

Acceptance:

- Adjust Layout passes the same touch scenarios that already pass in Manual layout.
- No browser-only suppression of `setPointerCapture` is used in the post-fix run.

### Task 5: Run interaction regressions

- Verify desktop mouse selection and both split directions.
- Verify divider selection and dragging.
- Return to Photo Editing and verify single-touch photo pan and two-touch pinch zoom.
- Switch between Photo Editing and Adjust Layout repeatedly and confirm gestures do not compete or retain stale pointers.

Acceptance:

- The layout fix does not regress mouse, divider, pan, or pinch behavior.

### Task 6: Run repository verification

Run in this order:

```powershell
cmd /c .\node_modules\.bin\tsc.CMD -b
cmd /c .\node_modules\.bin\vitest.CMD run src/components/LayoutEditor.test.tsx src/components/CollageEditor.test.tsx
cmd /c .\node_modules\.bin\vitest.CMD run
cmd /c .\node_modules\.bin\vite.CMD build
git diff --check
```

- Record exact results and the existing Vite chunk warning separately from failures.
- Stop Vite and every Playwright-launched browser, then confirm port 4173 is clear.
- Do not stage or commit `output/playwright/`.

### Task 7: Physical-device acceptance

- Ask the user to retest initial Manual and later Adjust Layout on the Pixel 7 Pro in Edge.
- Also test Chrome on the same phone to separate device-level and Edge-specific behavior.
- Verify repeated tap selection, both swipe directions, divider dragging, Photo Editing pan, and pinch zoom.
- Do not declare the issue fully resolved until the physical phone passes.

### Task 8: Refresh the handoff

- Replace this implementation checklist with the actual files changed, final decisions, automated results, browser matrix, physical-device result, known risks, and next step.
- Report any test that was not run without extrapolating from other coverage.

## Scope

Do not commit, push, open a PR, or mutate GitHub issue state unless explicitly requested.
