import type {
  AspectRatio,
  CollageNode,
  LayoutState,
  LeafRect,
  Point,
  Rect,
  SplitDirection,
} from "../types";
import { createId } from "./id";

export const MIN_SPLIT_RATIO = 0.15;
export const MAX_SPLIT_RATIO = 0.85;

export type SplitHandle = {
  id: string;
  direction: SplitDirection;
  parentRect: Rect;
  lineRect: Rect;
  ratio: number;
};

export type SplitGesture = {
  direction: SplitDirection;
  ratio: number;
};

export function createRootLeaf(): CollageNode {
  return { id: createId("leaf"), type: "leaf" };
}

export function clampRatio(ratio: number): number {
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));
}

export function insetRect(rect: Rect, inset: number): Rect {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  };
}

export function aspectRatioValue(aspectRatio: AspectRatio): number {
  switch (aspectRatio) {
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "3:4":
      return 3 / 4;
    case "16:9":
      return 16 / 9;
  }
}

export function fitAspectRect(bounds: Rect, aspectRatio: AspectRatio): Rect {
  const ratio = aspectRatioValue(aspectRatio);
  const boundsRatio = bounds.width / bounds.height;

  if (boundsRatio > ratio) {
    const width = bounds.height * ratio;
    return {
      x: bounds.x + (bounds.width - width) / 2,
      y: bounds.y,
      width,
      height: bounds.height,
    };
  }

  const height = bounds.width / ratio;
  return {
    x: bounds.x,
    y: bounds.y + (bounds.height - height) / 2,
    width: bounds.width,
    height,
  };
}

export function layoutNode(node: CollageNode, rect: Rect): LeafRect[] {
  if (node.type === "leaf") {
    return [{ id: node.id, rect }];
  }

  const [a, b] = node.children;

  if (node.direction === "vertical") {
    const w1 = rect.width * node.ratio;
    const w2 = rect.width - w1;

    return [
      ...layoutNode(a, {
        x: rect.x,
        y: rect.y,
        width: w1,
        height: rect.height,
      }),
      ...layoutNode(b, {
        x: rect.x + w1,
        y: rect.y,
        width: w2,
        height: rect.height,
      }),
    ];
  }

  const h1 = rect.height * node.ratio;
  const h2 = rect.height - h1;

  return [
    ...layoutNode(a, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: h1,
    }),
    ...layoutNode(b, {
      x: rect.x,
      y: rect.y + h1,
      width: rect.width,
      height: h2,
    }),
  ];
}

export function getRenderableLeafRects(layout: LayoutState, canvasRect: Rect): LeafRect[] {
  const aspectRect = fitAspectRect(canvasRect, layout.aspectRatio);
  const paddedRect = insetRect(aspectRect, layout.padding);
  return layoutNode(layout.root, paddedRect).map((leaf) => ({
    id: leaf.id,
    rect: insetRect(leaf.rect, layout.gap / 2),
  }));
}

export function hitTestLeaf(point: Point, leafRects: LeafRect[]): string | undefined {
  for (const item of leafRects) {
    const { x, y, width, height } = item.rect;

    if (
      point.x >= x &&
      point.x <= x + width &&
      point.y >= y &&
      point.y <= y + height
    ) {
      return item.id;
    }
  }

  return undefined;
}

export function getSplitGesture(start: Point, end: Point, leafRect: Rect): SplitGesture {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const direction: SplitDirection = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const rawRatio =
    direction === "vertical"
      ? (midpoint.x - leafRect.x) / leafRect.width
      : (midpoint.y - leafRect.y) / leafRect.height;

  return {
    direction,
    ratio: clampRatio(rawRatio),
  };
}

export function findLeafRect(leafId: string, leafRects: LeafRect[]): Rect | undefined {
  return leafRects.find((leaf) => leaf.id === leafId)?.rect;
}

export function splitLeaf(
  node: CollageNode,
  leafId: string,
  direction: SplitDirection,
  ratio: number,
): CollageNode {
  if (node.type === "leaf") {
    if (node.id !== leafId) {
      return node;
    }

    return {
      id: createId("split"),
      type: "split",
      direction,
      ratio: clampRatio(ratio),
      children: [
        { id: createId("leaf"), type: "leaf" },
        { id: createId("leaf"), type: "leaf" },
      ],
    };
  }

  return {
    ...node,
    children: [
      splitLeaf(node.children[0], leafId, direction, ratio),
      splitLeaf(node.children[1], leafId, direction, ratio),
    ],
  };
}

export function removeSplit(node: CollageNode, splitId: string): CollageNode {
  if (node.type === "leaf") {
    return node;
  }

  if (node.id === splitId) {
    return createRootLeaf();
  }

  return {
    ...node,
    children: [
      removeSplit(node.children[0], splitId),
      removeSplit(node.children[1], splitId),
    ],
  };
}

export function updateSplitRatio(
  node: CollageNode,
  splitId: string,
  ratio: number,
): CollageNode {
  if (node.type === "leaf") {
    return node;
  }

  const nextNode = node.id === splitId ? { ...node, ratio: clampRatio(ratio) } : node;

  return {
    ...nextNode,
    children: [
      updateSplitRatio(nextNode.children[0], splitId, ratio),
      updateSplitRatio(nextNode.children[1], splitId, ratio),
    ],
  };
}

export function getSplitHandles(node: CollageNode, rect: Rect): SplitHandle[] {
  if (node.type === "leaf") {
    return [];
  }

  const handleSize = 12;
  const lineCenter =
    node.direction === "vertical"
      ? rect.x + rect.width * node.ratio
      : rect.y + rect.height * node.ratio;
  const lineRect =
    node.direction === "vertical"
      ? {
          x: lineCenter - handleSize / 2,
          y: rect.y,
          width: handleSize,
          height: rect.height,
        }
      : {
          x: rect.x,
          y: lineCenter - handleSize / 2,
          width: rect.width,
          height: handleSize,
        };

  const [aRect, bRect] =
    node.direction === "vertical"
      ? [
          { x: rect.x, y: rect.y, width: rect.width * node.ratio, height: rect.height },
          {
            x: lineCenter,
            y: rect.y,
            width: rect.width - rect.width * node.ratio,
            height: rect.height,
          },
        ]
      : [
          { x: rect.x, y: rect.y, width: rect.width, height: rect.height * node.ratio },
          {
            x: rect.x,
            y: lineCenter,
            width: rect.width,
            height: rect.height - rect.height * node.ratio,
          },
        ];

  return [
    {
      id: node.id,
      direction: node.direction,
      parentRect: rect,
      lineRect,
      ratio: node.ratio,
    },
    ...getSplitHandles(node.children[0], aRect),
    ...getSplitHandles(node.children[1], bRect),
  ];
}
