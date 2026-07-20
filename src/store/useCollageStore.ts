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
  getRenderableLeafRects,
  equalizeSplitChildren,
  removeSplitWithMetadata,
  getCanonicalCanvasRect,
  splitLeaf,
  updateSplitRatio,
} from "../lib/layout";
import { createPhotoPlacement } from "../lib/photos";

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
  setSpacing: (gap: number, padding: number, canvasRect?: Rect) => void;
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
  placePhoto: (cellId: string, photoId: string, cellRect?: Rect, canvasRect?: Rect) => void;
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

function leafIds(root: LayoutState["root"]): Set<string> {
  return new Set(root.type === "leaf" ? [root.id] : getRenderableLeafRects({ root, gap: 0, padding: 0, aspectRatio: { kind: "preset", value: "1:1" } }, { x: 0, y: 0, width: 1, height: 1 }).map((leaf) => leaf.id));
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
  setSpacing: (gap, padding) => set((state) => ({ layout: { ...state.layout, gap, padding } })),
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

      const assigned = new Set(Object.entries(state.placements).filter(([, placement]) => placement).map(([cellId]) => cellId));
      const result = removeSplitWithMetadata(state.layout.root, state.selectedSplitId, assigned);
      const placements = Object.fromEntries(Object.entries(state.placements).filter(([cellId]) => !result.removedLeafIds.includes(cellId)));
      const valid = leafIds(result.root);
      return {
        layout: {
          ...state.layout,
          root: result.root,
        },
        placements,
        selectedSplitId: undefined,
        selectedCellId: state.selectedCellId && valid.has(state.selectedCellId) ? state.selectedCellId : undefined,
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
        const canvasRect = getCanonicalCanvasRect({ kind: "custom", width: canvasAspect, height: 1 });
        const leafRects = getRenderableLeafRects({
          ...state.layout,
          root: generated.root,
          aspectRatio: { kind: "custom", width: canvasAspect, height: 1 },
        }, canvasRect);
        const cellRect = leafRects.find((leaf) => leaf.id === leafId)?.rect;
        if (!cellRect) return state;
        placements[leafId] = createPhotoPlacement(photo, cellRect, canvasRect);
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
  placePhoto: (cellId, photoId, cellRect, canvasRect) =>
    set((state) => {
      const canonicalCanvas = canvasRect ?? getCanonicalCanvasRect(state.layout.aspectRatio);
      const canonicalCell = cellRect ?? getRenderableLeafRects(state.layout, canonicalCanvas).find((leaf) => leaf.id === cellId)?.rect ?? canonicalCanvas;
      return {
        placements: { ...state.placements, [cellId]: createPhotoPlacement(
          state.photos.find((photo) => photo.id === photoId) ?? { id: photoId, src: "", fileName: "", width: 1, height: 1, mimeType: "" },
          canonicalCell,
          canonicalCanvas,
        ) },
        selectedCellId: cellId,
      };
    }),
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
