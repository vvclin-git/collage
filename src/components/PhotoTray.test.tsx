import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { PhotoTray } from "./PhotoTray";

const photo = { id: "photo-1", src: "blob:test", fileName: "one.jpg", width: 100, height: 100, mimeType: "image/jpeg" };

describe("PhotoTray", () => {
  it("removes one photo immediately and exposes clear all", () => {
    const onRemovePhoto = vi.fn();
    const onClearAll = vi.fn();
    render(<PhotoTray photos={[photo]} photoCount={1} isPickingDisabled={false} selectedCellId="leaf-1" isExporting={false}
      onClearAll={onClearAll} onPickPhoto={vi.fn()} onRemovePhoto={onRemovePhoto} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove one.jpg" }));
    expect(onRemovePhoto).toHaveBeenCalledWith("photo-1");
    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it.each([{ photoCount: 0, isExporting: false }, { photoCount: 1, isExporting: true }])(
    "disables clear all for $photoCount photos when exporting=$isExporting",
    ({ photoCount, isExporting }) => {
      render(<PhotoTray photos={photoCount ? [photo] : []} photoCount={photoCount} isPickingDisabled={false} isExporting={isExporting}
        onClearAll={vi.fn()} onPickPhoto={vi.fn()} onRemovePhoto={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Clear All" })).toBeDisabled();
    },
  );
});
