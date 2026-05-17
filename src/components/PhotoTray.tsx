import type { PhotoAsset } from "../types";

type PhotoTrayProps = {
  photos: PhotoAsset[];
  isPickingDisabled: boolean;
  selectedCellId?: string;
  onPickPhoto: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
};

export function PhotoTray({
  photos,
  isPickingDisabled,
  selectedCellId,
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
      </div>
    </section>
  );
}
