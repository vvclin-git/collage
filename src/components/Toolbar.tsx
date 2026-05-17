import type { AspectRatio } from "../types";

type LayoutControlsProps = {
  aspectRatio: AspectRatio;
  gap: number;
  padding: number;
  canDeleteSplit: boolean;
  canEqualizeSplit: boolean;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
  onGapChange: (gap: number) => void;
  onPaddingChange: (padding: number) => void;
  onDeleteSplit: () => void;
  onEqualizeSplit: () => void;
  onReset: () => void;
  onNext: () => void;
};

export function LayoutControls({
  aspectRatio,
  gap,
  padding,
  canDeleteSplit,
  canEqualizeSplit,
  onAspectRatioChange,
  onGapChange,
  onPaddingChange,
  onDeleteSplit,
  onEqualizeSplit,
  onReset,
  onNext,
}: LayoutControlsProps) {
  return (
    <section className="control-panel" aria-label="Layout controls">
      <label>
        Aspect
        <select
          value={aspectRatio}
          onChange={(event) => onAspectRatioChange(event.target.value as AspectRatio)}
        >
          <option value="1:1">1:1</option>
          <option value="4:5">4:5</option>
          <option value="5:4">5:4</option>
          <option value="3:4">3:4</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
        </select>
      </label>

      <label>
        Gap <strong>{gap}px</strong>
        <input
          type="range"
          min="0"
          max="64"
          value={gap}
          onChange={(event) => onGapChange(Number(event.target.value))}
        />
      </label>

      <label>
        Padding <strong>{padding}px</strong>
        <input
          type="range"
          min="0"
          max="128"
          value={padding}
          onChange={(event) => onPaddingChange(Number(event.target.value))}
        />
      </label>

      <div className="button-row">
        <button type="button" className="secondary" onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onDeleteSplit}
          disabled={!canDeleteSplit}
        >
          Delete Line
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onEqualizeSplit}
          disabled={!canEqualizeSplit}
        >
          Equalize Cells
        </button>
        <button type="button" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}

type CollageControlsProps = {
  canRemovePhoto: boolean;
  canZoomPhoto: boolean;
  isExporting: boolean;
  onImportFiles: (files: FileList) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRemovePhoto: () => void;
  onEditLayout: () => void;
  onExport: () => void;
};

export function CollageControls({
  canRemovePhoto,
  canZoomPhoto,
  isExporting,
  onImportFiles,
  onZoomIn,
  onZoomOut,
  onRemovePhoto,
  onEditLayout,
  onExport,
}: CollageControlsProps) {
  return (
    <section className="control-panel compact" aria-label="Collage controls">
      <label className="file-button">
        Import Photos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              onImportFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
      </label>

      <div className="button-row">
        <button type="button" className="secondary" onClick={onZoomOut} disabled={!canZoomPhoto}>
          Zoom -
        </button>
        <button type="button" className="secondary" onClick={onZoomIn} disabled={!canZoomPhoto}>
          Zoom +
        </button>
        <button type="button" className="secondary" onClick={onEditLayout}>
          Edit Layout
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onRemovePhoto}
          disabled={!canRemovePhoto}
        >
          Remove Photo
        </button>
        <button type="button" onClick={onExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export PNG"}
        </button>
      </div>
    </section>
  );
}
