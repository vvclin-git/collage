import { create } from "zustand";
import type {
  AppMode,
  AspectRatio,
  LayoutState,
  PhotoAsset,
  PhotoPlacement,
  SplitDirection,
} from "../types";
import {
  createRootLeaf,
  equalizeSplitChildren,
  removeSplit,
  splitLeaf,
  updateSplitRatio,
} from "../lib/layout";

type CollageStore = {
  mode: AppMode;
  layout: LayoutState;
  photos: PhotoAsset[];
  placements: Record<string, PhotoPlacement | undefined>;
  selectedSplitId?: string;
  selectedCellId?: string;
  setGap: (gap: number) => void;
  setPadding: (padding: number) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  splitLeaf: (leafId: string, direction: SplitDirection, ratio: number) => void;
  updateSplitRatio: (splitId: string, ratio: number) => void;
  selectSplit: (splitId?: string) => void;
  deleteSelectedSplit: () => void;
  equalizeSelectedSplit: () => void;
  resetLayout: () => void;
  enterCollageEditor: () => void;
  returnToLayoutEditor: () => void;
  addPhotos: (photos: PhotoAsset[]) => void;
  removePhotoAsset: (photoId: string) => void;
  selectCell: (cellId?: string) => void;
  placePhoto: (cellId: string, photoId: string) => void;
  removePlacement: (cellId: string) => void;
  updatePlacement: (cellId: string, placement: PhotoPlacement) => void;
};

function initialLayout(): LayoutState {
  return {
    root: createRootLeaf(),
    gap: 16,
    padding: 16,
    aspectRatio: "1:1",
  };
}

export const useCollageStore = create<CollageStore>((set) => ({
  mode: "layout",
  layout: initialLayout(),
  photos: [],
  placements: {},
  setGap: (gap) =>
    set((state) => ({
      layout: { ...state.layout, gap },
    })),
  setPadding: (padding) =>
    set((state) => ({
      layout: { ...state.layout, padding },
    })),
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
    })),
  updateSplitRatio: (splitId, ratio) =>
    set((state) => ({
      layout: {
        ...state.layout,
        root: updateSplitRatio(state.layout.root, splitId, ratio),
      },
    })),
  selectSplit: (splitId) => set({ selectedSplitId: splitId }),
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
  resetLayout: () =>
    set((state) => ({
      layout: {
        ...state.layout,
        root: createRootLeaf(),
      },
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
    })),
  enterCollageEditor: () =>
    set({
      mode: "collage",
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
    }),
  returnToLayoutEditor: () =>
    set({
      mode: "layout",
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
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

      return {
        photos: state.photos.filter((photo) => {
          if (photo.id === photoId) {
            URL.revokeObjectURL(photo.src);
            return false;
          }
          return true;
        }),
        placements: nextPlacements,
      };
    }),
  selectCell: (cellId) => set({ selectedCellId: cellId }),
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
