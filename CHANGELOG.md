# Changelog

## 0.3.0

- Reworked the app into a photo-first workflow: import photos, choose a generated or Manual layout, then fine-tune the collage.
- Added photo-aspect-weighted Horizontal and Vertical layout generation with automatic photo placement.
- Added a Manual aspect-selection step with common presets and validated custom ratios before layout drawing.
- Added Horizontal, Vertical, and Manual rebuild options to the fine-tuning screen.
- Reset stale layout structure and placements whenever the imported photo set changes.
- Added a full Clear action that revokes local photo resources and returns the app to its start state.
- Improved import validation and kept all imported-photo handling local to the browser.

## 0.2.0

- Fixed pinch zoom by tracking native touch pointers on the canvas host instead of relying on Konva stage touch events.
- Added Collage Editor Adjust Layout mode for moving existing dividers after photos are placed.
- Kept photos in the tray after placement so the same image can be reused across cells.
- Added GitHub Pages deployment workflow.
- Added landscape aspect ratios: 5:4 and 4:3.
- Added 9:16 as a portrait counterpart to 16:9.
- Added Equalize Cells for selected layout dividers, making same-direction children share the parent width or height evenly.
- Lowered split gesture sensitivity so divider creation needs a more intentional swipe.
- Added a selected-cell zoom slider and restored pinch zoom for placed photos.
- Set the default layout gap and padding to 16px.
- Scaled editor spacing previews so padding and gap better match the exported image.
- Removed confirmations for divider deletion and returning to layout editing.
- Added image removal from the photo tray.
- Fixed split gestures so horizontal swipes create horizontal dividers and vertical swipes create vertical dividers.

## 0.1.0

- Built the initial client-side photo collage MVP.
- Added layout editor, collage editor, photo tray, per-cell placement, local PNG export, and focused unit tests.
