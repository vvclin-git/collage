import { useState } from "react";
import type { AspectRatio, AspectRatioPreset } from "../types";

const presets: AspectRatioPreset[] = ["1:1", "4:5", "5:4", "3:4", "4:3", "16:9", "9:16"];

function formatAspectValue(value: number): string {
  return String(Number(value.toFixed(4)));
}

export type ManualAspectPanelProps = {
  initialValue: AspectRatio;
  onApply: (aspect: AspectRatio) => void;
  onClose: () => void;
};

export function ManualAspectPanel({ initialValue, onApply, onClose }: ManualAspectPanelProps) {
  const [selection, setSelection] = useState<AspectRatioPreset | "custom">(initialValue.kind === "preset" ? initialValue.value : "custom");
  const [widthDraft, setWidthDraft] = useState(initialValue.kind === "custom" ? formatAspectValue(initialValue.width) : "1");
  const [heightDraft, setHeightDraft] = useState(initialValue.kind === "custom" ? formatAspectValue(initialValue.height) : "1");
  const width = Number(widthDraft);
  const height = Number(heightDraft);
  const ratio = width / height;
  const customValid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 && ratio >= 0.1 && ratio <= 10;
  const apply = () => onApply(selection === "custom" ? { kind: "custom", width, height } : { kind: "preset", value: selection });

  return (
    <section className="manual-aspect-panel workflow-panel" aria-labelledby="manual-aspect-heading">
      <div className="workflow-panel-header">
        <h2 id="manual-aspect-heading">Canvas Aspect Ratio</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close aspect ratio panel">×</button>
      </div>
      <label>Aspect ratio
        <select value={selection} onChange={(event) => setSelection(event.target.value as AspectRatioPreset | "custom")}>
          {presets.map((preset) => <option value={preset} key={preset}>{preset}</option>)}
          <option value="custom">Custom</option>
        </select>
      </label>
      {selection === "custom" ? <div className="custom-aspect" aria-label="Custom aspect ratio">
        <label>Width<input type="number" min="0" step="any" value={widthDraft} onChange={(event) => setWidthDraft(event.target.value)} /></label>
        <label>Height<input type="number" min="0" step="any" value={heightDraft} onChange={(event) => setHeightDraft(event.target.value)} /></label>
        {!customValid ? <span className="field-error" role="alert">Use positive values with a ratio from 1:10 through 10:1.</span> : null}
      </div> : null}
      <button type="button" onClick={apply} disabled={selection === "custom" && !customValid}>Apply</button>
    </section>
  );
}
