import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-konva", () => ({
  Stage: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Rect: () => null,
}));

vi.mock("../hooks/useElementSize", () => ({
  useElementSize: () => ({ ref: { current: null }, size: { width: 800, height: 600 } }),
}));

import { useCollageStore } from "../store/useCollageStore";
import { LayoutEditor } from "./LayoutEditor";

describe("LayoutEditor workflow actions", () => {
  beforeEach(() => {
    useCollageStore.setState({
      workflowStep: "manual-layout",
      photos: [],
      placements: {},
      selectedSplitId: undefined,
      selectedCellId: undefined,
      selectedLayoutLeafIds: [],
    });
  });

  it("finishes manual layout without clearing existing placements", () => {
    const placement = { photoId: "photo-a", scale: 1, offsetX: 0, offsetY: 0 };
    useCollageStore.setState({ placements: { cell: placement } });

    render(<LayoutEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(useCollageStore.getState().workflowStep).toBe("edit-collage");
    expect(useCollageStore.getState().placements).toEqual({ cell: placement });
  });

  it("uses contextual controls instead of disabled layout actions", () => {
    render(<LayoutEditor />);

    expect(screen.getByRole("button", { name: "Aspect: 1:1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Delete Line" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Equalize Width" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Equalize Height" })).not.toBeInTheDocument();
  });

  it("returns to layout choice through the manual-layout cancel action", () => {
    render(<LayoutEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(useCollageStore.getState().workflowStep).toBe("choose-layout");
  });
});
