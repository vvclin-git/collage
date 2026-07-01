import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollageStore } from "./useCollageStore";

describe("collage store", () => {
  beforeEach(() => {
    useCollageStore.setState({
      mode: "layout",
      layout: {
        root: { id: "root", type: "leaf" },
        gap: 24,
        padding: 16,
        aspectRatio: { kind: "preset", value: "1:1" },
      },
      photos: [],
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
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
        aspectRatio: { kind: "preset", value: "1:1" },
      },
    });

    useCollageStore.getState().equalizeSelectedSplit();

    const root = useCollageStore.getState().layout.root;
    expect(root.type).toBe("split");
    if (root.type === "split") {
      expect(root.ratio).toBe(1 / 3);
    }
  });

  it("uses a 24px default gap", () => {
    useCollageStore.getState().resetLayout();
    expect(useCollageStore.getState().layout.gap).toBe(24);
  });

  it("keeps layout-cell and divider selections exclusive and clears cell selection on structural edits", () => {
    useCollageStore.getState().toggleLayoutLeafSelection("root");
    expect(useCollageStore.getState().selectedLayoutLeafIds).toEqual(["root"]);
    useCollageStore.getState().selectSplit("split");
    expect(useCollageStore.getState().selectedLayoutLeafIds).toEqual([]);
    useCollageStore.getState().toggleLayoutLeafSelection("root");
    expect(useCollageStore.getState().selectedSplitId).toBeUndefined();
    useCollageStore.getState().splitLeaf("root", "vertical", 0.5);
    expect(useCollageStore.getState().selectedLayoutLeafIds).toEqual([]);
  });

  it("returns equalization failures unchanged and preserves selection", () => {
    useCollageStore.setState({ selectedLayoutLeafIds: ["root", "missing"] });
    const before = useCollageStore.getState().layout.root;
    expect(useCollageStore.getState().equalizeSelectedLeaves("width")).toEqual({ ok: false, reason: "stale-leaf-ids" });
    expect(useCollageStore.getState().layout.root).toBe(before);
    expect(useCollageStore.getState().selectedLayoutLeafIds).toEqual(["root", "missing"]);
  });

  it("commits successful selected-leaf equalization while preserving selection", () => {
    useCollageStore.setState({
      selectedLayoutLeafIds: ["a", "b"],
      layout: {
        ...useCollageStore.getState().layout,
        root: { id: "split", type: "split", direction: "vertical", ratio: 0.25, children: [{ id: "a", type: "leaf" }, { id: "b", type: "leaf" }] },
      },
    });
    const result = useCollageStore.getState().equalizeSelectedLeaves("width");
    expect(result.ok).toBe(true);
    expect(useCollageStore.getState().selectedLayoutLeafIds).toEqual(["a", "b"]);
    expect(useCollageStore.getState().layout.root).toMatchObject({ ratio: 0.5 });
  });

  it("updates spacing and re-clamps placement offsets atomically without changing zoom", () => {
    useCollageStore.setState({
      photos: [{ id: "photo-1", src: "blob:spacing", fileName: "wide.jpg", width: 400, height: 200, mimeType: "image/jpeg" }],
      placements: { root: { photoId: "photo-1", scale: 2, offsetX: 9999, offsetY: 9999 } },
    });
    useCollageStore.getState().setSpacing(200, 100, { x: 0, y: 0, width: 1000, height: 1000 });
    const state = useCollageStore.getState();
    expect(state.layout).toMatchObject({ gap: 200, padding: 100 });
    expect(state.placements.root?.scale).toBe(2);
    expect(state.placements.root?.offsetX).toBeLessThan(9999);
    expect(state.placements.root?.offsetY).toBeLessThan(9999);
  });

  it("clears all assets atomically, revoking each distinct URL once while preserving layout and selected cell", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const layout = useCollageStore.getState().layout;
    const base = { fileName: "photo.jpg", width: 100, height: 100, mimeType: "image/jpeg" };
    useCollageStore.setState({
      photos: [{ ...base, id: "one", src: "blob:shared" }, { ...base, id: "two", src: "blob:shared" }],
      placements: { root: { photoId: "one", scale: 1, offsetX: 0, offsetY: 0 } },
      selectedCellId: "root",
    });
    useCollageStore.getState().clearPhotoAssets();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:shared");
    expect(useCollageStore.getState()).toMatchObject({ photos: [], placements: {}, layout, selectedCellId: "root" });
    revoke.mockRestore();
  });
});
