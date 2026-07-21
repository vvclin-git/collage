import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import type { PhotoAsset } from "../types";
import { ChooseLayoutScreen } from "./ChooseLayoutScreen";
import { ManualAspectPanel } from "./ManualAspectPanel";
import { WorkflowStartScreen } from "./WorkflowStartScreen";

const photo: PhotoAsset = { id: "photo-1", src: "blob:test", fileName: "sunset.jpg", width: 800, height: 600, mimeType: "image/jpeg" };

describe("workflow presentation", () => {
  it("presents an accessible start import action and errors", () => {
    const onImport = vi.fn();
    render(<WorkflowStartScreen onImport={onImport} errorMessage="That image could not be read." />);
    fireEvent.click(screen.getByRole("button", { name: "Import photos" }));
    expect(onImport).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be read");
  });

  it("renders photo-first layout choices and delegates actions", () => {
    const onImport = vi.fn();
    const onRemovePhoto = vi.fn();
    const onSelectHorizontal = vi.fn();
    render(<ChooseLayoutScreen photos={[photo]} onImport={onImport} onRemovePhoto={onRemovePhoto} onClear={vi.fn()}
      onSelectHorizontal={onSelectHorizontal} onSelectVertical={vi.fn()} onSelectManual={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add photos" }));
    fireEvent.click(screen.getByRole("button", { name: /Horizontal/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove sunset.jpg" }));
    expect(onSelectHorizontal).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
    expect(onRemovePhoto).toHaveBeenCalledWith("photo-1");
    expect(screen.queryByLabelText(/^Gap/)).not.toBeInTheDocument();
  });

  it("keeps manual aspect changes local until a valid draft is applied", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<ManualAspectPanel initialValue={{ kind: "preset", value: "1:1" }} onApply={onApply} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Aspect ratio"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "20" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ kind: "custom", width: 2, height: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Close aspect ratio panel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("rounds initial custom aspect fields to four decimal places", () => {
    render(<ManualAspectPanel initialValue={{ kind: "custom", width: 0.5916666666666666, height: 1.23456789 }} onApply={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Width")).toHaveValue(0.5917);
    expect(screen.getByLabelText("Height")).toHaveValue(1.2346);
  });
});
