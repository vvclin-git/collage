import { Group, Image, Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { useMemo, useRef, useState } from "react";
import { CollageControls } from "./Toolbar";
import { PhotoTray } from "./PhotoTray";
import { useElementSize, useLoadedImage } from "../hooks/useElementSize";
import { exportCollage } from "../lib/export";
import {
  fitAspectRect,
  getPreviewSpacingScale,
  getRenderableLeafRects,
  hitTestLeaf,
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
  isSelected: boolean;
};

function PlacedImage({ cell, photo, isSelected }: PlacedImageProps) {
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
        draggable
        onPointerDown={(event) => {
          event.cancelBubble = true;
          selectCell(cell.id);
        }}
        onDblClick={(event) => {
          event.cancelBubble = true;
          updatePlacement(cell.id, {
            photoId: photo.id,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          });
        }}
        onDragMove={(event) => {
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
  const updatePlacement = useCollageStore((state) => state.updatePlacement);
  const returnToLayoutEditor = useCollageStore((state) => state.returnToLayoutEditor);
  const [isExporting, setIsExporting] = useState(false);
  const pinchRef = useRef<{ distance: number; cellId: string } | undefined>(undefined);

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
  const trayPhotos = useMemo(() => getTrayPhotos(photos, placements), [photos, placements]);
  const photosById = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);

  const getPointer = (stage: Konva.Stage): Point | undefined => {
    const pointer = stage.getPointerPosition();
    return pointer ? { x: pointer.x, y: pointer.y } : undefined;
  };

  const selectedPlacement = selectedCellId ? placements[selectedCellId] : undefined;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
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

  return (
    <div className="workspace">
      <section className="canvas-shell">
        <div
          ref={ref}
          className="stage-host"
          data-testid="collage-stage"
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
            onTouchMove={(event) => {
              if (event.evt.touches.length !== 2 || !selectedCellId) {
                pinchRef.current = undefined;
                return;
              }

              event.evt.preventDefault();
              const [a, b] = Array.from(event.evt.touches);
              if (!a || !b) {
                return;
              }

              const placement = placements[selectedCellId];
              if (!placement) {
                return;
              }

              const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
              const current = pinchRef.current;
              if (!current || current.cellId !== selectedCellId) {
                pinchRef.current = { distance, cellId: selectedCellId };
                return;
              }

              setSelectedCellZoom(selectedCellId, placement.scale + (distance - current.distance) / 180);
              pinchRef.current = { distance, cellId: selectedCellId };
            }}
            onTouchEnd={() => {
              pinchRef.current = undefined;
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
                        isSelected={leaf.id === selectedCellId}
                      />
                    ) : null}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
      </section>

      <PhotoTray
        photos={trayPhotos}
        selectedCellId={selectedCellId}
        onRemovePhoto={(photoId) => {
          if (window.confirm("Remove this image from the tray?")) {
            removePhotoAsset(photoId);
          }
        }}
        onPickPhoto={(photoId) => {
          if (selectedCellId) {
            placePhoto(selectedCellId, photoId);
          }
        }}
      />

      <CollageControls
        canRemovePhoto={Boolean(selectedCellId && selectedPlacement)}
        canZoomPhoto={Boolean(selectedCellId && selectedPlacement)}
        isExporting={isExporting}
        zoomScale={selectedPlacement?.scale ?? 1}
        onImportFiles={onImportFiles}
        onZoomChange={(scale) => {
          if (selectedCellId) {
            setSelectedCellZoom(selectedCellId, scale);
          }
        }}
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
