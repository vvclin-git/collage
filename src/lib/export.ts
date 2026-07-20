import type { AppState, PhotoAsset, Rect } from "../types";
import { aspectRatioValue, getRenderableLeafRects } from "./layout";
import { getPlacementTransform } from "./photos";

export type ExportOptions = {
  size?: number;
  fileName?: string;
};

let lastExportTimestamp = -1;
let exportSequence = 0;

export function getExportRect(
  aspectRatio: AppState["layout"]["aspectRatio"],
  size: number,
): Rect {
  const ratio = aspectRatioValue(aspectRatio);

  if (ratio >= 1) {
    return { x: 0, y: 0, width: size, height: Math.round(size / ratio) };
  }

  return { x: 0, y: 0, width: Math.round(size * ratio), height: size };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function createDefaultExportFileName(now = new Date()): string {
  const timestamp = now.getTime();
  if (timestamp === lastExportTimestamp) {
    exportSequence += 1;
  } else {
    lastExportTimestamp = timestamp;
    exportSequence = 0;
  }

  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const milliseconds = pad(now.getMilliseconds(), 3);
  const sequence = exportSequence === 0 ? "" : `-${exportSequence}`;

  return `collage-${datePart}-${timePart}-${milliseconds}${sequence}.png`;
}

export function getExportFileName(options: ExportOptions, now = new Date()): string {
  return options.fileName ?? createDefaultExportFileName(now);
}

function loadImage(photo: PhotoAsset): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${photo.fileName}`));
    image.src = photo.src;
  });
}

export async function exportCollage(
  state: AppState,
  options: ExportOptions = {},
): Promise<void> {
  const size = options.size ?? 2048;
  const rect = getExportRect(state.layout.aspectRatio, size);
  const canvas = document.createElement("canvas");
  canvas.width = rect.width;
  canvas.height = rect.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas export is not supported in this browser.");
  }

  context.fillStyle = "#f7f4ef";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const leafRects = getRenderableLeafRects(state.layout, rect);
  const photosById = new Map(state.photos.map((photo) => [photo.id, photo]));
  const loadedImages = new Map<string, HTMLImageElement>();

  for (const leaf of leafRects) {
    const placement = state.placements[leaf.id];
    if (!placement) {
      continue;
    }

    const photo = photosById.get(placement.photoId);
    if (!photo) {
      continue;
    }

    let image = loadedImages.get(photo.id);
    if (!image) {
      image = await loadImage(photo);
      loadedImages.set(photo.id, image);
    }

    const transform = getPlacementTransform(photo, placement, rect);

    context.save();
    context.beginPath();
    context.rect(leaf.rect.x, leaf.rect.y, leaf.rect.width, leaf.rect.height);
    context.clip();
    context.drawImage(image, transform.x, transform.y, transform.width, transform.height);
    context.restore();
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to export collage."));
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getExportFileName(options);
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}
