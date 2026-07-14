type EmptyCanvasPreviewProps = {
  message?: string;
};

export function EmptyCanvasPreview({ message = "Your collage will appear here" }: EmptyCanvasPreviewProps) {
  return (
    <div className="empty-canvas-preview" role="img" aria-label={message}>
      <span className="empty-preview-icon" aria-hidden="true">▧</span>
      <p>{message}</p>
    </div>
  );
}
