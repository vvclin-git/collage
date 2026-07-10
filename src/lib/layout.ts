import type {
  AspectRatio,
  AspectRatioPreset,
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
export const DEFAULT_EXPORT_SIZE = 2048;

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

export type EqualizeAxis = "width" | "height";
export type EqualizeFailureReason =
  | "insufficient-selection"
  | "stale-leaf-ids"
  | "incompatible-topology"
  | "ratio-limits"
  | "numerical-failure";
export type EqualizeLeavesResult =
  | { ok: true; root: CollageNode; changedSplitIds: string[] }
  | { ok: false; reason: EqualizeFailureReason };

export type WeightedLinearLayoutFailureReason = "empty-weights" | "invalid-weight";
export type WeightedLinearLayoutResult =
  | { ok: true; root: CollageNode; leafIds: string[] }
  | { ok: false; reason: WeightedLinearLayoutFailureReason };

export function createRootLeaf(): CollageNode {
  return { id: createId("leaf"), type: "leaf" };
}

export function createWeightedLinearLayout(
  weights: readonly number[],
  direction: SplitDirection,
): WeightedLinearLayoutResult {
  if (weights.length === 0) {
    return { ok: false, reason: "empty-weights" };
  }

  if (weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    return { ok: false, reason: "invalid-weight" };
  }

  // Normalizing avoids overflow when otherwise-valid finite weights are very large.
  const maximumWeight = Math.max(...weights);
  const normalizedWeights = weights.map((weight) => weight / maximumWeight);
  const leafIds: string[] = [];

  function build(start: number, end: number): CollageNode {
    if (end - start === 1) {
      const leaf = createRootLeaf();
      leafIds.push(leaf.id);
      return leaf;
    }

    // Partition by count so the tree remains balanced while each subtree covers
    // one contiguous range of the original visual order.
    const midpoint = start + Math.floor((end - start) / 2);
    const leftWeight = normalizedWeights
      .slice(start, midpoint)
      .reduce((sum, weight) => sum + weight, 0);
    const rightWeight = normalizedWeights
      .slice(midpoint, end)
      .reduce((sum, weight) => sum + weight, 0);

    return {
      id: createId("split"),
      type: "split",
      direction,
      ratio: clampRatio(leftWeight / (leftWeight + rightWeight)),
      children: [build(start, midpoint), build(midpoint, end)],
    };
  }

  return { ok: true, root: build(0, weights.length), leafIds };
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
  if (aspectRatio.kind === "custom") {
    return aspectRatio.width / aspectRatio.height;
  }
  return presetAspectRatioValue(aspectRatio.value);
}

function presetAspectRatioValue(aspectRatio: AspectRatioPreset): number {
  switch (aspectRatio) {
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "5:4":
      return 5 / 4;
    case "3:4":
      return 3 / 4;
    case "4:3":
      return 4 / 3;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
  }
}

type Interval = { min: number; max: number };

function intersect(a: Interval, b: Interval): Interval | undefined {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min <= max + 1e-13 ? { min, max } : undefined;
}

function axisDirection(axis: EqualizeAxis): SplitDirection {
  return axis === "width" ? "vertical" : "horizontal";
}

function chooseExtent(interval: Interval, preferred: number): number {
  return Math.max(interval.min, Math.min(interval.max, preferred));
}

export function equalizeSelectedLeaves(root: CollageNode, selectedLeafIds: ReadonlySet<string>, axis: EqualizeAxis): EqualizeLeavesResult {
  if (selectedLeafIds.size < 2) return { ok: false, reason: "insufficient-selection" };
  const leaves = layoutNode(root, { x: 0, y: 0, width: 1, height: 1 });
  const leafIds = new Set(leaves.map((leaf) => leaf.id));
  if (leafIds.size !== leaves.length) return { ok: false, reason: "incompatible-topology" };
  if ([...selectedLeafIds].some((id) => !leafIds.has(id))) return { ok: false, reason: "stale-leaf-ids" };
  const direction = axisDirection(axis);
  const originalTargets = leaves.filter((leaf) => selectedLeafIds.has(leaf.id)).map((leaf) => axis === "width" ? leaf.rect.width : leaf.rect.height);
  type Constraint = Interval | undefined | null;
  const scale = (value: Constraint, factor: number): Constraint => value == null ? value : ({ min: value.min * factor, max: value.max * factor });
  const combine = (a: Constraint, b: Constraint): Constraint => {
    if (a === null || b === null) return null;
    if (!a) return b;
    if (!b) return a;
    return intersect(a, b) ?? null;
  };
  const feasible = (node: CollageNode, locks: ReadonlyMap<string, number>, min = MIN_SPLIT_RATIO, max = MAX_SPLIT_RATIO): Constraint => {
    if (node.type === "leaf") return selectedLeafIds.has(node.id) ? { min: 1, max: 1 } : undefined;
    const a = feasible(node.children[0], locks, min, max);
    const b = feasible(node.children[1], locks, min, max);
    if (a === null || b === null) return null;
    if (node.direction !== direction) return combine(a, b);
    const locked = locks.get(node.id);
    if (locked !== undefined) return combine(scale(a, locked), scale(b, 1 - locked));
    if (!a && b) return { min: b.min * min, max: b.max * max };
    if (!b && a) return { min: a.min * min, max: a.max * max };
    if (!a || !b) return undefined;
    const points: Array<[number, number]> = [];
    const add = (qa: number, qb: number) => {
      const ratio = qb / (qa + qb);
      if (qa >= a.min - 1e-13 && qa <= a.max + 1e-13 && qb >= b.min - 1e-13 && qb <= b.max + 1e-13 && ratio >= min - 1e-13 && ratio <= max + 1e-13) points.push([qa, qb]);
    };
    for (const qa of [a.min, a.max]) for (const qb of [b.min, b.max]) add(qa, qb);
    for (const qa of [a.min, a.max]) {
      add(qa, qa * min / max);
      add(qa, qa * max / min);
    }
    for (const qb of [b.min, b.max]) {
      add(qb * min / max, qb);
      add(qb * max / min, qb);
    }
    if (!points.length) return null;
    const targets = points.map(([qa, qb]) => qa * qb / (qa + qb));
    return { min: Math.min(...targets), max: Math.max(...targets) };
  };

  const ranked: Array<{ id: string; ratio: number; unselected: number; depth: number; order: number }> = [];
  let order = 0;
  const collect = (node: CollageNode, depth: number): number => {
    const currentOrder = order++;
    if (node.type === "leaf") return selectedLeafIds.has(node.id) ? 0 : 1;
    const unselected = collect(node.children[0], depth + 1) + collect(node.children[1], depth + 1);
    if (node.direction === direction) ranked.push({ id: node.id, ratio: node.ratio, unselected, depth, order: currentOrder });
    return unselected;
  };
  collect(root, 0);
  ranked.sort((a, b) => b.unselected - a.unselected || a.depth - b.depth || a.order - b.order);
  const locks = new Map<string, number>();
  for (const split of ranked) {
    locks.set(split.id, split.ratio);
    const interval = feasible(root, locks);
    if (interval === null || (interval && interval.min > interval.max + 1e-12)) locks.delete(split.id);
  }
  const rootInterval = feasible(root, locks);
  if (rootInterval == null || rootInterval.min > rootInterval.max + 1e-12) {
    const relaxed = feasible(root, new Map(), 1e-12, 1 - 1e-12);
    return { ok: false, reason: relaxed && relaxed.min <= relaxed.max ? "ratio-limits" : "incompatible-topology" };
  }
  const preferredTarget = originalTargets[0]!;
  const target = chooseExtent(rootInterval, preferredTarget);
  const changed: string[] = [];
  const rebuild = (node: CollageNode, q: number): CollageNode | undefined => {
    if (node.type === "leaf") return node;
    if (node.direction !== direction) {
      const a = rebuild(node.children[0], q);
      const b = rebuild(node.children[1], q);
      return a && b ? { ...node, children: [a, b] } : undefined;
    }
    const ai = feasible(node.children[0], locks);
    const bi = feasible(node.children[1], locks);
    let low = MIN_SPLIT_RATIO;
    let high = MAX_SPLIT_RATIO;
    if (ai === null || bi === null) return undefined;
    if (ai) { low = Math.max(low, q / ai.max); high = Math.min(high, q / ai.min); }
    if (bi) { low = Math.max(low, 1 - q / bi.min); high = Math.min(high, 1 - q / bi.max); }
    const ratio = locks.get(node.id) ?? chooseExtent({ min: low, max: high }, node.ratio);
    if (ratio < low - 1e-11 || ratio > high + 1e-11) return undefined;
    const a = rebuild(node.children[0], ai ? q / ratio : q);
    const b = rebuild(node.children[1], bi ? q / (1 - ratio) : q);
    if (!a || !b) return undefined;
    if (Math.abs(ratio - node.ratio) > 1e-14) changed.push(node.id);
    return { ...node, ratio, children: [a, b] };
  };
  const next = rebuild(root, target);
  if (!next) return { ok: false, reason: "numerical-failure" };
  const values = layoutNode(next, { x: 0, y: 0, width: 1, height: 1 }).filter((leaf) => selectedLeafIds.has(leaf.id)).map((leaf) => axis === "width" ? leaf.rect.width : leaf.rect.height);
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value - values[0]!) > 1e-10)) return { ok: false, reason: "numerical-failure" };
  changed.sort((a, b) => ranked.findIndex((item) => item.id === a) - ranked.findIndex((item) => item.id === b));
  return { ok: true, root: next, changedSplitIds: changed };
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

