import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { useMemo, useRef } from "react";
import { LayoutControls } from "./Toolbar";
import { useElementSize } from "../hooks/useElementSize";
import {
  fitAspectRect,
  getPreviewSpacingScale,
  getRenderableLeafRects,
  getSplitGesture,
  getSplitHandles,
  hitTestLeaf,
  insetRect,
} from "../lib/layout";
import { useCollageStore } from "../store/useCollageStore";
import type { Point } from "../types";

const MIN_SPLIT_DRAG = 64;

export function LayoutEditor() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const layout = useCollageStore((state) => state.layout);
  const selectedSplitId = useCollageStore((state) => state.selectedSplitId);
  const setGap = useCollageStore((state) => state.setGap);
  const setPadding = useCollageStore((state) => state.setPadding);
  const setAspectRatio = useCollageStore((state) => state.setAspectRatio);
  const splitLeaf = useCollageStore((state) => state.splitLeaf);
  const updateSplitRatio = useCollageStore((state) => state.updateSplitRatio);
  const selectSplit = useCollageStore((state) => state.selectSplit);
  const deleteSelectedSplit = useCollageStore((state) => state.deleteSelectedSplit);
  const equalizeSelectedSplit = useCollageStore((state) => state.equalizeSelectedSplit);
  const resetLayout = useCollageStore((state) => state.resetLayout);
  const enterCollageEditor = useCollageStore((state) => state.enterCollageEditor);
  const dragStartRef = useRef<{ leafId: string; point: Point } | undefined>(undefined);

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

  const getPointer = (stage: Konva.Stage): Point | undefined => {
    const pointer = stage.getPointerPosition();
    return pointer ? { x: pointer.x, y: pointer.y } : undefined;
  };

  const onStagePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = event.target.getStage();
    if (!stage) {
      return;
    }

    const point = getPointer(stage);
    if (!point) {
      return;
    }

    const leafId = hitTestLeaf(point, leafRects);
    if (!leafId) {
      selectSplit(undefined);
      return;
    }

    dragStartRef.current = { leafId, point };
    selectSplit(undefined);
  };

  const onStagePointerUp = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const start = dragStartRef.current;
    dragStartRef.current = undefined;
    if (!start) {
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

    const dx = point.x - start.point.x;
    const dy = point.y - start.point.y;
    const distance = Math.hypot(dx, dy);
    if (distance < MIN_SPLIT_DRAG) {
      return;
    }

    const leafRect = leafRects.find((leaf) => leaf.id === start.leafId)?.rect;
    if (!leafRect) {
      return;
    }

    const gesture = getSplitGesture(start.point, point, leafRect);
    splitLeaf(start.leafId, gesture.direction, gesture.ratio);
  };

  return (
    <div className="workspace">
      <section className="canvas-shell">
        <div ref={ref} className="stage-host" data-testid="layout-stage">
          <Stage
            width={stageRect.width}
            height={stageRect.height}
            onPointerDown={onStagePointerDown}
            onPointerUp={onStagePointerUp}
          >
            <Layer>
              <Rect
                {...canvasRect}
                fill="#f4efe6"
                stroke="#d8cfc0"
                strokeWidth={2}
                cornerRadius={2}
              />
              {leafRects.map((leaf) => (
                <Rect
                  key={leaf.id}
                  {...leaf.rect}
                  fill="#fffaf1"
                  stroke="#b8ad9b"
                  strokeWidth={1}
                  cornerRadius={3}
                />
              ))}
              {splitHandles.map((handle) => (
                <Rect
                  key={handle.id}
                  {...handle.lineRect}
                  fill={handle.id === selectedSplitId ? "#1b6ca8" : "#56606b"}
                  opacity={handle.id === selectedSplitId ? 0.85 : 0.45}
                  draggable
                  dragBoundFunc={(pos) => {
                    if (handle.direction === "vertical") {
                      return {
                        x: Math.min(
                          handle.parentRect.x + handle.parentRect.width * 0.85 - handle.lineRect.width / 2,
                          Math.max(
                            handle.parentRect.x + handle.parentRect.width * 0.15 - handle.lineRect.width / 2,
                            pos.x,
                          ),
                        ),
                        y: handle.lineRect.y,
                      };
                    }

                    return {
                      x: handle.lineRect.x,
                      y: Math.min(
                        handle.parentRect.y + handle.parentRect.height * 0.85 - handle.lineRect.height / 2,
                        Math.max(
                          handle.parentRect.y + handle.parentRect.height * 0.15 - handle.lineRect.height / 2,
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
              ))}
            </Layer>
          </Stage>
        </div>
      </section>

      <LayoutControls
        aspectRatio={layout.aspectRatio}
        gap={layout.gap}
        padding={layout.padding}
        canDeleteSplit={Boolean(selectedSplitId)}
        canEqualizeSplit={Boolean(selectedSplitId)}
        onAspectRatioChange={setAspectRatio}
        onGapChange={setGap}
        onPaddingChange={setPadding}
        onEqualizeSplit={equalizeSelectedSplit}
        onDeleteSplit={deleteSelectedSplit}
        onReset={() => {
          if (window.confirm("Reset the layout to one empty cell?")) {
            resetLayout();
          }
        }}
        onNext={enterCollageEditor}
      />
    </div>
  );
}
