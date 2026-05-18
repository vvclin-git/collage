# Photo Collage

Pure client-side photo collage editor built with React, TypeScript, Vite, React-Konva, and Zustand.

## Features

- Build custom collage layouts with swipe-based horizontal and vertical split gestures.
- Adjust divider ratios, equalize same-parent cell sizes, gap, padding, and portrait or landscape aspect ratios.
- Start new layouts with 16px gap and 16px padding.
- Import JPG, PNG, or WebP images without uploading them to a server.
- Place images from the tray into cells, pan them inside each cell, and scale with touch pinch zoom or the external zoom slider.
- Toggle Adjust Layout in the collage editor to move existing dividers after placing photos without changing photo transforms.
- Reuse the same imported photo across multiple cells.
- Remove unused images from the tray.
- Export the collage as a local PNG.

## Interaction Model

- Layout Editor is for creating, deleting, equalizing, and resizing dividers before photo placement.
- Collage Editor Photo Editing mode is for selecting cells, placing photos, panning photos, pinch zooming, slider zooming, and exporting.
- Collage Editor Adjust Layout mode is for moving existing dividers after photos are placed. Photo pan, pinch zoom, zoom slider, and tray placement are disabled in this mode.
- Divider changes in Adjust Layout mode do not alter photo scale or offset. If a resized cell exposes empty room, the background remains visible until the user switches back to Photo Editing and adjusts the photo manually.

## Development

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://127.0.0.1:5173` by default.

## Verification

```bash
pnpm test
pnpm build
```

The app keeps imported photos in the browser and exports PNG files locally.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`. The Vite base path is `/collage/`, so the published app URL is:

https://vvclin-git.github.io/collage/
