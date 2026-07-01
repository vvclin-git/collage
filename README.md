# Photo Collage

Pure client-side photo collage editor built with React, TypeScript, Vite, React-Konva, and Zustand.

## Features

- Build custom collage layouts with swipe-based horizontal and vertical split gestures.
- Adjust divider ratios, select multiple cells, and equalize their widths or heights when the layout topology allows it.
- Choose a preset aspect ratio or apply a custom width-to-height ratio from 1:10 through 10:1.
- Start new layouts with 24px gap and 16px padding, then tune both values in the collage editor.
- Import JPG, PNG, or WebP images without uploading them to a server.
- Place images from the tray into cells, pan them inside each cell, and scale with touch pinch zoom or the external zoom slider.
- Toggle Adjust Layout in the collage editor to move existing dividers after placing photos without changing photo transforms.
- Reuse the same imported photo across multiple cells.
- Remove an individual tray image immediately, or use Clear All with confirmation to remove every imported image and placement.
- Export the collage as a local PNG with a timestamped filename such as `collage-20260701-090807-006.png`.

## Interaction Model

- Layout Editor is for creating, deleting, and resizing dividers before photo placement. Tap or click cells to select them, then use Equalize Widths or Equalize Heights for a multi-cell selection.
- The Aspect control includes common presets and a Custom option. Enter positive width and height values, then select Apply.
- Collage Editor Photo Editing mode is for selecting cells, placing photos, panning photos, pinch zooming, slider zooming, and exporting.
- Gap and Padding sliders remain available in the collage editor; spacing changes preserve photo zoom and keep photo offsets within their resized cells.
- Collage Editor Adjust Layout mode is for moving existing dividers after photos are placed. Photo pan, pinch zoom, zoom slider, and tray placement are disabled in this mode.
- Divider changes in Adjust Layout mode do not alter photo scale or offset. If a resized cell exposes empty room, the background remains visible until the user switches back to Photo Editing and adjusts the photo manually.

## Development

On Windows, double-click `start-collage.cmd` to start the local development server and open the app in your browser.

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
