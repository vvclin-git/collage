import { create } from "zustand";
import type {
  AppMode,
  AspectRatio,
  LayoutState,
  PhotoAsset,
  PhotoPlacement,
  Rect,
  SplitDirection,
} from "../types";
import {
  createRootLeaf,
  equalizeSelectedLeaves as solveEqualizeSelectedLeaves,
  type EqualizeAxis,
  type EqualizeLeavesResult,
  getPreviewSpacingScale,
  getRenderableLeafRects,
  equalizeSplitChildren,
  removeSplit,
  splitLeaf,
  updateSplitRatio,
} from "../lib/layout";
import { clampOffset } from "../lib/photos";

type CollageStore = {
  mode: AppMode;
  layout: LayoutState;
  photos: PhotoAsset[];
  placements: Record<string, PhotoPlacement | undefined>;
  selectedSplitId?: string;
  selectedCellId?: string;
  selectedLayoutLeafIds: string[];
  setGap: (gap: number) => void;
  setPadding: (padding: number) => void;
  setSpacing: (gap: number, padding: number, canvasRect: Rect) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  splitLeaf: (leafId: string, direction: SplitDirection, ratio: number) => void;
  updateSplitRatio: (splitId: string, ratio: number) => void;
  selectSplit: (splitId?: string) => void;
  deleteSelectedSplit: () => void;
  equalizeSelectedSplit: () => void;
  toggleLayoutLeafSelection: (leafId: string) => void;
  clearLayoutLeafSelection: () => void;
  equalizeSelectedLeaves: (axis: EqualizeAxis) => EqualizeLeavesResult;
  resetLayout: () => void;
  enterCollageEditor: () => void;
  returnToLayoutEditor: () => void;
  addPhotos: (photos: PhotoAsset[]) => void;
  removePhotoAsset: (photoId: string) => void;
  clearPhotoAssets: () => void;
  selectCell: (cellId?: string) => void;
  placePhoto: (cellId: string, photoId: string) => void;
  removePlacement: (cellId: string) => void;
  updatePlacement: (cellId: string, placement: PhotoPlacement) => void;
};

function initialLayout(): LayoutState {
  return {
    root: createRootLeaf(),
    gap: 24,
    padding: 16,
    aspectRatio: { kind: "preset", value: "1:1" },
  };
}

function reclampPlacements(
  layout: LayoutState,
  photos: PhotoAsset[],
  placements: Record<string, PhotoPlacement | undefined>,
  canvasRect: Rect,
): Record<string, PhotoPlacement | undefined> {
  const rects = new Map(
    getRenderableLeafRects(layout, canvasRect, getPreviewSpacingScale(canvasRect, layout.aspectRatio))
      .map(({ id, rect }) => [id, rect]),
  );
  const photoMap = new Map(photos.map((photo) => [photo.id, photo]));
  return Object.fromEntries(Object.entries(placements).map(([cellId, placement]) => {
    if (!placement) return [cellId, placement];
    const photo = photoMap.get(placement.photoId);
    const rect = rects.get(cellId);
    if (!photo || !rect) return [cellId, placement];
    return [cellId, { ...placement, ...clampOffset(placement.offsetX, placement.offsetY, photo, rect, placement.scale) }];
  }));
}

