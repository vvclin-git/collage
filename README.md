# Photo Collage

Pure client-side photo collage editor built with React, TypeScript, Vite, React-Konva, and Zustand.

## Features

- Draw custom collage layouts with swipe-based horizontal and vertical split gestures.
- Adjust divider ratios, equalize same-parent cell sizes, gap, padding, and portrait or landscape aspect ratios.
- Import JPG, PNG, or WebP images without uploading them to a server.
- Place images from the tray into cells, pan them inside each cell, and scale with pinch zoom or the external zoom slider.
- Remove unused images from the tray.
- Export the collage as a local PNG.

## Development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm test
pnpm build
```

The app keeps imported photos in the browser and exports PNG files locally.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`. The Vite base path is `/collage/`, so the published app URL is:

https://vvclin-git.github.io/collage/
