export type LayoutOptionKind = "horizontal" | "vertical" | "manual";

export type LayoutOptionCardProps = {
  kind: LayoutOptionKind;
  title: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
};

export function LayoutOptionCard({ kind, title, description, disabled = false, onSelect }: LayoutOptionCardProps) {
  return (
    <button type="button" className="layout-option-card" disabled={disabled} onClick={onSelect}>
      <span className={`layout-option-icon is-${kind}`} aria-hidden="true"><i /><i /><i /></span>
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
    </button>
  );
}
