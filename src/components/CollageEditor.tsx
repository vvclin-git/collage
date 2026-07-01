import { Group, Image, Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CollageControls, type CollageInteractionMode } from "./Toolbar";
import { PhotoTray } from "./PhotoTray";
import { useElementSize, useLoadedImage } from "../hooks/useElementSize";
import { exportCollage } from "../lib/export";
import {
  fitAspectRect,
  getPreviewSpacingScale,
  getRenderableLeafRects,
  getSplitHandles,
  hitTestLeaf,
  insetRect,
} from "../lib/layout";
import { clampOffset, getCoverTransform, getTrayPhotos, zoomPlacement } from "../lib/photos";
import { snapshotAppState, useCollageStore } from "../store/useCollageStore";
import type { LeafRect, PhotoAsset, Point } from "../types";

type CollageEditorProps = {
  onImportFiles: (files: FileList) => void;
};

type PlacedImageProps = {
  cell: LeafRect;
  photo: PhotoAsset;
  isInteractionDisabled: boolean;
  isSelected: boolean;
};

function PlacedImage({ cell, photo, isInteractionDisabled, isSelected }: PlacedImageProps) {
  const image = useLoadedImage(photo.src);
  const placement = useCollageStore((state) => state.placements[cell.id]);
  const selectCell = useCollageStore((state) => state.selectCell);
  const updatePlacement = useCollageStore((state) => state.updatePlacement);

  if (!image || !placement) {
    return null;
  }

  const cover = getCoverTransform(photo, cell.rect);
  const width = cover.width * placement.scale;
  const height = cover.height * placement.scale;
  const x = cell.rect.x + (cell.rect.width - width) / 2 + placement.offsetX;
  const y = cell.rect.y + (cell.rect.height - height) / 2 + placement.offsetY;

  return (
    <Group
      clipX={cell.rect.x}
      clipY={cell.rect.y}
      clipWidth={cell.rect.width}
      clipHeight={cell.rect.height}
    >
      <Image
        image={image}
        x={x}
        y={y}
        width={width}
        height={height}
        draggable={!isInteractionDisabled}
        onPointerDown={(event) => {
          if (isInteractionDisabled) {
            return;
          }

          event.cancelBubble = true;
          selectCell(cell.id);
        }}
        onDblClick={(event) => {
          if (isInteractionDisabled) {
            return;
          }

          event.cancelBubble = true;
          updatePlacement(cell.id, {
            photoId: photo.id,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          });
        }}
        onDragMove={(event) => {
          if (isInteractionDisabled) {
            return;
          }

          const nextX = event.target.x();
          const nextY = event.target.y();
          const nextOffsetX = nextX - (cell.rect.x + (cell.rect.width - width) / 2);
          const nextOffsetY = nextY - (cell.rect.y + (cell.rect.height - height) / 2);
          const offset = clampOffset(nextOffsetX, nextOffsetY, photo, cell.rect, placement.scale);
          updatePlacement(cell.id, { ...placement, ...offset });
        }}
      />
      {isSelected ? (
        <Rect
          {...cell.rect}
          listening={false}
          stroke="#1b6ca8"
          strokeWidth={3}
          dash={[8, 6]}
        />
      ) : null}
    </Group>
  );
}

