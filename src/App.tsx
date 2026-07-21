import { useCallback, useRef, useState } from "react";
import { ChooseLayoutScreen } from "./components/ChooseLayoutScreen";
import { CollageEditor } from "./components/CollageEditor";
import { EmptyCanvasPreview } from "./components/EmptyCanvasPreview";
import { LayoutEditor } from "./components/LayoutEditor";
import { ManualAspectPanel } from "./components/ManualAspectPanel";
import { WorkflowStartScreen } from "./components/WorkflowStartScreen";
import { createPhotoAssets, type PhotoImportRejection } from "./lib/photoAssets";
import { exportCollage } from "./lib/export";
import { snapshotAppState, useCollageStore } from "./store/useCollageStore";

const appBranch = import.meta.env.VITE_APP_BRANCH || "local";
const appCommit = import.meta.env.VITE_APP_COMMIT?.slice(0, 8) || "development";

function describeRejections(rejections: PhotoImportRejection[]): string | undefined {
  if (rejections.length === 0) return undefined;
  const names = rejections.map(({ file }) => file.name).join(", ");
  return `${rejections.length === 1 ? "One file was not imported" : `${rejections.length} files were not imported`}: ${names}. Use valid JPG, PNG, or WebP images.`;
}

export function App() {
  const workflowStep = useCollageStore((state) => state.workflowStep);
  const photos = useCollageStore((state) => state.photos);
  const aspectRatio = useCollageStore((state) => state.layout.aspectRatio);
  const importPhotoAssets = useCollageStore((state) => state.importPhotoAssets);
  const appendPhotoAssets = useCollageStore((state) => state.appendPhotoAssets);
  const removePhotoAsset = useCollageStore((state) => state.removePhotoAsset);
  const clearAllAndReset = useCollageStore((state) => state.clearAllAndReset);
  const applyAutoLayout = useCollageStore((state) => state.applyAutoLayout);
  const openManualAspect = useCollageStore((state) => state.openManualAspect);
  const cancelManualAspect = useCollageStore((state) => state.cancelManualAspect);
  const startManualLayout = useCollageStore((state) => state.startManualLayout);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setIsImporting(true);
    try {
      const result = await createPhotoAssets(Array.from(files));
      setImportError(describeRejections(result.rejections));
      if (result.assets.length > 0) {
        if (workflowStep === "edit-collage") appendPhotoAssets(result.assets);
        else importPhotoAssets(result.assets);
      }
    } finally {
      setIsImporting(false);
    }
  }, [appendPhotoAssets, importPhotoAssets, workflowStep]);

  const handleExport = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    void exportCollage(snapshotAppState())
      .catch((error: unknown) => window.alert(error instanceof Error ? error.message : "Export failed."))
      .finally(() => setIsExporting(false));
  }, [isExporting]);

  const openFilePicker = () => fileInputRef.current?.click();

  let content;
  switch (workflowStep) {
    case "start":
      content = <WorkflowStartScreen onImport={openFilePicker} isImporting={isImporting} />;
      break;
    case "choose-layout":
      content = (
        <ChooseLayoutScreen
          photos={photos}
          onImport={openFilePicker}
          onRemovePhoto={removePhotoAsset}
          onClear={clearAllAndReset}
          onSelectHorizontal={() => applyAutoLayout("horizontal")}
          onSelectVertical={() => applyAutoLayout("vertical")}
          onSelectManual={() => openManualAspect("choose-layout")}
        />
      );
      break;
    case "manual-aspect":
      content = (
        <main className="workflow-screen manual-aspect-screen">
          <EmptyCanvasPreview message="Choose the canvas shape for your manual layout" />
          <ManualAspectPanel initialValue={aspectRatio} onApply={startManualLayout} onClose={cancelManualAspect} />
        </main>
      );
      break;
    case "manual-layout":
      content = <LayoutEditor />;
      break;
    case "edit-collage":
      content = <CollageEditor isExporting={isExporting} onImportFiles={importFiles} />;
      break;
  }

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
        if (event.currentTarget === event.target) setIsDraggingFiles(false);
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
        <div><h1>Photo Collage</h1><p>Photos stay on your device.</p></div>
        <div className="topbar-actions">
          {workflowStep === "edit-collage" ? <button type="button" className="export-action header-export" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : <><span className="desktop-export-label">Export PNG</span><span className="mobile-export-label">Export</span></>}
          </button> : null}
          <div className="mode-pill">{workflowStep.replaceAll("-", " ")}</div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        hidden
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Choose photos"
        onChange={(event) => {
          if (event.target.files) void importFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {content}
      {importError ? <p className="workflow-error" role="alert">{importError}</p> : null}
      {isDraggingFiles ? <div className="drop-overlay">Drop photos to import</div> : null}
      <footer className="app-build-info" role="contentinfo" aria-label="Build information">
        <span>Branch: {appBranch}</span>
        <span aria-hidden="true">·</span>
        <span>Commit: {appCommit}</span>
      </footer>
    </main>
  );
}
