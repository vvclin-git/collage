import { describe, expect, it, vi } from "vitest";
import {
  createDefaultExportFileName,
  getExportFileName,
  getExportRect,
} from "./export";

describe("export sizing", () => {
  it("keeps the longest custom-ratio dimension at the requested size", () => {
    expect(
      getExportRect({ kind: "custom", width: 7, height: 3 }, 2048),
    ).toEqual({ x: 0, y: 0, width: 2048, height: 878 });
    expect(
      getExportRect({ kind: "custom", width: 2, height: 5 }, 2048),
    ).toEqual({ x: 0, y: 0, width: 819, height: 2048 });
  });
});

describe("export filenames", () => {
  it("preserves an explicit filename override", () => {
    expect(getExportFileName({ fileName: "family.png" })).toBe("family.png");
  });

  it("uses a millisecond timestamp and sequences exports in the same millisecond", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 9, 8, 7, 6));

    expect(createDefaultExportFileName()).toBe("collage-20260701-090807-006.png");
    expect(createDefaultExportFileName()).toBe("collage-20260701-090807-006-1.png");
    expect(createDefaultExportFileName()).toBe("collage-20260701-090807-006-2.png");

    vi.advanceTimersByTime(1);
    expect(createDefaultExportFileName()).toBe("collage-20260701-090807-007.png");
    vi.useRealTimers();
  });
});
