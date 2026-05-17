import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollageStore } from "./useCollageStore";

describe("collage store", () => {
  beforeEach(() => {
    useCollageStore.setState({
      mode: "layout",
      layout: {
        root: { id: "root", type: "leaf" },
        gap: 16,
        padding: 16,
        aspectRatio: "1:1",
      },
      photos: [],
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
    });
  });

  it("clears placements when entering collage editor", () => {
    useCollageStore.setState({
      photos: [
        {
          id: "photo-1",
          src: "blob:test",
          fileName: "test.jpg",
          width: 100,
          height: 100,
          mimeType: "image/jpeg",
        },
      ],
      placements: { root: { photoId: "photo-1", scale: 2, offsetX: 4, offsetY: 5 } },
    });

    useCollageStore.getState().enterCollageEditor();

    expect(useCollageStore.getState().mode).toBe("collage");
    expect(useCollageStore.getState().photos).toHaveLength(1);
    expect(useCollageStore.getState().placements).toEqual({});
  });

  it("clears placements when returning to layout editor", () => {
    useCollageStore.setState({
      mode: "collage",
      placements: { root: { photoId: "photo-1", scale: 2, offsetX: 4, offsetY: 5 } },
    });

    useCollageStore.getState().returnToLayoutEditor();

    expect(useCollageStore.getState().mode).toBe("layout");
    expect(useCollageStore.getState().placements).toEqual({});
  });

  it("allows the same photo to be placed in multiple cells", () => {
    useCollageStore.setState({
      placements: { old: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } },
    });

    useCollageStore.getState().placePhoto("new", "photo-1");

    expect(useCollageStore.getState().placements).toEqual({
      old: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 },
      new: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 },
    });
  });

  it("revokes object URLs when removing photo assets", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    useCollageStore.setState({
      photos: [
        {
          id: "photo-1",
          src: "blob:test",
          fileName: "test.jpg",
          width: 100,
          height: 100,
          mimeType: "image/jpeg",
        },
      ],
      placements: { root: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } },
    });

    useCollageStore.getState().removePhotoAsset("photo-1");

    expect(revoke).toHaveBeenCalledWith("blob:test");
    expect(useCollageStore.getState().photos).toEqual([]);
    expect(useCollageStore.getState().placements).toEqual({});
    revoke.mockRestore();
  });

  it("removes unplaced tray photos", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    useCollageStore.setState({
      photos: [
        {
          id: "photo-1",
          src: "blob:tray",
          fileName: "tray.jpg",
          width: 100,
          height: 100,
          mimeType: "image/jpeg",
        },
      ],
      placements: {},
    });

    useCollageStore.getState().removePhotoAsset("photo-1");

    expect(revoke).toHaveBeenCalledWith("blob:tray");
    expect(useCollageStore.getState().photos).toEqual([]);
    revoke.mockRestore();
  });

  it("equalizes the selected split", () => {
    useCollageStore.setState({
      selectedSplitId: "split",
      layout: {
        root: {
          id: "split",
          type: "split",
          direction: "horizontal",
          ratio: 0.2,
          children: [
            { id: "top", type: "leaf" },
            {
              id: "bottom-split",
              type: "split",
              direction: "horizontal",
              ratio: 0.8,
              children: [
                { id: "middle", type: "leaf" },
                { id: "bottom", type: "leaf" },
              ],
            },
          ],
        },
        gap: 16,
        padding: 16,
        aspectRatio: "1:1",
      },
    });

    useCollageStore.getState().equalizeSelectedSplit();

    const root = useCollageStore.getState().layout.root;
    expect(root.type).toBe("split");
    if (root.type === "split") {
      expect(root.ratio).toBe(1 / 3);
    }
  });
});
