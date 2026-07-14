import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("react-konva", () => ({
  Stage: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Image: () => null,
}));
vi.mock("../hooks/useElementSize", () => ({
  useElementSize: () => ({ ref: { current: null }, size: { width: 800, height: 600 } }),
  useLoadedImage: () => undefined,
}));
vi.mock("../lib/export", () => ({ exportCollage: vi.fn(() => Promise.resolve()) }));

import { CollageEditor } from "./CollageEditor";
import { useCollageStore } from "../store/useCollageStore";

const photos = [
  { id: "a", src: "blob:a", fileName: "a.jpg", width: 10, height: 10, mimeType: "image/jpeg" },
  { id: "b", src: "blob:b", fileName: "b.jpg", width: 10, height: 10, mimeType: "image/jpeg" },
];

describe("CollageEditor photo clearing", () => {
  beforeEach(() => {
    useCollageStore.setState({ workflowStep: "edit-collage", photos, placements: {} });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("includes the count and placements warning, and cancellation preserves photos", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CollageEditor onImportFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(confirm).toHaveBeenCalledWith("Clear all 2 photos? The collage layout and placements will be reset.");
    expect(useCollageStore.getState().photos).toHaveLength(2);
  });

  it("clears all photos after confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CollageEditor onImportFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(useCollageStore.getState().photos).toEqual([]);
    expect(useCollageStore.getState().workflowStep).toBe("start");
  });

  it("keeps layout replacement controls folded until requested", () => {
    render(<CollageEditor onImportFiles={vi.fn()} />);
    const disclosure = screen.getByRole("button", { name: "Layout Options" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Horizontal" })).not.toBeInTheDocument();
    fireEvent.click(disclosure);
    expect(screen.getByRole("button", { name: "Horizontal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vertical" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Layout" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Photo" })).not.toBeInTheDocument();
  });

  it("removing a photo invalidates the layout and returns to layout choice", () => {
    render(<CollageEditor onImportFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove a.jpg" }));
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "choose-layout", photos: [photos[1]], placements: {} });
  });
});
