import { useCallback, useState } from "react";
import { CollageEditor } from "./components/CollageEditor";
import { LayoutEditor } from "./components/LayoutEditor";
import { useCollageStore } from "./store/useCollageStore";
import { createPhotoAssets } from "./lib/photoAssets";

export function App() {
  const mode = useCollageStore((state) => state.mode);
  const addPhotos = useCollageStore((state) => state.addPhotos);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const assets = await createPhotoAssets(Array.from(files));
      addPhotos(assets);
    },
    [addPhotos],
  );

  return (
    <main
      className={isDraggingFiles ? "app is-file-dragging" : "app"}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.types).includes("Files")) {
          event.preventDefault();
          setIsDraggingFiles(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDraggingFiles(false);
        }
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length > 0) {
          event.preventDefault();
          setIsDraggingFiles(false);
          void importFiles(event.dataTransfer.files);
        }
      }}
    >
      <header className="topbar">
        <div>
          <h1>Photo Collage</h1>
          <p>Photos stay on your device.</p>
        </div>
        <div className="mode-pill">{mode === "layout" ? "Layout" : "Collage"}</div>
      </header>

      {mode === "layout" ? (
        <LayoutEditor />
      ) : (
        <CollageEditor onImportFiles={importFiles} />
      )}

      {isDraggingFiles ? <div className="drop-overlay">Drop photos to import</div> : null}
    </main>
  );
}