export function getPreviewSpacingScale(canvasRect: Rect, aspectRatio: AspectRatio): number {
  const aspectRect = fitAspectRect(canvasRect, aspectRatio);
  return Math.max(aspectRect.width, aspectRect.height) / DEFAULT_EXPORT_SIZE;
}

export function getRenderableLeafRects(
  layout: LayoutState,
  canvasRect: Rect,
  spacingScale = 1,
): LeafRect[] {
  const aspectRect = fitAspectRect(canvasRect, layout.aspectRatio);
  const paddedRect = insetRect(aspectRect, layout.padding * spacingScale);
  return layoutNode(layout.root, paddedRect).map((leaf) => ({
    id: leaf.id,
    rect: insetRect(leaf.rect, (layout.gap * spacingScale) / 2),
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

function collectSameDirectionSegments(
  node: CollageNode,
  direction: SplitDirection,
): CollageNode[] {
  if (node.type === "split" && node.direction === direction) {
    return [
      ...collectSameDirectionSegments(node.children[0], direction),
      ...collectSameDirectionSegments(node.children[1], direction),
    ];
  }

  return [node];
}

function buildEqualDirectionTree(
  segments: CollageNode[],
  direction: SplitDirection,
  rootId: string,
): CollageNode {
  if (segments.length === 1) {
    return segments[0]!;
  }

  const [first, ...rest] = segments;

  return {
    id: rootId,
    type: "split",
    direction,
    ratio: 1 / segments.length,
    children: [
      first!,
      buildEqualDirectionTree(rest, direction, createId("split")),
    ],
  };
}

export function equalizeSplitChildren(node: CollageNode, splitId: string): CollageNode {
  if (node.type === "leaf") {
    return node;
  }

  if (node.id === splitId) {
    const segments = collectSameDirectionSegments(node, node.direction);
    return buildEqualDirectionTree(segments, node.direction, node.id);
  }

  return {
    ...node,
    children: [
      equalizeSplitChildren(node.children[0], splitId),
      equalizeSplitChildren(node.children[1], splitId),
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
