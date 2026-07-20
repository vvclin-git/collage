import type { PhotoAsset, PhotoPlacement, Rect } from "../types";

export type CoverTransform = {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
};

export function createPhotoPlacement(
  photo: PhotoAsset,
  cellRect: Rect,
  canvasRect: Rect,
): PhotoPlacement {
  const cover = getCoverTransform(photo, cellRect);
  return {
    photoId: photo.id,
    imageWidth: cover.width / canvasRect.width,
    zoom: 1,
    centerX: (cover.x + cover.width / 2 - canvasRect.x) / canvasRect.width,
    centerY: (cover.y + cover.height / 2 - canvasRect.y) / canvasRect.height,
  };
}

export function getPlacementTransform(
  photo: PhotoAsset,
  placement: PhotoPlacement,
  canvasRect: Rect,
): CoverTransform {
  const imageWidth = placement.imageWidth ?? 1;
  const zoom = placement.zoom ?? placement.scale ?? 1;
  const centerX = placement.centerX ?? 0.5;
  const centerY = placement.centerY ?? 0.5;
  const width = canvasRect.width * imageWidth * zoom;
  const height = width * photo.height / photo.width;
  return {
    width,
    height,
    x: canvasRect.x + canvasRect.width * centerX - width / 2,
    y: canvasRect.y + canvasRect.height * centerY - height / 2,
    scale: width / photo.width,
  };
}

export function clampOffset(offsetX: number, offsetY: number, photo: PhotoAsset, rect: Rect, placementScale: number) {
  const cover = getCoverTransform(photo, rect);
  const maxX = Math.max(0, (cover.width * placementScale - rect.width) / 2);
  const maxY = Math.max(0, (cover.height * placementScale - rect.height) / 2);
  return { offsetX: Math.min(maxX, Math.max(-maxX, offsetX)), offsetY: Math.min(maxY, Math.max(-maxY, offsetY)) };
}

export function getTrayPhotos(
  photos: PhotoAsset[],
  _placements: Record<string, PhotoPlacement | undefined>,
): PhotoAsset[] {
  return photos;
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

export function zoomPlacement(
  placement: PhotoPlacement,
  nextScaleOrPhoto: number | PhotoAsset,
  rectOrScale?: Rect | number,
  maybeScale?: number,
  maxScale = 4,
): PhotoPlacement {
  const nextScale = typeof nextScaleOrPhoto === "number" ? nextScaleOrPhoto : maybeScale ?? 1;
  if (typeof nextScaleOrPhoto !== "number" && typeof rectOrScale === "object") {
    const legacyScale = Math.min(maxScale, Math.max(1, nextScale));
    const offset = clampOffset(placement.offsetX ?? 0, placement.offsetY ?? 0, nextScaleOrPhoto, rectOrScale, legacyScale);
    return { ...placement, scale: legacyScale, offsetX: offset.offsetX, offsetY: offset.offsetY };
  }
  return { ...placement, zoom: Math.min(maxScale, Math.max(1, nextScale)) };
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
