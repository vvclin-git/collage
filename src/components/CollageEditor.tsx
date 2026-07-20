import { Group, Image, Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CollageControls, CompactLayoutControls, type CollageInteractionMode } from "./Toolbar";
import { PhotoTray } from "./PhotoTray";
import { useElementSize, useLoadedImage } from "../hooks/useElementSize";
import {
  fitAspectRect,
  getPreviewSpacingScale,
  getRenderableLeafRects,
  getSplitHandles,
  getSplitGesture,
  hitTestLeaf,
  insetRect,
} from "../lib/layout";
import { createPhotoPlacement, getPlacementTransform, getTrayPhotos, zoomPlacement } from "../lib/photos";
import { useCollageStore } from "../store/useCollageStore";
import type { LeafRect, PhotoAsset, Point } from "../types";

type CollageEditorProps = {
  isExporting?: boolean;
  onImportFiles?: (files: FileList) => void;
};

type PlacedImageProps = {
  cell: LeafRect;
  photo: PhotoAsset;
  isInteractionDisabled: boolean;
  isSelected: boolean;
  canvasRect: { x: number; y: number; width: number; height: number };
};

function PlacedImage({ cell, photo, isInteractionDisabled, isSelected, canvasRect }: PlacedImageProps) {
  const image = useLoadedImage(photo.src);
  const placement = useCollageStore((state) => state.placements[cell.id]);
  const selectCell = useCollageStore((state) => state.selectCell);
  const updatePlacement = useCollageStore((state) => state.updatePlacement);

  if (!image || !placement) {
    return null;
  }

  const transform = getPlacementTransform(photo, placement, canvasRect);

  return (
    <Group
      clipX={cell.rect.x}
      clipY={cell.rect.y}
      clipWidth={cell.rect.width}
      clipHeight={cell.rect.height}
    >
      <Image
        image={image}
        x={transform.x}
        y={transform.y}
        width={transform.width}
        height={transform.height}
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
          updatePlacement(cell.id, createPhotoPlacement(photo, cell.rect, canvasRect));
        }}
        onDragMove={(event) => {
          if (isInteractionDisabled) {
            return;
          }

          const nextX = event.target.x();
          const nextY = event.target.y();
          updatePlacement(cell.id, {
            ...placement,
            centerX: (nextX + transform.width / 2 - canvasRect.x) / canvasRect.width,
            centerY: (nextY + transform.height / 2 - canvasRect.y) / canvasRect.height,
          });
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

export function CollageEditor({ isExporting = false, onImportFiles = () => undefined }: CollageEditorProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const layout = useCollageStore((state) => state.layout);
  const photos = useCollageStore((state) => state.photos);
  const placements = useCollageStore((state) => state.placements);
  const selectedCellId = useCollageStore((state) => state.selectedCellId);
  const selectCell = useCollageStore((state) => state.selectCell);
  const placePhoto = useCollageStore((state) => state.placePhoto);
  const removePhotoAsset = useCollageStore((state) => state.removePhotoAsset);
  const clearAllAndReset = useCollageStore((state) => state.clearAllAndReset);
  const setSpacing = useCollageStore((state) => state.setSpacing);
  const updatePlacement = useCollageStore((state) => state.updatePlacement);
  const updateSplitRatio = useCollageStore((state) => state.updateSplitRatio);
  const splitLeaf = useCollageStore((state) => state.splitLeaf);
  const selectSplit = useCollageStore((state) => state.selectSplit);
  const deleteSelectedSplit = useCollageStore((state) => state.deleteSelectedSplit);
  const selectedSplitId = useCollageStore((state) => state.selectedSplitId);
  const selectedLayoutLeafIds = useCollageStore((state) => state.selectedLayoutLeafIds);
  const toggleLayoutLeafSelection = useCollageStore((state) => state.toggleLayoutLeafSelection);
  const equalizeSelectedLeaves = useCollageStore((state) => state.equalizeSelectedLeaves);
  const resetLayout = useCollageStore((state) => state.resetLayout);
  const setAspectRatio = useCollageStore((state) => state.setAspectRatio);
  const [interactionMode, setInteractionMode] = useState<CollageInteractionMode>("photo");
  const pinchRef = useRef<{ distance: number; cellId: string } | undefined>(undefined);
  const activePointersRef = useRef(new Map<number, Point>());
  const layoutDragStartRef = useRef<{ leafId: string; point: Point } | undefined>(undefined);

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
      const cell = leafRects.find((leaf) => leaf.id === cellId);
      if (cell) placePhoto(cellId, photoId, cell.rect, canvasRect);
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

    updatePlacement(cellId, zoomPlacement(placement, scale));
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

    setSelectedCellZoom(selectedCellId, (placement.zoom ?? 1) + (distance - current.distance) / 180);
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
                const stage = event.target.getStage();
                const point = stage ? getPointer(stage) : undefined;
                const leafId = point ? hitTestLeaf(point, leafRects) : undefined;
                layoutDragStartRef.current = leafId && point ? { leafId, point } : undefined;
                if (!leafId) selectSplit(undefined);
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
            onPointerUp={(event) => {
              if (!isAdjustMode) return;
              const start = layoutDragStartRef.current;
              layoutDragStartRef.current = undefined;
              if (!start) return;
              const point = getPointer(event.target.getStage()!);
              const cell = leafRects.find((leaf) => leaf.id === start.leafId);
              if (!point || !cell) return;
              if (Math.hypot(point.x - start.point.x, point.y - start.point.y) < 64) {
                toggleLayoutLeafSelection(start.leafId);
              } else {
                const gesture = getSplitGesture(start.point, point, cell.rect);
                splitLeaf(start.leafId, gesture.direction, gesture.ratio);
              }
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
                        canvasRect={canvasRect}
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
                        selectSplit(handle.id);
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

      {/* Removed later-stage Layout Options; initial choices remain in ChooseLayoutScreen. */}
      {/* <section className="workflow-panel layout-options-disclosure" aria-label="Layout options">
        <button type="button" className="advanced-toggle" aria-expanded={areLayoutOptionsOpen} onClick={() => setAreLayoutOptionsOpen((open) => !open)}>
          <span>Layout Options</span><span aria-hidden="true">⌄</span>
        </button>
        {areLayoutOptionsOpen ? <div className="layout-option-grid">
          <LayoutOptionCard kind="horizontal" title="Horizontal" disabled={isExporting} onSelect={() => {
            if (window.confirm("Rebuild this collage as a horizontal layout? Your current layout adjustments will be replaced.")) applyAutoLayout("horizontal");
          }} />
          <LayoutOptionCard kind="vertical" title="Vertical" disabled={isExporting} onSelect={() => {
            if (window.confirm("Rebuild this collage as a vertical layout? Your current layout adjustments will be replaced.")) applyAutoLayout("vertical");
          }} />
          <LayoutOptionCard kind="manual" title="Manual" disabled={isExporting} onSelect={() => openManualAspect("edit-collage")} />
        </div> : null}
      </section> */}

      <PhotoTray
        photos={trayPhotos}
        photoCount={photos.length}
        isExporting={isExporting}
        isPickingDisabled={isAdjustMode}
        selectedCellId={selectedCellId}
        onRemovePhoto={removePhotoAsset}
        onClearAll={() => {
          if (window.confirm(`Clear all ${photos.length} photos? The collage layout and placements will be reset.`)) clearAllAndReset();
        }}
        onImportFiles={onImportFiles}
        onPickPhoto={(photoId) => {
          if (selectedCellId) {
            const cell = leafRects.find((leaf) => leaf.id === selectedCellId);
            if (cell) placePhoto(selectedCellId, photoId, cell.rect, canvasRect);
          }
        }}
      />

      <CollageControls
        canZoomPhoto={Boolean(selectedCellId && selectedPlacement) && !isAdjustMode}
        interactionMode={interactionMode}
        isExporting={isExporting}
        gap={layout.gap}
        padding={layout.padding}
        zoomScale={selectedPlacement?.zoom ?? 1}
        onToggleInteractionMode={() => {
          pinchRef.current = undefined;
          setInteractionMode((mode) => (mode === "photo" ? "adjust" : "photo"));
        }}
        onZoomChange={(scale) => {
          if (selectedCellId) {
            setSelectedCellZoom(selectedCellId, scale);
          }
        }}
        onSpacingChange={(gap, padding) => setSpacing(gap, padding)}
      />
      {isAdjustMode ? <CompactLayoutControls
        aspectRatio={layout.aspectRatio}
        isExporting={isExporting}
        canDeleteSplit={Boolean(selectedSplitId)}
        selectedCellCount={selectedLayoutLeafIds.length}
        onAspectRatioChange={setAspectRatio}
        onDeleteSplit={deleteSelectedSplit}
        onEqualize={(axis) => {
          const result = equalizeSelectedLeaves(axis);
          if (!result.ok) window.alert(`Unable to equalize: ${result.reason}.`);
        }}
        onReset={() => {
          if (window.confirm("Reset the layout to one empty cell? Assigned photos will return to the tray.")) resetLayout();
        }}
      /> : null}
    </div>
  );
}
