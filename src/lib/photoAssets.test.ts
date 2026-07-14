import { beforeEach, describe, expect, it, vi } from "vitest";
import { getImageSize } from "./photos";
import { createPhotoAssets } from "./photoAssets";

vi.mock("./photos", () => ({ getImageSize: vi.fn() }));

const mockedGetImageSize = vi.mocked(getImageSize);

describe("createPhotoAssets", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it("keeps successful supported images in input order and reports mixed failures", async () => {
    const first = new File(["a"], "first.jpg", { type: "image/jpeg" });
    const unsupported = new File(["x"], "notes.txt", { type: "text/plain" });
    const broken = new File(["b"], "broken.png", { type: "image/png" });
    const last = new File(["c"], "last.webp", { type: "image/webp" });
    mockedGetImageSize.mockImplementation(async (src) => {
      if (src === "blob:broken.png") throw new Error("decode failed");
      if (src === "blob:first.jpg") await Promise.resolve();
      return src === "blob:first.jpg" ? { width: 800, height: 600 } : { width: 300, height: 500 };
    });

    const result = await createPhotoAssets([first, unsupported, broken, last]);

    expect(result.assets.map((asset) => asset.fileName)).toEqual(["first.jpg", "last.webp"]);
    expect(result.rejections.map(({ file, reason }) => [file.name, reason])).toEqual([
      ["notes.txt", "unsupported-type"],
      ["broken.png", "decode-failed"],
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:broken.png");
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:first.jpg");
  });
});
