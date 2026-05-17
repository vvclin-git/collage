import { describe, expect, it } from "vitest";
import type { PhotoAsset } from "../types";
import { clampOffset, getCoverTransform, getTrayPhotos, zoomPlacement } from "./photos";

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
});
