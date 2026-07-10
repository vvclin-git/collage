import { useId, useState } from "react";

export type AdvancedSpacingControlsProps = {
  gap: number;
  padding: number;
  onChange: (gap: number, padding: number) => void;
  disabled?: boolean;
};

export function AdvancedSpacingControls({ gap, padding, onChange, disabled = false }: AdvancedSpacingControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldsId = useId();
  return (
    <section className="advanced-spacing">
      <button type="button" className="advanced-toggle" aria-expanded={isOpen} aria-controls={fieldsId} onClick={() => setIsOpen((open) => !open)}>
        <span>Padding/Gap</span><span aria-hidden="true">⌄</span>
      </button>
      {isOpen ? <div id={fieldsId} className="advanced-spacing-fields">
        <label>Gap <strong>{gap}px</strong><input type="range" min="0" max="64" value={gap} disabled={disabled} onChange={(event) => onChange(Number(event.target.value), padding)} /></label>
        <label>Padding <strong>{padding}px</strong><input type="range" min="0" max="128" value={padding} disabled={disabled} onChange={(event) => onChange(gap, Number(event.target.value))} /></label>
      </div> : null}
    </section>
  );
}
