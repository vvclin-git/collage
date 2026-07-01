import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AspectRatio } from "../types";
import { CollageControls, LayoutControls } from "./Toolbar";

function AspectHarness() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>({ kind: "preset", value: "1:1" });
  return <LayoutControls aspectRatio={aspectRatio} canDeleteSplit={false} selectedCellCount={0}
    onAspectRatioChange={setAspectRatio} onDeleteSplit={vi.fn()} onEqualize={vi.fn()} onReset={vi.fn()} onNext={vi.fn()} />;
}

describe("Toolbar controls", () => {
  it("validates, applies, and remembers a custom aspect draft", () => {
    render(<AspectHarness />);
    fireEvent.change(screen.getByLabelText("Aspect"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "1" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("1:10 through 10:1");

    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.change(screen.getByLabelText("Aspect"), { target: { value: "4:3" } });
    fireEvent.change(screen.getByLabelText("Aspect"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Width")).toHaveValue(2);
    expect(screen.getByLabelText("Height")).toHaveValue(3);
  });

  it("keeps spacing out of layout controls and available in both collage modes", () => {
    const base = { canRemovePhoto: false, canZoomPhoto: false, isExporting: false, zoomScale: 1, gap: 24, padding: 16,
      onImportFiles: vi.fn(), onToggleInteractionMode: vi.fn(), onZoomChange: vi.fn(), onSpacingChange: vi.fn(), onRemovePhoto: vi.fn(), onEditLayout: vi.fn(), onExport: vi.fn() };
    const { rerender } = render(<LayoutControls aspectRatio={{ kind: "preset", value: "1:1" }} canDeleteSplit={false} selectedCellCount={0}
      onAspectRatioChange={vi.fn()} onDeleteSplit={vi.fn()} onEqualize={vi.fn()} onReset={vi.fn()} onNext={vi.fn()} />);
    expect(screen.queryByLabelText(/^Gap/)).not.toBeInTheDocument();
    rerender(<CollageControls {...base} interactionMode="photo" />);
    expect(screen.getByLabelText(/^Gap/)).toHaveValue("24");
    expect(screen.getByLabelText(/^Padding/)).toHaveValue("16");
    rerender(<CollageControls {...base} interactionMode="adjust" />);
    expect(screen.getByLabelText(/^Gap/)).toHaveValue("24");
    expect(screen.getByLabelText(/^Padding/)).toHaveValue("16");
  });

  it("enables both equalize actions only after two cells are selected", () => {
    const onEqualize = vi.fn();
    const props = { aspectRatio: { kind: "preset", value: "1:1" } as AspectRatio, canDeleteSplit: false,
      onAspectRatioChange: vi.fn(), onDeleteSplit: vi.fn(), onEqualize, onReset: vi.fn(), onNext: vi.fn() };
    const { rerender } = render(<LayoutControls {...props} selectedCellCount={1} />);
    expect(screen.getByRole("button", { name: "Equalize Widths" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Equalize Heights" })).toBeDisabled();
    rerender(<LayoutControls {...props} selectedCellCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Equalize Widths" }));
    fireEvent.click(screen.getByRole("button", { name: "Equalize Heights" }));
    expect(onEqualize).toHaveBeenNthCalledWith(1, "width");
    expect(onEqualize).toHaveBeenNthCalledWith(2, "height");
  });
});
