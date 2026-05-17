import type { PhotoAsset } from "../types";
import { createId } from "./id";
import { getImageSize } from "./photos";

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function createPhotoAssets(files: File[]): Promise<PhotoAsset[]> {
  const imageFiles = files.filter((file) => SUPPORTED_TYPES.has(file.type));
  const assets = await Promise.all(
    imageFiles.map(async (file) => {
      const src = URL.createObjectURL(file);
      const size = await getImageSize(src);

      return {
        id: createId("photo"),
        src,
        fileName: file.name,
        width: size.width,
        height: size.height,
        mimeType: file.type,
      };
    }),
  );

  return assets;
}
