import type { PhotoAsset } from "../types";
import { createId } from "./id";
import { getImageSize } from "./photos";

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PhotoImportRejection = {
  file: File;
  reason: "unsupported-type" | "decode-failed";
};

export type PhotoImportResult = {
  assets: PhotoAsset[];
  rejections: PhotoImportRejection[];
};

export async function createPhotoAssets(files: File[]): Promise<PhotoImportResult> {
  const results = await Promise.all(files.map(async (file) => {
    if (!SUPPORTED_TYPES.has(file.type)) {
      return { ok: false as const, rejection: { file, reason: "unsupported-type" as const } };
    }

    let src: string | undefined;
    try {
      src = URL.createObjectURL(file);
      const size = await getImageSize(src);
      const asset = {
        id: createId("photo"),
        src,
        fileName: file.name,
        width: size.width,
        height: size.height,
        mimeType: file.type,
      } satisfies PhotoAsset;
      return { ok: true as const, asset };
    } catch {
      if (src) URL.revokeObjectURL(src);
      return { ok: false as const, rejection: { file, reason: "decode-failed" as const } };
    }
  }));

  const assets: PhotoAsset[] = [];
  const rejections: PhotoImportRejection[] = [];
  for (const result of results) {
    if (result.ok) assets.push(result.asset);
    else rejections.push(result.rejection);
  }
  return { assets, rejections };
}
