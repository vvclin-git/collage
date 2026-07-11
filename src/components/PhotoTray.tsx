import type { PhotoAsset } from "../types";

type PhotoTrayProps = {
  photos: PhotoAsset[];
  photoCount: number;
  isPickingDisabled: boolean;
  selectedCellId?: string;
  isExporting: boolean;
  onClearAll: () => void;
  onImportFiles: (files: FileList) => void;
  onPickPhoto: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
};

export function PhotoTray({
  photos,
  photoCount,
  isPickingDisabled,
  selectedCellId,
  isExporting,
  onClearAll,
  onImportFiles,
  onPickPhoto,
  onRemovePhoto,
}: PhotoTrayProps) {
  const canPickPhoto = Boolean(selectedCellId) && !isPickingDisabled;

  return (
    <section className="photo-tray" aria-label="Photo tray">
      <div className="tray-header">
        <h2>Photo Tray</h2>
        <span>
          {isPickingDisabled
            ? "Switch to Photo Editing to place photos"
            : selectedCellId
              ? "Choose a photo for the selected cell"
              : "Select a cell first"}
        </span>
        <button type="button" className="secondary tray-clear" disabled={photoCount === 0 || isExporting} onClick={onClearAll}>Clear All</button>
      </div>
      <div className="tray-list">
        {photos.length === 0 ? (
          <div className="empty-tray">Unused photos appear here.</div>
        ) : (
          photos.map((photo) => (
            <div
              key={photo.id}
              className="tray-photo"
              aria-disabled={!canPickPhoto}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-photo-id", photo.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              title={photo.fileName}
            >
              <button
                type="button"
                className="tray-pick"
                onClick={() => {
                  if (canPickPhoto) {
                    onPickPhoto(photo.id);
                  }
                }}
                disabled={!canPickPhoto}
                aria-label={`Use ${photo.fileName}`}
              >
                <img src={photo.src} alt="" />
              </button>
              <button
                type="button"
                className="tray-remove"
                onClick={() => onRemovePhoto(photo.id)}
                aria-label={`Remove ${photo.fileName}`}
                title="Remove image"
              >
                ×
              </button>
              <span>{photo.fileName}</span>
            </div>
          ))
        )}
        <label className={isExporting ? "tray-add mobile-import-action is-disabled" : "tray-add mobile-import-action"}>
          <span aria-hidden="true">+</span>
          <span className="visually-hidden">Add photos</span>
          <input
            type="file"
            aria-label="Add photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={isExporting}
            onChange={(event) => {
              if (event.target.files) onImportFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </section>
  );
}
