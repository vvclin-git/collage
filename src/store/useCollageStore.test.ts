import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollageStore } from "./useCollageStore";

describe("collage store", () => {
  beforeEach(() => {
    useCollageStore.setState({
      workflowStep: "start",
      manualAspectOrigin: undefined,
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

  it("imports photos and invalidates an existing layout atomically", () => {
    useCollageStore.setState({
      workflowStep: "edit-collage",
      layout: {
        ...useCollageStore.getState().layout,
        root: { id: "split", type: "split", direction: "vertical", ratio: 0.5, children: [{ id: "a", type: "leaf" }, { id: "b", type: "leaf" }] },
      },
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
      placements: { a: { photoId: "photo-1", scale: 2, offsetX: 4, offsetY: 5 } },
      selectedSplitId: "split",
      selectedCellId: "a",
      selectedLayoutLeafIds: ["a"],
    });

    useCollageStore.getState().importPhotoAssets([{ id: "photo-2", src: "blob:two", fileName: "two.jpg", width: 200, height: 100, mimeType: "image/jpeg" }]);

    expect(useCollageStore.getState()).toMatchObject({
      workflowStep: "choose-layout",
      photos: [{ id: "photo-1" }, { id: "photo-2" }],
      placements: {},
      selectedLayoutLeafIds: [],
      layout: { root: { type: "leaf" }, gap: 24, padding: 16 },
    });
    expect(useCollageStore.getState().selectedSplitId).toBeUndefined();
    expect(useCollageStore.getState().selectedCellId).toBeUndefined();
  });

  it("opens and cancels manual aspect without mutating the collage", () => {
    useCollageStore.setState({ workflowStep: "edit-collage", placements: { root: { photoId: "photo-1", scale: 2, offsetX: 4, offsetY: 5 } } });
    const layout = useCollageStore.getState().layout;
    useCollageStore.getState().openManualAspect("edit-collage");
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "manual-aspect", manualAspectOrigin: "edit-collage", layout, placements: { root: { photoId: "photo-1" } } });
    useCollageStore.getState().cancelManualAspect();
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "edit-collage", layout, placements: { root: { photoId: "photo-1" } } });
    expect(useCollageStore.getState().manualAspectOrigin).toBeUndefined();
  });

  it("starts manual layout destructively and finishes without clearing placements", () => {
    const aspectRatio = { kind: "preset", value: "4:5" } as const;
    useCollageStore.setState({ workflowStep: "manual-aspect", placements: { stale: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } } });
    useCollageStore.getState().startManualLayout(aspectRatio);
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "manual-layout", placements: {}, layout: { aspectRatio, root: { type: "leaf" } } });
    useCollageStore.getState().placePhoto("root", "photo-1");
    useCollageStore.getState().finishManualLayout();
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "edit-collage", placements: { root: { photoId: "photo-1" } } });
  });

  it("invalidates topology and selections while preserving photos, spacing, and aspect", () => {
    const photos = [{ id: "photo-1", src: "blob:one", fileName: "one.jpg", width: 100, height: 200, mimeType: "image/jpeg" }];
    useCollageStore.setState({
      workflowStep: "edit-collage",
      photos,
      layout: { root: { id: "split", type: "split", direction: "horizontal", ratio: 0.5, children: [{ id: "a", type: "leaf" }, { id: "b", type: "leaf" }] }, gap: 7, padding: 9, aspectRatio: { kind: "preset", value: "9:16" } },
      placements: { a: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } },
      selectedSplitId: "split",
      selectedCellId: "a",
      selectedLayoutLeafIds: ["a"],
    });
    useCollageStore.getState().invalidateLayoutForPhotoSetChange();
    const state = useCollageStore.getState();
    expect(state).toMatchObject({ workflowStep: "choose-layout", photos, placements: {}, selectedLayoutLeafIds: [], layout: { root: { type: "leaf" }, gap: 7, padding: 9, aspectRatio: { kind: "preset", value: "9:16" } } });
    expect(state.selectedSplitId).toBeUndefined();
    expect(state.selectedCellId).toBeUndefined();
  });

  it("applies a horizontal layout with proportional widths and ordered placements", () => {
    useCollageStore.setState({
      workflowStep: "choose-layout",
      photos: [
        { id: "wide", src: "blob:wide", fileName: "wide.jpg", width: 1600, height: 900, mimeType: "image/jpeg" },
        { id: "square", src: "blob:square", fileName: "square.jpg", width: 1000, height: 1000, mimeType: "image/jpeg" },
        { id: "tall", src: "blob:tall", fileName: "tall.jpg", width: 900, height: 1600, mimeType: "image/jpeg" },
      ],
      selectedSplitId: "old-split",
      selectedCellId: "old-cell",
      selectedLayoutLeafIds: ["old-cell"],
    });
    useCollageStore.getState().applyAutoLayout("horizontal");
    const state = useCollageStore.getState();
    expect(state.workflowStep).toBe("edit-collage");
    expect(state.layout.aspectRatio).toEqual({ kind: "custom", width: 1600 / 900 + 1 + 900 / 1600, height: 1 });
    expect(state.layout.root).toMatchObject({ type: "split", direction: "vertical" });
    const placementPhotoIds = Object.values(state.placements).map((placement) => placement?.photoId);
    expect(placementPhotoIds).toEqual(["wide", "square", "tall"]);
    expect(Object.values(state.placements).every((placement) => placement?.zoom === 1 && placement.imageWidth && placement.centerX && placement.centerY)).toBe(true);
    expect(state.selectedSplitId).toBeUndefined();
    expect(state.selectedCellId).toBeUndefined();
    expect(state.selectedLayoutLeafIds).toEqual([]);
  });

  it("applies a vertical layout and clamps generated canvas aspect to the supported range", () => {
    useCollageStore.setState({
      workflowStep: "choose-layout",
      photos: [
        { id: "one", src: "blob:one", fileName: "one.jpg", width: 1000, height: 100, mimeType: "image/jpeg" },
        { id: "two", src: "blob:two", fileName: "two.jpg", width: 1000, height: 100, mimeType: "image/jpeg" },
      ],
    });
    useCollageStore.getState().applyAutoLayout("vertical");
    expect(useCollageStore.getState().layout).toMatchObject({
      aspectRatio: { kind: "custom", width: 5, height: 1 },
      root: { type: "split", direction: "horizontal", ratio: 0.5 },
    });

    useCollageStore.setState({ photos: [{ id: "extreme", src: "blob:extreme", fileName: "extreme.jpg", width: 1, height: 1000, mimeType: "image/jpeg" }] });
    useCollageStore.getState().applyAutoLayout("vertical");
    expect(useCollageStore.getState().layout.aspectRatio).toEqual({ kind: "custom", width: 0.1, height: 1 });

    useCollageStore.getState().applyAutoLayout("horizontal");
    expect(useCollageStore.getState().layout.aspectRatio).toEqual({ kind: "custom", width: 0.1, height: 1 });

    useCollageStore.setState({ photos: [{ id: "panorama", src: "blob:panorama", fileName: "panorama.jpg", width: 1000, height: 1, mimeType: "image/jpeg" }] });
    useCollageStore.getState().applyAutoLayout("horizontal");
    expect(useCollageStore.getState().layout.aspectRatio).toEqual({ kind: "custom", width: 10, height: 1 });
  });

  it("leaves state unchanged when auto-layout input is empty or invalid", () => {
    const beforeEmpty = useCollageStore.getState();
    useCollageStore.getState().applyAutoLayout("horizontal");
    expect(useCollageStore.getState()).toBe(beforeEmpty);

    useCollageStore.setState({ photos: [{ id: "bad", src: "blob:bad", fileName: "bad.jpg", width: 100, height: 0, mimeType: "image/jpeg" }] });
    const beforeInvalid = useCollageStore.getState();
    useCollageStore.getState().applyAutoLayout("horizontal");
    expect(useCollageStore.getState()).toBe(beforeInvalid);
  });

  it("allows the same photo to be placed in multiple cells", () => {
    useCollageStore.setState({
      placements: { old: { photoId: "photo-1", scale: 1, offsetX: 0, offsetY: 0 } },
    });

    useCollageStore.getState().placePhoto("new", "photo-1");

    expect(useCollageStore.getState().placements.new?.photoId).toBe("photo-1");
    expect(useCollageStore.getState().placements.new?.zoom).toBe(1);
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
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "choose-layout", placements: {}, layout: { root: { type: "leaf" } } });
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

  it("leaves normalized image frames unchanged when spacing changes", () => {
    useCollageStore.setState({
      photos: [{ id: "photo-1", src: "blob:spacing", fileName: "wide.jpg", width: 400, height: 200, mimeType: "image/jpeg" }],
      placements: { root: { photoId: "photo-1", scale: 2, offsetX: 9999, offsetY: 9999 } },
    });
    const before = { ...useCollageStore.getState().placements.root };
    useCollageStore.getState().setSpacing(200, 100, { x: 0, y: 0, width: 1000, height: 1000 });
    const state = useCollageStore.getState();
    expect(state.layout).toMatchObject({ gap: 200, padding: 100 });
    expect(state.placements.root).toEqual(before);
  });

  it("retains the original occupied leaf when splitting", () => {
    useCollageStore.setState({
      photos: [{ id: "photo-1", src: "blob:one", fileName: "one.jpg", width: 100, height: 100, mimeType: "image/jpeg" }],
      placements: { root: { photoId: "photo-1", imageWidth: 0.4, zoom: 2, centerX: 0.3, centerY: 0.7 } },
    });
    useCollageStore.getState().splitLeaf("root", "vertical", 0.5);
    const state = useCollageStore.getState();
    expect(state.layout.root).toMatchObject({ type: "split", children: [{ id: "root", type: "leaf" }, { type: "leaf" }] });
    expect(state.placements.root).toEqual({ photoId: "photo-1", imageWidth: 0.4, zoom: 2, centerX: 0.3, centerY: 0.7 });
  });

  it("collapses nested dividers, keeps the first assigned frame, and removes other placements", () => {
    useCollageStore.setState({
      layout: { ...useCollageStore.getState().layout, root: { id: "outer", type: "split", direction: "vertical", ratio: 0.5, children: [
        { id: "left", type: "leaf" },
        { id: "inner", type: "split", direction: "horizontal", ratio: 0.5, children: [{ id: "top", type: "leaf" }, { id: "bottom", type: "leaf" }] },
      ] } },
      placements: {
        left: { photoId: "left-photo", imageWidth: 0.2, zoom: 1, centerX: 0.2, centerY: 0.5 },
        top: { photoId: "top-photo", imageWidth: 0.3, zoom: 1, centerX: 0.5, centerY: 0.5 },
        bottom: { photoId: "bottom-photo", imageWidth: 0.4, zoom: 1, centerX: 0.8, centerY: 0.5 },
      },
      selectedSplitId: "inner",
    });
    useCollageStore.getState().deleteSelectedSplit();
    const state = useCollageStore.getState();
    expect(state.layout.root).toMatchObject({ type: "split", children: [{ id: "left" }, { id: "top" }] });
    expect(state.placements).toEqual({ left: expect.anything(), top: expect.anything() });
    expect(state.placements.bottom).toBeUndefined();
  });

  it("preserves normalized frames across aspect and divider edits", () => {
    useCollageStore.setState({
      layout: { ...useCollageStore.getState().layout, root: { id: "split", type: "split", direction: "vertical", ratio: 0.4, children: [{ id: "a", type: "leaf" }, { id: "b", type: "leaf" }] } },
      placements: { a: { photoId: "photo-a", imageWidth: 0.25, zoom: 1.7, centerX: 0.2, centerY: 0.6 } },
    });
    const before = structuredClone(useCollageStore.getState().placements);
    useCollageStore.getState().setAspectRatio({ kind: "preset", value: "16:9" });
    useCollageStore.getState().updateSplitRatio("split", 0.7);
    expect(useCollageStore.getState().placements).toEqual(before);
  });

  it("clears all assets atomically, revoking each distinct URL once and restoring defaults", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const base = { fileName: "photo.jpg", width: 100, height: 100, mimeType: "image/jpeg" };
    useCollageStore.setState({
      photos: [{ ...base, id: "one", src: "blob:shared" }, { ...base, id: "two", src: "blob:shared" }],
      placements: { root: { photoId: "one", scale: 1, offsetX: 0, offsetY: 0 } },
      selectedCellId: "root",
    });
    useCollageStore.setState({ workflowStep: "edit-collage", layout: { ...useCollageStore.getState().layout, gap: 2, padding: 3, aspectRatio: { kind: "preset", value: "16:9" } } });
    useCollageStore.getState().clearAllAndReset();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:shared");
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "start", photos: [], placements: {}, selectedLayoutLeafIds: [], layout: { root: { type: "leaf" }, gap: 24, padding: 16, aspectRatio: { kind: "preset", value: "1:1" } } });
    expect(useCollageStore.getState().selectedCellId).toBeUndefined();
    revoke.mockRestore();
  });
});
