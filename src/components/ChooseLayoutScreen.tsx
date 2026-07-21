import type { PhotoAsset } from "../types";
import { EmptyCanvasPreview } from "./EmptyCanvasPreview";
import { LayoutOptionCard } from "./LayoutOptionCard";

export type ChooseLayoutScreenProps = {
  photos: readonly PhotoAsset[];
  onImport: () => void;
  onRemovePhoto: (id: string) => void;
  onClear: () => void;
  onSelectHorizontal: () => void;
  onSelectVertical: () => void;
  onSelectManual: () => void;
};

export function ChooseLayoutScreen({ photos, onImport, onRemovePhoto, onClear, onSelectHorizontal, onSelectVertical, onSelectManual }: ChooseLayoutScreenProps) {
  const noPhotos = photos.length === 0;
  return (
    <section className="workflow-screen choose-layout-screen" aria-label="Choose a collage layout">
      <EmptyCanvasPreview message="Choose a layout to build your collage" />
      <section className="workflow-panel workflow-photo-tray" aria-labelledby="choose-photo-heading">
        <h2 id="choose-photo-heading">Photo Tray</h2>
        <div className="workflow-photo-list">
          {photos.map((photo) => <figure key={photo.id} className="workflow-photo">
            <img src={photo.src} alt={photo.fileName} />
            <figcaption>{photo.fileName}</figcaption>
            <button type="button" className="tray-remove" onClick={() => onRemovePhoto(photo.id)} aria-label={`Remove ${photo.fileName}`}>×</button>
          </figure>)}
          {noPhotos ? <p>No photos imported.</p> : null}
          <button type="button" className="tray-add workflow-tray-add" onClick={onImport}>
            <span aria-hidden="true">+</span>
            <span className="visually-hidden">Add photos</span>
          </button>
        </div>
      </section>
      <section className="workflow-panel" aria-labelledby="layout-options-heading">
        <h2 id="layout-options-heading">Layout Options</h2>
        <div className="layout-option-grid">
          <LayoutOptionCard kind="horizontal" title="Horizontal" disabled={noPhotos} onSelect={onSelectHorizontal} />
          <LayoutOptionCard kind="vertical" title="Vertical" disabled={noPhotos} onSelect={onSelectVertical} />
          <LayoutOptionCard kind="manual" title="Manual" disabled={noPhotos} onSelect={onSelectManual} />
        </div>
      </section>
      <button type="button" className="secondary workflow-clear" onClick={onClear} disabled={noPhotos}>Clear</button>
    </section>
  );
}
