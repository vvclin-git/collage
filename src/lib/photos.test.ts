import { describe, expect, it } from "vitest";
import type { PhotoAsset } from "../types";
import { clampOffset, createPhotoPlacement, getCoverTransform, getPlacementTransform, getTrayPhotos, zoomPlacement } from "./photos";

const photo: PhotoAsset = {
  id: "photo-1",
  src: "blob:test",
  fileName: "test.jpg",
  width: 400,
  height: 200,
  mimeType: "image/jpeg",
};

describe("photo utilities", () => {
  it("keeps all imported photos in the tray even when placed", () => {
    expect(
      getTrayPhotos(
        [photo, { ...photo, id: "photo-2" }],
        { cell: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } },
      ).map((item) => item.id),
    ).toEqual(["photo-1", "photo-2"]);
  });

  it("computes cover transform", () => {
    expect(getCoverTransform(photo, { x: 0, y: 0, width: 100, height: 100 })).toEqual({
      width: 200,
      height: 100,
      x: -50,
      y: 0,
      scale: 0.5,
    });
  });

  it("clamps offsets so the cell stays covered", () => {
    expect(clampOffset(100, 100, photo, { x: 0, y: 0, width: 100, height: 100 }, 1)).toEqual({
      offsetX: 50,
      offsetY: 0,
    });
  });

  it("clamps zoom scale and offsets", () => {
    expect(
      zoomPlacement(
        { photoId: "photo-1", scale: 1, offsetX: 999, offsetY: 999 },
        photo,
        { x: 0, y: 0, width: 100, height: 100 },
        9,
      ),
    ).toEqual({ photoId: "photo-1", scale: 4, offsetX: 350, offsetY: 150 });
  });

  it("derives preview and export transforms from one normalized frame", () => {
    const canvas = { x: 0, y: 0, width: 2048, height: 2048 };
    const cell = { x: 0, y: 0, width: 1024, height: 1024 };
    const placement = createPhotoPlacement(photo, cell, canvas);
    const preview = getPlacementTransform(photo, placement, { x: 0, y: 0, width: 512, height: 512 });
    const exportFrame = getPlacementTransform(photo, placement, canvas);
    expect(preview.x).toBeCloseTo(exportFrame.x / 4);
    expect(preview.y).toBeCloseTo(exportFrame.y / 4);
    expect(preview.width).toBeCloseTo(exportFrame.width / 4);
    expect(preview.height).toBeCloseTo(exportFrame.height / 4);
  });

  it("permits a zoomed frame to expose cell background", () => {
    const placement = { photoId: photo.id, imageWidth: 0.1, zoom: 1, centerX: 0.5, centerY: 0.5 };
    const frame = getPlacementTransform(photo, placement, { x: 0, y: 0, width: 1000, height: 1000 });
    expect(frame.width).toBe(100);
    expect(frame.height).toBe(50);
  });
});
