import { create } from "zustand";
import type {
  AutoLayoutKind,
  AspectRatio,
  LayoutState,
  ManualAspectOrigin,
  PhotoAsset,
  PhotoPlacement,
  Rect,
  SplitDirection,
  WorkflowStep,
} from "../types";
import {
  createRootLeaf,
  createWeightedLinearLayout,
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

export type CollageStore = {
  workflowStep: WorkflowStep;
  manualAspectOrigin?: ManualAspectOrigin;
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
  importPhotoAssets: (photos: PhotoAsset[]) => void;
  removePhotoAsset: (photoId: string) => void;
  openManualAspect: (origin: ManualAspectOrigin) => void;
  cancelManualAspect: () => void;
  startManualLayout: (aspectRatio: AspectRatio) => void;
  cancelManualLayout: () => void;
  finishManualLayout: () => void;
  applyAutoLayout: (kind: AutoLayoutKind) => void;
  invalidateLayoutForPhotoSetChange: () => void;
  clearAllAndReset: () => void;
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
  workflowStep: "start",
  manualAspectOrigin: undefined,
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
  importPhotoAssets: (photos) =>
    set((state) => {
      if (photos.length === 0) return state;
      return {
        photos: [...state.photos, ...photos],
        layout: { ...state.layout, root: createRootLeaf() },
        placements: {},
        selectedSplitId: undefined,
        selectedCellId: undefined,
        selectedLayoutLeafIds: [],
        workflowStep: "choose-layout",
        manualAspectOrigin: undefined,
      };
    }),
  removePhotoAsset: (photoId) =>
    set((state) => {
      const removedSources = new Set(
        state.photos.filter((photo) => photo.id === photoId).map((photo) => photo.src),
      );
      if (removedSources.size === 0) return state;
      const photos = state.photos.filter((photo) => photo.id !== photoId);
      const retainedSources = new Set(photos.map((photo) => photo.src));
      for (const src of removedSources) {
        if (!retainedSources.has(src)) URL.revokeObjectURL(src);
      }

      return {
        photos,
        layout: { ...state.layout, root: createRootLeaf() },
        placements: {},
        selectedSplitId: undefined,
        selectedCellId: undefined,
        selectedLayoutLeafIds: [],
        workflowStep: "choose-layout",
        manualAspectOrigin: undefined,
      };
    }),
  openManualAspect: (origin) => set({ workflowStep: "manual-aspect", manualAspectOrigin: origin }),
  cancelManualAspect: () =>
    set((state) => ({
      workflowStep: state.manualAspectOrigin ?? "choose-layout",
      manualAspectOrigin: undefined,
    })),
  startManualLayout: (aspectRatio) =>
    set((state) => ({
      layout: { ...state.layout, root: createRootLeaf(), aspectRatio },
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
      workflowStep: "manual-layout",
      manualAspectOrigin: undefined,
    })),
  cancelManualLayout: () =>
    set((state) => ({
      layout: { ...state.layout, root: createRootLeaf() },
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
      workflowStep: "choose-layout",
      manualAspectOrigin: undefined,
    })),
  finishManualLayout: () => set({
    workflowStep: "edit-collage",
    manualAspectOrigin: undefined,
    selectedSplitId: undefined,
    selectedCellId: undefined,
    selectedLayoutLeafIds: [],
  }),
  applyAutoLayout: (kind) =>
    set((state) => {
      const weights = state.photos.map((photo) =>
        kind === "horizontal" ? photo.width / photo.height : photo.height / photo.width,
      );
      const generated = createWeightedLinearLayout(
        weights,
        kind === "horizontal" ? "vertical" : "horizontal",
      );
      if (!generated.ok) return state;

      const rawAspect = kind === "horizontal"
        ? weights.reduce((sum, weight) => sum + weight, 0)
        : 1 / weights.reduce((sum, weight) => sum + weight, 0);
      const canvasAspect = Math.min(10, Math.max(0.1, rawAspect));
      if (!Number.isFinite(canvasAspect)) return state;

      if (generated.leafIds.length !== state.photos.length) return state;
      const placements: Record<string, PhotoPlacement> = {};
      for (let index = 0; index < state.photos.length; index += 1) {
        const photo = state.photos[index];
        const leafId = generated.leafIds[index];
        if (!photo || !leafId) return state;
        placements[leafId] = { photoId: photo.id, scale: 1, offsetX: 0, offsetY: 0 };
      }
      return {
        layout: {
          ...state.layout,
          root: generated.root,
          aspectRatio: { kind: "custom", width: canvasAspect, height: 1 },
        },
        placements,
        selectedSplitId: undefined,
        selectedCellId: undefined,
        selectedLayoutLeafIds: [],
        workflowStep: "edit-collage",
        manualAspectOrigin: undefined,
      };
    }),
  invalidateLayoutForPhotoSetChange: () =>
    set((state) => ({
      layout: { ...state.layout, root: createRootLeaf() },
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
      workflowStep: "choose-layout",
      manualAspectOrigin: undefined,
    })),
  clearAllAndReset: () =>
    set((state) => {
      for (const src of new Set(state.photos.map((photo) => photo.src))) URL.revokeObjectURL(src);
      return {
        workflowStep: "start",
        manualAspectOrigin: undefined,
        layout: initialLayout(),
        photos: [],
        placements: {},
        selectedSplitId: undefined,
        selectedCellId: undefined,
        selectedLayoutLeafIds: [],
      };
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
    workflowStep: state.workflowStep,
    manualAspectOrigin: state.manualAspectOrigin,
    layout: state.layout,
    photos: state.photos,
    placements: state.placements,
  };
}
