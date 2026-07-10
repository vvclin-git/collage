import { EmptyCanvasPreview } from "./EmptyCanvasPreview";

export type WorkflowStartScreenProps = {
  onImport: () => void;
  isImporting?: boolean;
  errorMessage?: string;
};

export function WorkflowStartScreen({ onImport, isImporting = false, errorMessage }: WorkflowStartScreenProps) {
  return (
    <section className="workflow-screen start-screen" aria-label="Start a collage">
      <EmptyCanvasPreview />
      <button type="button" className="workflow-import-button" onClick={onImport} disabled={isImporting}>
        {isImporting ? "Importing…" : "Import photos"}
      </button>
      {errorMessage ? <p className="workflow-error" role="alert">{errorMessage}</p> : null}
    </section>
  );
}
