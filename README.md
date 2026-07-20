# Photo Collage

Photo Collage is a browser-based editor for creating custom photo collages and exporting them as PNG files. It is built with React, TypeScript, Vite, React-Konva, and Zustand, and processes photos entirely on your device.

## What you can do

- Import JPG, PNG, and WebP photos from your device.
- Generate a horizontal or vertical collage whose cell proportions are based on the imported photos.
- Build a custom layout with swipe-based horizontal and vertical dividers.
- Choose a preset canvas aspect ratio or enter a custom ratio from 1:10 to 10:1.
- Fine-tune cell dividers, gap, padding, photo placement, pan, and zoom.
- Reuse imported photos, remove individual photos, or clear the entire project.
- Export a timestamped PNG locally.

## Create a collage

1. **Import photos.** Start by choosing one or more JPG, PNG, or WebP files. The app keeps them in the photo tray and does not upload them.
2. **Choose a layout.**
   - **Horizontal** places the photos left to right.
   - **Vertical** places the photos top to bottom.
   - **Manual** lets you choose the canvas aspect before drawing your own layout.
3. **Fine-tune the result.** Select a cell and choose a tray photo, or drag a photo into the cell. Drag a placed photo to pan it; use pinch zoom or the zoom control to scale it.
4. **Adjust the structure when needed.** After any layout is open in the collage editor, switch to **Adjust Layout** to select or drag dividers, swipe a cell to split it, select cells for equalization, delete the selected divider, reset the structure, change the canvas aspect, and edit padding or gap. Compact contextual controls appear inline below the canvas; **Photo Editing** exits the mode.
5. **Add or remove photos.** Use the **+** tile in the Photo Tray at any viewport width to append photos without rebuilding the collage. Removing one photo preserves the layout and clears only its placements; **Clear All** is the full reset.
6. **Export.** Select **Export PNG** in the header on desktop/tablet, or **Export** on mobile, to download the finished collage.

## Layout and editing notes

Generated Horizontal and Vertical layouts automatically size cells from the aspect ratios of the imported photos and place those photos in import order. These choices are available during initial layout selection; the editing stage uses Adjust Layout for structural changes.

Manual layouts begin with one empty canvas. Choose one of these presets: 1:1, 4:5, 5:4, 3:4, 4:3, 16:9, or 9:16, or provide a valid custom width-to-height ratio. Create, resize, or delete dividers before selecting **Next** to continue to the collage editor.

In **Photo Editing** mode, you can place, pan, and zoom photos. In **Adjust Layout** mode, photo selection, tray assignment, dragging, pinch zoom, and zoom controls are disabled so divider gestures take precedence. Changing a divider or canvas aspect preserves each photo's normalized size and focal position; exposed cell background remains visible until you adjust that photo again.

Use the **Padding/Gap** control in the collage editor to tune spacing. Spacing changes preserve each photo's normalized image frame and do not silently refit it to the resized cell.

## Photos, reset, and privacy

Imported photos are held as browser object URLs for the current session only. They are never uploaded or processed remotely. Adding photos during editing preserves the current workflow, layout, selections, and placements. Removing a photo clears every placement using it while preserving unrelated cells and revokes its object URL only when no remaining asset shares it. **Clear All** returns the app to its start screen and releases the local photo resources.

## Run locally

Install dependencies and start Vite:

```bash
pnpm install
pnpm dev
```

This starts the development server at `http://127.0.0.1:5173` by default. On Windows, you can instead double-click `start-collage.cmd`; it starts the app on port 4173 and opens `http://127.0.0.1:4173/collage/`.

## Verify changes

```bash
pnpm test
pnpm build
```

## Deployment

GitHub Pages deploys from `main` through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Vite base path is `/collage/`; the published app is available at [vvclin-git.github.io/collage](https://vvclin-git.github.io/collage/).
