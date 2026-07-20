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

  it("does not expose later-stage layout replacement controls", () => {
    render(<CollageEditor onImportFiles={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Layout Options" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Horizontal" })).not.toBeInTheDocument();
  });

  it("exposes structural layout controls and disables photo picking in Adjust Layout", () => {
    render(<CollageEditor onImportFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Adjust Layout" }));
    expect(screen.getByRole("region", { name: "Layout controls" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Equalize Width" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use a.jpg" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Photo Editing" })).toBeInTheDocument();
  });

  it("removing a photo preserves the editing workflow", () => {
    render(<CollageEditor onImportFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove a.jpg" }));
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "edit-collage", photos: [photos[1]], placements: {} });
  });
});
