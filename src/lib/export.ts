import type { AppState, PhotoAsset, Rect } from "../types";
import { aspectRatioValue, getRenderableLeafRects } from "./layout";
import { getCoverTransform } from "./photos";

type ExportOptions = {
  size?: number;
  fileName?: string;
};

function getExportRect(aspectRatio: AppState["layout"]["aspectRatio"], size: number): Rect {
  const ratio = aspectRatioValue(aspectRatio);

  if (ratio >= 1) {
    return { x: 0, y: 0, width: size, height: Math.round(size / ratio) };
  }

  return { x: 0, y: 0, width: Math.round(size * ratio), height: size };
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

    const cover = getCoverTransform(photo, leaf.rect);
    const width = cover.width * placement.scale;
    const height = cover.height * placement.scale;
    const x = leaf.rect.x + (leaf.rect.width - width) / 2 + placement.offsetX;
    const y = leaf.rect.y + (leaf.rect.height - height) / 2 + placement.offsetY;

    context.save();
    context.beginPath();
    context.rect(leaf.rect.x, leaf.rect.y, leaf.rect.width, leaf.rect.height);
    context.clip();
    context.drawImage(image, x, y, width, height);
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
      link.download = options.fileName ?? "collage.png";
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}
