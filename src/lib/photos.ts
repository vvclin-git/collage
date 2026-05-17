import type { PhotoAsset, PhotoPlacement, Rect } from "../types";

export type CoverTransform = {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
};

export function getTrayPhotos(
  photos: PhotoAsset[],
  placements: Record<string, PhotoPlacement | undefined>,
): PhotoAsset[] {
  const usedPhotoIds = new Set(
    Object.values(placements)
      .filter(Boolean)
      .map((placement) => placement!.photoId),
  );

  return photos.filter((photo) => !usedPhotoIds.has(photo.id));
}

export function getCoverTransform(photo: PhotoAsset, rect: Rect): CoverTransform {
  const scale = Math.max(rect.width / photo.width, rect.height / photo.height);
  const width = photo.width * scale;
  const height = photo.height * scale;

  return {
    width,
    height,
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    scale,
  };
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  photo: PhotoAsset,
  rect: Rect,
  placementScale: number,
): { offsetX: number; offsetY: number } {
  const cover = getCoverTransform(photo, rect);
  const width = cover.width * placementScale;
  const height = cover.height * placementScale;
  const maxX = Math.max(0, (width - rect.width) / 2);
  const maxY = Math.max(0, (height - rect.height) / 2);

  return {
    offsetX: Math.min(maxX, Math.max(-maxX, offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

export function zoomPlacement(
  placement: PhotoPlacement,
  photo: PhotoAsset,
  rect: Rect,
  nextScale: number,
  maxScale = 4,
): PhotoPlacement {
  const scale = Math.min(maxScale, Math.max(1, nextScale));
  const offset = clampOffset(placement.offsetX, placement.offsetY, photo, rect, scale);

  return {
    ...placement,
    scale,
    ...offset,
  };
}

export async function getImageSize(src: string): Promise<{ width: number; height: number }> {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}
