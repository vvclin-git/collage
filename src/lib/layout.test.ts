import { describe, expect, it } from "vitest";
import type { CollageNode, LayoutState } from "../types";
import {
  aspectRatioValue,
  clampRatio,
  getPreviewSpacingScale,
  equalizeSplitChildren,
  equalizeSelectedLeaves,
  getRenderableLeafRects,
  getSplitGesture,
  layoutNode,
  removeSplit,
  splitLeaf,
  updateSplitRatio,
} from "./layout";

const root: CollageNode = { id: "root", type: "leaf" };

describe("layout engine", () => {
  it("returns one rect for a leaf node", () => {
    expect(layoutNode(root, { x: 0, y: 0, width: 100, height: 80 })).toEqual([
      { id: "root", rect: { x: 0, y: 0, width: 100, height: 80 } },
    ]);
  });

  it("calculates vertical and horizontal nested splits", () => {
    const tree: CollageNode = {
      id: "split-a",
      type: "split",
      direction: "vertical",
      ratio: 0.4,
      children: [
        { id: "left", type: "leaf" },
        {
          id: "split-b",
          type: "split",
          direction: "horizontal",
          ratio: 0.25,
          children: [
            { id: "top", type: "leaf" },
            { id: "bottom", type: "leaf" },
          ],
        },
      ],
    };

    expect(layoutNode(tree, { x: 0, y: 0, width: 100, height: 80 })).toEqual([
      { id: "left", rect: { x: 0, y: 0, width: 40, height: 80 } },
      { id: "top", rect: { x: 40, y: 0, width: 60, height: 20 } },
      { id: "bottom", rect: { x: 40, y: 20, width: 60, height: 60 } },
    ]);
  });

  it("splits only the requested leaf and clamps ratio", () => {
    const next = splitLeaf(root, "root", "vertical", 0.95);

    expect(next.type).toBe("split");
    if (next.type === "split") {
      expect(next.direction).toBe("vertical");
      expect(next.ratio).toBe(0.85);
      expect(next.children).toHaveLength(2);
    }
  });

  it("updates and removes split nodes immutably", () => {
    const tree = splitLeaf(root, "root", "horizontal", 0.5);
    if (tree.type !== "split") {
      throw new Error("Expected split.");
    }

    const updated = updateSplitRatio(tree, tree.id, 0.1);
    expect(updated).not.toBe(tree);
    expect(updated.type).toBe("split");
    if (updated.type === "split") {
      expect(updated.ratio).toBe(0.15);
    }

    const removed = removeSplit(updated, tree.id);
    expect(removed.type).toBe("leaf");
  });

  it("applies aspect ratio, padding, and gap", () => {
    const layout: LayoutState = {
      root,
      gap: 10,
      padding: 20,
      aspectRatio: { kind: "preset", value: "1:1" },
    };

    expect(getRenderableLeafRects(layout, { x: 0, y: 0, width: 200, height: 100 })).toEqual([
      { id: "root", rect: { x: 75, y: 25, width: 50, height: 50 } },
    ]);
  });

  it("scales editor spacing previews against export size", () => {
    const layout: LayoutState = {
      root,
      gap: 16,
      padding: 16,
      aspectRatio: { kind: "preset", value: "1:1" },
    };
    const scale = getPreviewSpacingScale({ x: 0, y: 0, width: 256, height: 256 }, { kind: "preset", value: "1:1" });

    expect(scale).toBe(0.125);
    expect(getRenderableLeafRects(layout, { x: 0, y: 0, width: 256, height: 256 }, scale)).toEqual([
      { id: "root", rect: { x: 3, y: 3, width: 250, height: 250 } },
    ]);
  });

  it("clamps split ratios", () => {
    expect(clampRatio(0)).toBe(0.15);
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(1)).toBe(0.85);
  });

  it("supports portrait and landscape aspect ratios", () => {
    expect(aspectRatioValue({ kind: "preset", value: "4:5" })).toBe(4 / 5);
    expect(aspectRatioValue({ kind: "preset", value: "5:4" })).toBe(5 / 4);
    expect(aspectRatioValue({ kind: "preset", value: "3:4" })).toBe(3 / 4);
    expect(aspectRatioValue({ kind: "preset", value: "4:3" })).toBe(4 / 3);
    expect(aspectRatioValue({ kind: "preset", value: "16:9" })).toBe(16 / 9);
    expect(aspectRatioValue({ kind: "preset", value: "9:16" })).toBe(9 / 16);
    expect(aspectRatioValue({ kind: "custom", width: 7, height: 3 })).toBe(7 / 3);
  });

  it("equalizes arbitrary selected leaf widths without changing horizontal ratios or IDs", () => {
    const tree: CollageNode = { id: "v", type: "split", direction: "vertical", ratio: 0.3, children: [
      { id: "a", type: "leaf" },
      { id: "h", type: "split", direction: "horizontal", ratio: 0.4, children: [
        { id: "b", type: "leaf" },
        { id: "v2", type: "split", direction: "vertical", ratio: 0.7, children: [{ id: "c", type: "leaf" }, { id: "d", type: "leaf" }] },
      ] },
    ] };
    const snapshot = structuredClone(tree);
    const result = equalizeSelectedLeaves(tree, new Set(["a", "c"]), "width");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rects = layoutNode(result.root, { x: 0, y: 0, width: 1, height: 1 });
    expect(rects.find((x) => x.id === "a")!.rect.width).toBeCloseTo(rects.find((x) => x.id === "c")!.rect.width, 12);
    expect(result.root.type).toBe("split");
    if (result.root.type !== "split") return;
    expect((result.root.children[1] as Extract<CollageNode, { type: "split" }>).ratio).toBe(0.4);
    expect(tree).toEqual(snapshot);
    expect(rects.map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("reports explicit selection failures", () => {
    expect(equalizeSelectedLeaves(root, new Set(["root"]), "width")).toEqual({ ok: false, reason: "insufficient-selection" });
    expect(equalizeSelectedLeaves(root, new Set(["root", "missing"]), "width")).toEqual({ ok: false, reason: "stale-leaf-ids" });
  });

  it("equalizes heights while preserving every vertical ratio", () => {
    const tree: CollageNode = {
      id: "h",
      type: "split",
      direction: "horizontal",
      ratio: 0.7,
      children: [
        { id: "v", type: "split", direction: "vertical", ratio: 0.23, children: [{ id: "a", type: "leaf" }, { id: "b", type: "leaf" }] },
        { id: "c", type: "leaf" },
      ],
    };
    const result = equalizeSelectedLeaves(tree, new Set(["a", "c"]), "height");
    expect(result.ok).toBe(true);
    if (!result.ok || result.root.type !== "split" || result.root.children[0].type !== "split") return;
    const rects = layoutNode(result.root, { x: 0, y: 0, width: 1, height: 1 });
    expect(rects.find((item) => item.id === "a")!.rect.height).toBeCloseTo(rects.find((item) => item.id === "c")!.rect.height, 12);
    expect(result.root.children[0].ratio).toBe(0.23);
  });

  it("distinguishes incompatible topology from ratio-limit failure", () => {
    const incompatible: CollageNode = { id: "h", type: "split", direction: "horizontal", ratio: 0.5, children: [
      { id: "a", type: "leaf" },
      { id: "v", type: "split", direction: "vertical", ratio: 0.5, children: [{ id: "b", type: "leaf" }, { id: "c", type: "leaf" }] },
    ] };
    expect(equalizeSelectedLeaves(incompatible, new Set(["a", "b", "c"]), "width")).toEqual({ ok: false, reason: "incompatible-topology" });

    let chain: CollageNode = { id: "g", type: "leaf" };
    const selected = new Set(["g"]);
    for (let index = 5; index >= 0; index -= 1) {
      const id = `l${index}`;
      selected.add(id);
      chain = { id: `s${index}`, type: "split", direction: "vertical", ratio: 0.5, children: [{ id, type: "leaf" }, chain] };
    }
    expect(equalizeSelectedLeaves(chain, selected, "width")).toEqual({ ok: false, reason: "ratio-limits" });
  });

  it("is deterministic for deep trees and orders changed split IDs by preservation priority", () => {
    const tree: CollageNode = {
      id: "outer", type: "split", direction: "vertical", ratio: 0.4,
      children: [
        { id: "a", type: "leaf" },
        { id: "inner", type: "split", direction: "vertical", ratio: 0.6, children: [
          { id: "b", type: "leaf" },
          { id: "deep", type: "split", direction: "vertical", ratio: 0.55, children: [{ id: "c", type: "leaf" }, { id: "d", type: "leaf" }] },
        ] },
      ],
    };
    const before = structuredClone(tree);
    const first = equalizeSelectedLeaves(tree, new Set(["a", "c"]), "width");
    const second = equalizeSelectedLeaves(tree, new Set(["a", "c"]), "width");
    expect(first).toEqual(second);
    expect(tree).toEqual(before);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.changedSplitIds).toEqual([...new Set(first.changedSplitIds)]);
    expect(first.root.type).toBe("split");
    if (first.root.type !== "split") return;
    expect(first.root.ratio).toBe(0.4);
    expect(first.changedSplitIds).not.toContain("outer");
    expect(first.changedSplitIds.length).toBeGreaterThan(0);
    const ids = layoutNode(first.root, { x: 0, y: 0, width: 1, height: 1 }).map((item) => item.id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("maps swipe direction to the divider line orientation", () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 };

    expect(getSplitGesture({ x: 20, y: 40 }, { x: 180, y: 45 }, rect)).toEqual({
      direction: "horizontal",
      ratio: 0.425,
    });
    expect(getSplitGesture({ x: 90, y: 10 }, { x: 95, y: 90 }, rect)).toEqual({
      direction: "vertical",
      ratio: 0.4625,
    });
  });

  it("equalizes same-direction children under a split", () => {
    const tree: CollageNode = {
      id: "row",
      type: "split",
      direction: "vertical",
      ratio: 0.1,
      children: [
        { id: "a", type: "leaf" },
        {
          id: "row-b",
          type: "split",
          direction: "vertical",
          ratio: 0.7,
          children: [
            { id: "b", type: "leaf" },
            {
              id: "row-c",
              type: "split",
              direction: "vertical",
              ratio: 0.25,
              children: [
                { id: "c", type: "leaf" },
                {
                  id: "row-d",
                  type: "split",
                  direction: "vertical",
                  ratio: 0.8,
                  children: [
                    { id: "d", type: "leaf" },
                    { id: "e", type: "leaf" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const equalized = equalizeSplitChildren(tree, "row");

    expect(layoutNode(equalized, { x: 0, y: 0, width: 100, height: 50 })).toEqual([
      { id: "a", rect: { x: 0, y: 0, width: 20, height: 50 } },
      { id: "b", rect: { x: 20, y: 0, width: 20, height: 50 } },
      { id: "c", rect: { x: 40, y: 0, width: 20, height: 50 } },
      { id: "d", rect: { x: 60, y: 0, width: 20, height: 50 } },
      { id: "e", rect: { x: 80, y: 0, width: 20, height: 50 } },
    ]);
  });
});
