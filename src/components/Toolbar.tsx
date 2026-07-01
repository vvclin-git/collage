import { useEffect, useState } from "react";
import type { AspectRatio, AspectRatioPreset } from "../types";

export type CollageInteractionMode = "photo" | "adjust";

const presets: AspectRatioPreset[] = ["1:1", "4:5", "5:4", "3:4", "4:3", "16:9", "9:16"];

type LayoutControlsProps = {
  aspectRatio: AspectRatio;
  canDeleteSplit: boolean;
  selectedCellCount: number;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
  onDeleteSplit: () => void;
  onEqualize: (axis: "width" | "height") => void;
  onReset: () => void;
  onNext: () => void;
};

export function LayoutControls({ aspectRatio, canDeleteSplit, selectedCellCount, onAspectRatioChange, onDeleteSplit, onEqualize, onReset, onNext }: LayoutControlsProps) {
  const [customWidth, setCustomWidth] = useState(aspectRatio.kind === "custom" ? String(aspectRatio.width) : "1");
  const [customHeight, setCustomHeight] = useState(aspectRatio.kind === "custom" ? String(aspectRatio.height) : "1");
  const [selectedValue, setSelectedValue] = useState<AspectRatioPreset | "custom">(
    aspectRatio.kind === "preset" ? aspectRatio.value : "custom",
  );
  useEffect(() => {
    setSelectedValue(aspectRatio.kind === "preset" ? aspectRatio.value : "custom");
    if (aspectRatio.kind === "custom") {
      setCustomWidth(String(aspectRatio.width));
      setCustomHeight(String(aspectRatio.height));
    }
  }, [aspectRatio]);
  const width = Number(customWidth);
  const height = Number(customHeight);
  const ratio = width / height;
  const customValid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 && ratio >= 0.1 && ratio <= 10;

  return <section className="control-panel" aria-label="Layout controls">
    <label>Aspect
      <select value={selectedValue} onChange={(event) => {
        const value = event.target.value as AspectRatioPreset | "custom";
        setSelectedValue(value);
        if (value === "custom") {
          return;
        }
        onAspectRatioChange({ kind: "preset", value });
      }}>
        {presets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
        <option value="custom">Custom</option>
      </select>
    </label>
    {selectedValue === "custom" ? <div className="custom-aspect" aria-label="Custom aspect ratio">
      <label>Width<input type="number" min="0" step="any" value={customWidth} onChange={(event) => setCustomWidth(event.target.value)} /></label>
      <label>Height<input type="number" min="0" step="any" value={customHeight} onChange={(event) => setCustomHeight(event.target.value)} /></label>
      <button type="button" className="secondary" disabled={!customValid} onClick={() => onAspectRatioChange({ kind: "custom", width, height })}>Apply</button>
      {!customValid ? <span className="field-error" role="alert">Use positive values with a ratio from 1:10 through 10:1.</span> : null}
    </div> : null}
    <p className="selection-status" aria-live="polite">{selectedCellCount} cells selected</p>
    <div className="button-row">
      <button type="button" className="secondary" onClick={onReset}>Reset</button>
      <button type="button" className="secondary" onClick={onDeleteSplit} disabled={!canDeleteSplit}>Delete Line</button>
      <button type="button" className="secondary" onClick={() => onEqualize("width")} disabled={selectedCellCount < 2}>Equalize Widths</button>
      <button type="button" className="secondary" onClick={() => onEqualize("height")} disabled={selectedCellCount < 2}>Equalize Heights</button>
      <button type="button" onClick={onNext}>Next</button>
    </div>
  </section>;
}

type CollageControlsProps = {
  canRemovePhoto: boolean; canZoomPhoto: boolean; interactionMode: CollageInteractionMode; isExporting: boolean;
  zoomScale: number; gap: number; padding: number;
  onImportFiles: (files: FileList) => void; onToggleInteractionMode: () => void; onZoomChange: (scale: number) => void;
  onSpacingChange: (gap: number, padding: number) => void; onRemovePhoto: () => void; onEditLayout: () => void; onExport: () => void;
};

export function CollageControls({ canRemovePhoto, canZoomPhoto, interactionMode, isExporting, zoomScale, gap, padding, onImportFiles, onToggleInteractionMode, onZoomChange, onSpacingChange, onRemovePhoto, onEditLayout, onExport }: CollageControlsProps) {
  return <section className="control-panel compact" aria-label="Collage controls">
    <label className="file-button">Import Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) onImportFiles(event.target.files); event.target.value = ""; }} /></label>
    <button type="button" className={interactionMode === "adjust" ? "mode-toggle is-active" : "mode-toggle"} onClick={onToggleInteractionMode}>{interactionMode === "adjust" ? "Photo Editing" : "Adjust Layout"}</button>
    <label>Gap <strong>{gap}px</strong><input type="range" min="0" max="64" value={gap} onChange={(e) => onSpacingChange(Number(e.target.value), padding)} /></label>
    <label>Padding <strong>{padding}px</strong><input type="range" min="0" max="128" value={padding} onChange={(e) => onSpacingChange(gap, Number(e.target.value))} /></label>
    <label>Zoom <strong>{zoomScale.toFixed(2)}x</strong><input type="range" min="1" max="4" step="0.01" value={zoomScale} disabled={!canZoomPhoto || interactionMode === "adjust"} onChange={(e) => onZoomChange(Number(e.target.value))} /></label>
    <div className="button-row"><button type="button" className="secondary" onClick={onEditLayout}>Edit Layout</button><button type="button" className="secondary" onClick={onRemovePhoto} disabled={!canRemovePhoto}>Remove Photo</button><button type="button" onClick={onExport} disabled={isExporting}>{isExporting ? "Exporting..." : "Export PNG"}</button></div>
  </section>;
}