export function CollageEditor({ onImportFiles }: CollageEditorProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const layout = useCollageStore((state) => state.layout);
  const photos = useCollageStore((state) => state.photos);
  const placements = useCollageStore((state) => state.placements);
  const selectedCellId = useCollageStore((state) => state.selectedCellId);
  const selectCell = useCollageStore((state) => state.selectCell);
  const placePhoto = useCollageStore((state) => state.placePhoto);
  const removePlacement = useCollageStore((state) => state.removePlacement);
  const removePhotoAsset = useCollageStore((state) => state.removePhotoAsset);
  const clearPhotoAssets = useCollageStore((state) => state.clearPhotoAssets);
  const setSpacing = useCollageStore((state) => state.setSpacing);
  const updatePlacement = useCollageStore((state) => state.updatePlacement);
  const updateSplitRatio = useCollageStore((state) => state.updateSplitRatio);
  const returnToLayoutEditor = useCollageStore((state) => state.returnToLayoutEditor);
  const [isExporting, setIsExporting] = useState(false);
  const [interactionMode, setInteractionMode] = useState<CollageInteractionMode>("photo");
  const pinchRef = useRef<{ distance: number; cellId: string } | undefined>(undefined);
  const activePointersRef = useRef(new Map<number, Point>());

  const stageRect = useMemo(
    () => ({ x: 0, y: 0, width: Math.max(size.width, 1), height: Math.max(size.height, 1) }),
    [size.height, size.width],
  );
  const canvasRect = useMemo(
    () => fitAspectRect(stageRect, layout.aspectRatio),
    [layout.aspectRatio, stageRect],
  );
  const spacingScale = useMemo(
    () => getPreviewSpacingScale(stageRect, layout.aspectRatio),
    [layout.aspectRatio, stageRect],
  );
  const leafRects = useMemo(
    () => getRenderableLeafRects(layout, stageRect, spacingScale),
    [layout, spacingScale, stageRect],
  );
  const splitHandles = useMemo(
    () => getSplitHandles(layout.root, insetRect(canvasRect, layout.padding * spacingScale)),
    [canvasRect, layout.padding, layout.root, spacingScale],
  );
  const trayPhotos = useMemo(() => getTrayPhotos(photos, placements), [photos, placements]);
  const photosById = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);

  const getPointer = (stage: Konva.Stage): Point | undefined => {
    const pointer = stage.getPointerPosition();
    return pointer ? { x: pointer.x, y: pointer.y } : undefined;
  };

  const selectedPlacement = selectedCellId ? placements[selectedCellId] : undefined;
  const isAdjustMode = interactionMode === "adjust";

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isAdjustMode) {
      return;
    }

    const photoId = event.dataTransfer.getData("application/x-photo-id");
    if (!photoId) {
      return;
    }

    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const cellId = hitTestLeaf(point, leafRects);
    if (cellId) {
      placePhoto(cellId, photoId);
    }
  };

  const setSelectedCellZoom = (cellId: string, scale: number) => {
    const placement = placements[cellId];
    if (!placement) {
      return;
    }

    const photo = photosById.get(placement.photoId);
    const cell = leafRects.find((leaf) => leaf.id === cellId);
    if (!photo || !cell) {
      return;
    }

    updatePlacement(cellId, zoomPlacement(placement, photo, cell.rect, scale));
  };

  const updatePinchZoom = () => {
    if (isAdjustMode || !selectedCellId || activePointersRef.current.size !== 2) {
      pinchRef.current = undefined;
      return;
    }

    const placement = placements[selectedCellId];
    if (!placement) {
      pinchRef.current = undefined;
      return;
    }

    const [a, b] = Array.from(activePointersRef.current.values());
    if (!a || !b) {
      return;
    }

    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const current = pinchRef.current;
    if (!current || current.cellId !== selectedCellId) {
      pinchRef.current = { distance, cellId: selectedCellId };
      return;
    }

    setSelectedCellZoom(selectedCellId, placement.scale + (distance - current.distance) / 180);
    pinchRef.current = { distance, cellId: selectedCellId };
  };

  const onHostPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    updatePinchZoom();
  };

  const onHostPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointersRef.current.size === 2) {
      event.preventDefault();
    }
    updatePinchZoom();
  };

  const onHostPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    activePointersRef.current.delete(event.pointerId);
    pinchRef.current = undefined;
  };

  return (
    <div className="workspace">
      <section className="canvas-shell">
        <div
          ref={ref}
          className="stage-host"
          data-testid="collage-stage"
          onPointerDown={onHostPointerDown}
          onPointerMove={onHostPointerMove}
          onPointerCancel={onHostPointerEnd}
          onPointerUp={onHostPointerEnd}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("application/x-photo-id")) {
              event.preventDefault();
            }
          }}
          onDrop={handleDrop}
        >
          <Stage
            width={stageRect.width}
            height={stageRect.height}
            onPointerDown={(event) => {
              if (isAdjustMode) {
                return;
              }

              const stage = event.target.getStage();
              if (!stage) {
                return;
              }

              const point = getPointer(stage);
              if (!point) {
                return;
              }

              selectCell(hitTestLeaf(point, leafRects));
            }}
          >
            <Layer>
              <Rect {...canvasRect} fill="#f4efe6" stroke="#d8cfc0" strokeWidth={2} />
              {leafRects.map((leaf) => {
                const placement = placements[leaf.id];
                const photo = placement ? photosById.get(placement.photoId) : undefined;

                return (
                  <Group key={leaf.id}>
                    <Rect
                      {...leaf.rect}
                      fill="#fffaf1"
                      stroke={leaf.id === selectedCellId ? "#1b6ca8" : "#b8ad9b"}
                      strokeWidth={leaf.id === selectedCellId ? 3 : 1}
                      cornerRadius={3}
                    />
                    {photo ? (
                      <PlacedImage
                        cell={leaf}
                        photo={photo}
                        isInteractionDisabled={isAdjustMode}
                        isSelected={leaf.id === selectedCellId}
                      />
                    ) : null}
                  </Group>
                );
              })}
              {isAdjustMode
                ? splitHandles.map((handle) => (
                    <Rect
                      key={handle.id}
                      {...handle.lineRect}
                      fill="#1b6ca8"
                      opacity={0.85}
                      draggable
                      dragBoundFunc={(pos) => {
                        if (handle.direction === "vertical") {
                          return {
                            x: Math.min(
                              handle.parentRect.x +
                                handle.parentRect.width * 0.85 -
                                handle.lineRect.width / 2,
                              Math.max(
                                handle.parentRect.x +
                                  handle.parentRect.width * 0.15 -
                                  handle.lineRect.width / 2,
                                pos.x,
                              ),
                            ),
                            y: handle.lineRect.y,
                          };
                        }

                        return {
                          x: handle.lineRect.x,
                          y: Math.min(
                            handle.parentRect.y +
                              handle.parentRect.height * 0.85 -
                              handle.lineRect.height / 2,
                            Math.max(
                              handle.parentRect.y +
                                handle.parentRect.height * 0.15 -
                                handle.lineRect.height / 2,
                              pos.y,
                            ),
                          ),
                        };
                      }}
                      onPointerDown={(event) => {
                        event.cancelBubble = true;
                      }}
                      onDragMove={(event) => {
                        const ratio =
                          handle.direction === "vertical"
                            ? (event.target.x() + handle.lineRect.width / 2 - handle.parentRect.x) /
                              handle.parentRect.width
                            : (event.target.y() + handle.lineRect.height / 2 - handle.parentRect.y) /
                              handle.parentRect.height;
                        updateSplitRatio(handle.id, ratio);
                      }}
                    />
                  ))
                : null}
            </Layer>
          </Stage>
        </div>
      </section>

      <PhotoTray
        photos={trayPhotos}
        photoCount={photos.length}
        isExporting={isExporting}
        isPickingDisabled={isAdjustMode}
        selectedCellId={selectedCellId}
        onRemovePhoto={removePhotoAsset}
        onClearAll={() => {
          if (window.confirm(`Clear all ${photos.length} photos? Cell placements will also be cleared.`)) clearPhotoAssets();
        }}
        onPickPhoto={(photoId) => {
          if (selectedCellId) {
            placePhoto(selectedCellId, photoId);
          }
        }}
      />

      <CollageControls
        canRemovePhoto={Boolean(selectedCellId && selectedPlacement)}
        canZoomPhoto={Boolean(selectedCellId && selectedPlacement) && !isAdjustMode}
        interactionMode={interactionMode}
        isExporting={isExporting}
        gap={layout.gap}
        padding={layout.padding}
        zoomScale={selectedPlacement?.scale ?? 1}
        onImportFiles={onImportFiles}
        onToggleInteractionMode={() => {
          pinchRef.current = undefined;
          setInteractionMode((mode) => (mode === "photo" ? "adjust" : "photo"));
        }}
        onZoomChange={(scale) => {
          if (selectedCellId) {
            setSelectedCellZoom(selectedCellId, scale);
          }
        }}
        onSpacingChange={(gap, padding) => setSpacing(gap, padding, canvasRect)}
        onRemovePhoto={() => {
          if (selectedCellId) {
            removePlacement(selectedCellId);
          }
        }}
        onEditLayout={returnToLayoutEditor}
        onExport={() => {
          setIsExporting(true);
          exportCollage(snapshotAppState())
            .catch((error: unknown) => {
              window.alert(error instanceof Error ? error.message : "Export failed.");
            })
            .finally(() => setIsExporting(false));
        }}
      />
    </div>
  );
}