export const useCollageStore = create<CollageStore>((set) => ({
  mode: "layout",
  layout: initialLayout(),
  photos: [],
  placements: {},
  selectedLayoutLeafIds: [],
  setGap: (gap) =>
    set((state) => ({
      layout: { ...state.layout, gap },
    })),
  setPadding: (padding) =>
    set((state) => ({
      layout: { ...state.layout, padding },
    })),
  setSpacing: (gap, padding, canvasRect) =>
    set((state) => {
      const layout = { ...state.layout, gap, padding };
      return { layout, placements: reclampPlacements(layout, state.photos, state.placements, canvasRect) };
    }),
  setAspectRatio: (aspectRatio) =>
    set((state) => ({
      layout: { ...state.layout, aspectRatio },
    })),
  splitLeaf: (leafId, direction, ratio) =>
    set((state) => ({
      layout: {
        ...state.layout,
        root: splitLeaf(state.layout.root, leafId, direction, ratio),
      },
      selectedSplitId: undefined,
      selectedLayoutLeafIds: [],
    })),
  updateSplitRatio: (splitId, ratio) =>
    set((state) => ({
      layout: {
        ...state.layout,
        root: updateSplitRatio(state.layout.root, splitId, ratio),
      },
    })),
  selectSplit: (splitId) => set({
    selectedSplitId: splitId,
    selectedCellId: undefined,
    selectedLayoutLeafIds: [],
  }),
  deleteSelectedSplit: () =>
    set((state) => {
      if (!state.selectedSplitId) {
        return state;
      }

      return {
        layout: {
          ...state.layout,
          root: removeSplit(state.layout.root, state.selectedSplitId),
        },
        selectedSplitId: undefined,
        selectedLayoutLeafIds: [],
      };
    }),
  equalizeSelectedSplit: () =>
    set((state) => {
      if (!state.selectedSplitId) {
        return state;
      }

      return {
        layout: {
          ...state.layout,
          root: equalizeSplitChildren(state.layout.root, state.selectedSplitId),
        },
      };
    }),
  toggleLayoutLeafSelection: (leafId) => set((state) => ({
    selectedSplitId: undefined,
    selectedLayoutLeafIds: state.selectedLayoutLeafIds.includes(leafId)
      ? state.selectedLayoutLeafIds.filter((id) => id !== leafId)
      : [...state.selectedLayoutLeafIds, leafId],
  })),
  clearLayoutLeafSelection: () => set({ selectedLayoutLeafIds: [] }),
  equalizeSelectedLeaves: (axis) => {
    const state = useCollageStore.getState();
    const result = solveEqualizeSelectedLeaves(state.layout.root, new Set(state.selectedLayoutLeafIds), axis);
    if (result.ok) set({ layout: { ...state.layout, root: result.root } });
    return result;
  },
  resetLayout: () =>
    set((state) => ({
      layout: {
        ...state.layout,
        root: createRootLeaf(),
      },
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
    })),
  enterCollageEditor: () =>
    set({
      mode: "collage",
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
    }),
  returnToLayoutEditor: () =>
    set({
      mode: "layout",
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
    }),
  addPhotos: (photos) =>
    set((state) => ({
      photos: [...state.photos, ...photos],
    })),
  removePhotoAsset: (photoId) =>
    set((state) => {
      const nextPlacements = Object.fromEntries(
        Object.entries(state.placements).filter(([, placement]) => placement?.photoId !== photoId),
      );
      const removedSources = new Set(
        state.photos.filter((photo) => photo.id === photoId).map((photo) => photo.src),
      );
      const photos = state.photos.filter((photo) => photo.id !== photoId);
      const retainedSources = new Set(photos.map((photo) => photo.src));
      for (const src of removedSources) {
        if (!retainedSources.has(src)) URL.revokeObjectURL(src);
      }

      return {
        photos,
        placements: nextPlacements,
      };
    }),
  clearPhotoAssets: () =>
    set((state) => {
      for (const src of new Set(state.photos.map((photo) => photo.src))) URL.revokeObjectURL(src);
      return { photos: [], placements: {} };
    }),
  selectCell: (cellId) => set({
    selectedCellId: cellId,
    selectedSplitId: undefined,
    selectedLayoutLeafIds: [],
  }),
  placePhoto: (cellId, photoId) =>
    set((state) => ({
      placements: {
        ...state.placements,
        [cellId]: {
          photoId,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
      },
        selectedCellId: cellId,
    })),
  removePlacement: (cellId) =>
    set((state) => ({
      placements: {
        ...state.placements,
        [cellId]: undefined,
      },
    })),
  updatePlacement: (cellId, placement) =>
    set((state) => ({
      placements: {
        ...state.placements,
        [cellId]: placement,
      },
    })),
}));

export function snapshotAppState() {
  const state = useCollageStore.getState();
  return {
    mode: state.mode,
    layout: state.layout,
    photos: state.photos,
    placements: state.placements,
  };
}
