import type { PhotoAsset } from "../types";

type PhotoTrayProps = {
  photos: PhotoAsset[];
  selectedCellId?: string;
  onPickPhoto: (photoId: string) => void;
};

export function PhotoTray({ photos, selectedCellId, onPickPhoto }: PhotoTrayProps) {
  return (
    <section className="photo-tray" aria-label="Photo tray">
      <div className="tray-header">
        <h2>Photo Tray</h2>
        <span>{selectedCellId ? "Choose a photo for the selected cell" : "Select a cell first"}</span>
      </div>
      <div className="tray-list">
        {photos.length === 0 ? (
          <div className="empty-tray">Unused photos appear here.</div>
        ) : (
          photos.map((photo) => (
            <button
              type="button"
              key={photo.id}
              className="tray-photo"
              aria-disabled={!selectedCellId}
              onClick={() => {
                if (selectedCellId) {
                  onPickPhoto(photo.id);
                }
              }}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-photo-id", photo.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              title={photo.fileName}
            >
              <img src={photo.src} alt="" />
              <span>{photo.fileName}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
