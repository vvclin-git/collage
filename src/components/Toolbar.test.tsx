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

  it("rounds committed custom aspect values to four decimal places", () => {
    render(<LayoutControls aspectRatio={{ kind: "custom", width: 5.324999999999, height: 1.23456789 }} canDeleteSplit={false} selectedCellCount={0}
      onAspectRatioChange={vi.fn()} onDeleteSplit={vi.fn()} onEqualize={vi.fn()} onReset={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByLabelText("Width")).toHaveValue(5.325);
    expect(screen.getByLabelText("Height")).toHaveValue(1.2346);
  });

  it("keeps spacing out of layout controls and collapsed under Advanced in both collage modes", () => {
    const base = { canZoomPhoto: false, isExporting: false, zoomScale: 1, gap: 24, padding: 16,
      onImportFiles: vi.fn(), onToggleInteractionMode: vi.fn(), onZoomChange: vi.fn(), onSpacingChange: vi.fn(), onExport: vi.fn() };
    const { rerender } = render(<LayoutControls aspectRatio={{ kind: "preset", value: "1:1" }} canDeleteSplit={false} selectedCellCount={0}
      onAspectRatioChange={vi.fn()} onDeleteSplit={vi.fn()} onEqualize={vi.fn()} onReset={vi.fn()} onNext={vi.fn()} />);
    expect(screen.queryByLabelText(/^Gap/)).not.toBeInTheDocument();
    rerender(<CollageControls {...base} interactionMode="photo" />);
    expect(screen.queryByLabelText(/^Zoom/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Gap/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Padding/Gap" }));
    expect(screen.getByLabelText(/^Gap/)).toHaveValue("24");
    expect(screen.getByLabelText(/^Padding/)).toHaveValue("16");
    rerender(<CollageControls {...base} interactionMode="adjust" />);
    expect(screen.getByLabelText(/^Gap/)).toHaveValue("24");
    expect(screen.getByLabelText(/^Padding/)).toHaveValue("16");
  });

  it("shows zoom only when a placed photo can be adjusted", () => {
    const base = { isExporting: false, interactionMode: "photo" as const, zoomScale: 1.25, gap: 24, padding: 16,
      onImportFiles: vi.fn(), onToggleInteractionMode: vi.fn(), onZoomChange: vi.fn(), onSpacingChange: vi.fn(), onExport: vi.fn() };
    const { rerender } = render(<CollageControls {...base} canZoomPhoto={false} />);
    expect(screen.queryByLabelText(/^Zoom/)).not.toBeInTheDocument();
    rerender(<CollageControls {...base} canZoomPhoto />);
    expect(screen.getByLabelText(/^Zoom/)).toHaveValue("1.25");
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

  it("disables fine-tune mutations while an export is running", () => {
    const base = { canZoomPhoto: true, interactionMode: "photo" as const, isExporting: true,
      zoomScale: 1, gap: 24, padding: 16, onImportFiles: vi.fn(), onToggleInteractionMode: vi.fn(),
      onZoomChange: vi.fn(), onSpacingChange: vi.fn(), onExport: vi.fn() };
    render(<CollageControls {...base} />);
    expect(screen.getByLabelText("Import Photos")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adjust Layout" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exporting..." })).toBeDisabled();
  });
});
