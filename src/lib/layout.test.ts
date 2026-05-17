import { describe, expect, it } from "vitest";
import type { CollageNode, LayoutState } from "../types";
import {
  aspectRatioValue,
  clampRatio,
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
      aspectRatio: "1:1",
    };

    expect(getRenderableLeafRects(layout, { x: 0, y: 0, width: 200, height: 100 })).toEqual([
      { id: "root", rect: { x: 75, y: 25, width: 50, height: 50 } },
    ]);
  });

  it("clamps split ratios", () => {
    expect(clampRatio(0)).toBe(0.15);
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(1)).toBe(0.85);
  });

  it("supports portrait and landscape aspect ratios", () => {
    expect(aspectRatioValue("4:5")).toBe(4 / 5);
    expect(aspectRatioValue("5:4")).toBe(5 / 4);
    expect(aspectRatioValue("3:4")).toBe(3 / 4);
    expect(aspectRatioValue("4:3")).toBe(4 / 3);
    expect(aspectRatioValue("16:9")).toBe(16 / 9);
    expect(aspectRatioValue("9:16")).toBe(9 / 16);
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
});
