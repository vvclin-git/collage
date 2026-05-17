export type AppMode = "layout" | "collage";

export type AspectRatio = "1:1" | "4:5" | "5:4" | "3:4" | "4:3" | "16:9" | "9:16";

export type CollageNode =
  | {
      id: string;
      type: "leaf";
    }
  | {
      id: string;
      type: "split";
      direction: "vertical" | "horizontal";
      ratio: number;
      children: [CollageNode, CollageNode];
    };

export type LayoutState = {
  root: CollageNode;
  gap: number;
  padding: number;
  aspectRatio: AspectRatio;
};

export type PhotoAsset = {
  id: string;
  src: string;
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
};

export type PhotoPlacement = {
  photoId: string;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type AppState = {
  mode: AppMode;
  layout: LayoutState;
  photos: PhotoAsset[];
  placements: Record<string, PhotoPlacement | undefined>;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LeafRect = {
  id: string;
  rect: Rect;
};

export type Point = {
  x: number;
  y: number;
};

export type SplitDirection = "vertical" | "horizontal";
