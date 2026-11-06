import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Transformer,
  Text,
} from "react-konva";
import type Konva from "konva";
import {
  clamp,
  clampCoordinates,
  normalizeRect,
  MIN_SEGMENT_SIZE,
} from "@epaper/shared";
import { useEditorStore } from "@/stores/editorStore";
import type { NewspaperPage, Segment } from "@/types";
import type { AiSuggestionDto, SegmentCoordinates } from "@epaper/shared";

interface Props {
  page: NewspaperPage;
  aiSuggestions?: AiSuggestionDto[];
  selectedSuggestionId?: string | null;
  onSelectSuggestion?: (id: string | null) => void;
  onUpdateSuggestionCoordinates?: (
    id: string,
    coordinates: SegmentCoordinates
  ) => void;
}

function useHtmlImage(url: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [url]);
  return image;
}

export function CanvasWorkspace({
  page,
  aiSuggestions = [],
  selectedSuggestionId = null,
  onSelectSuggestion,
  onUpdateSuggestionCoordinates,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Rect | null>(null);
  const suggestionNodeRef = useRef<Konva.Rect | null>(null);
  const suggestionTransformerRef = useRef<Konva.Transformer>(null);

  const image = useHtmlImage(page.imageUrl);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const panOffset = useEditorStore((s) => s.panOffset);
  const setPanOffset = useEditorStore((s) => s.setPanOffset);
  const setZoom = useEditorStore((s) => s.setZoom);
  const segments = useEditorStore((s) => s.segments);
  const selectedSegmentId = useEditorStore((s) => s.selectedSegmentId);
  const setSelectedSegmentId = useEditorStore((s) => s.setSelectedSegmentId);
  const addSegment = useEditorStore((s) => s.addSegment);
  const updateSegment = useEditorStore((s) => s.updateSegment);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setIsDrawing = useEditorStore((s) => s.setIsDrawing);

  const pendingSuggestions = aiSuggestions.filter((s) => s.status === "pending");

  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const draftRef = useRef(draft);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const pageSize = useMemo(() => {
    const aspect = page.imageWidth / page.imageHeight || 3 / 4;
    const maxW = Math.max(120, size.width - 48);
    const maxH = Math.max(120, size.height - 48);
    let width = maxW;
    let height = width / aspect;
    if (height > maxH) {
      height = maxH;
      width = height * aspect;
    }
    return { width, height };
  }, [page.imageWidth, page.imageHeight, size]);

  const layerOffset = useMemo(
    () => ({
      x: panOffset.x + (size.width - pageSize.width * zoom) / 2,
      y: panOffset.y + (size.height - pageSize.height * zoom) / 2,
    }),
    [panOffset.x, panOffset.y, size.width, size.height, pageSize.width, pageSize.height, zoom]
  );

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedNodeRef.current && selectedSegmentId) {
      tr.nodes([selectedNodeRef.current]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      selectedNodeRef.current = null;
    }
  }, [selectedSegmentId, segments, zoom]);

  useEffect(() => {
    const tr = suggestionTransformerRef.current;
    if (!tr) return;
    if (suggestionNodeRef.current && selectedSuggestionId) {
      tr.nodes([suggestionNodeRef.current]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      suggestionNodeRef.current = null;
    }
  }, [selectedSuggestionId, pendingSuggestions, zoom]);

  /** Convert stage pointer → page-local pixel coordinates (pre-normalization). */
  const getPointerOnPage = () => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    // Invert the page layer transform (pan + center + zoom) into page space.
    const transform = layer.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);

    return {
      x: clamp(pos.x, 0, pageSize.width),
      y: clamp(pos.y, 0, pageSize.height),
    };
  };

  const toNormalized = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) =>
    clampCoordinates(
      normalizeRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        pageSize.width,
        pageSize.height
      )
    );

  const cursor =
    activeTool === "pan"
      ? isPanning.current
        ? "grabbing"
        : "grab"
      : activeTool === "draw"
        ? "crosshair"
        : "default";

  return (
    <div ref={containerRef} className="relative h-full min-w-0 flex-1 bg-editor">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        style={{ cursor }}
        onWheel={(e) => {
          e.evt.preventDefault();
          if (!e.evt.ctrlKey && !e.evt.metaKey) return;
          const direction = e.evt.deltaY > 0 ? -1 : 1;
          setZoom(zoom * (direction > 0 ? 1.08 : 1 / 1.08));
        }}
        onMouseDown={(e) => {
          if (activeTool === "pan") {
            isPanning.current = true;
            panStart.current = {
              x: e.evt.clientX,
              y: e.evt.clientY,
              ox: panOffset.x,
              oy: panOffset.y,
            };
            return;
          }

          if (activeTool === "draw") {
            // Only start drawing on empty page area / stage, not while transforming.
            const pos = getPointerOnPage();
            if (!pos) return;
            drawStart.current = pos;
            setIsDrawing(true);
            const next = { x: pos.x, y: pos.y, width: 0, height: 0 };
            draftRef.current = next;
            setDraft(next);
            setSelectedSegmentId(null);
            return;
          }

          if (e.target === e.target.getStage()) {
            setSelectedSegmentId(null);
            onSelectSuggestion?.(null);
          }
        }}
        onMouseMove={(e) => {
          if (activeTool === "pan" && isPanning.current && panStart.current) {
            const dx = e.evt.clientX - panStart.current.x;
            const dy = e.evt.clientY - panStart.current.y;
            setPanOffset({
              x: panStart.current.ox + dx,
              y: panStart.current.oy + dy,
            });
            return;
          }

          if (activeTool === "draw" && drawStart.current) {
            const pos = getPointerOnPage();
            if (!pos) return;
            const next = {
              x: drawStart.current.x,
              y: drawStart.current.y,
              width: pos.x - drawStart.current.x,
              height: pos.y - drawStart.current.y,
            };
            draftRef.current = next;
            setDraft(next);
          }
        }}
        onMouseUp={() => {
          if (activeTool === "pan") {
            isPanning.current = false;
            panStart.current = null;
          }

          if (activeTool === "draw" && drawStart.current) {
            const currentDraft = draftRef.current;
            setIsDrawing(false);
            drawStart.current = null;
            draftRef.current = null;
            setDraft(null);

            if (!currentDraft) return;

            const coords = toNormalized(currentDraft);
            if (
              coords.width >= MIN_SEGMENT_SIZE &&
              coords.height >= MIN_SEGMENT_SIZE
            ) {
              const tempId = `temp-${crypto.randomUUID()}`;
              const segment: Segment = {
                id: tempId,
                clientId: tempId,
                pageId: page.id,
                title: "",
                coordinates: coords,
                hoverColor: "rgba(79, 70, 229, 0.14)",
                hoverOpacity: 0.14,
                isEnabled: true,
              };
              addSegment(segment);
            }
          }
        }}
        onMouseLeave={() => {
          if (activeTool === "pan") {
            isPanning.current = false;
            panStart.current = null;
          }
        }}
      >
        <Layer
          ref={layerRef}
          x={layerOffset.x}
          y={layerOffset.y}
          scaleX={zoom}
          scaleY={zoom}
        >
          {image && (
            <KonvaImage
              image={image}
              width={pageSize.width}
              height={pageSize.height}
              listening={activeTool !== "draw"}
            />
          )}

          {/* Invisible hit area so drawing works over the whole page */}
          <Rect
            x={0}
            y={0}
            width={pageSize.width}
            height={pageSize.height}
            fill="rgba(0,0,0,0.001)"
            listening={activeTool === "draw"}
          />

          {segments.map((segment) => {
            const x = segment.coordinates.x * pageSize.width;
            const y = segment.coordinates.y * pageSize.height;
            const width = segment.coordinates.width * pageSize.width;
            const height = segment.coordinates.height * pageSize.height;
            const selected = segment.id === selectedSegmentId;

            return (
              <Rect
                key={segment.id}
                ref={(node) => {
                  if (selected) selectedNodeRef.current = node;
                }}
                x={x}
                y={y}
                width={width}
                height={height}
                fill={
                  selected
                    ? "rgba(79, 70, 229, 0.18)"
                    : "rgba(79, 70, 229, 0.08)"
                }
                stroke={selected ? "#4338CA" : "#6366F1"}
                strokeWidth={selected ? 2 / zoom : 1.25 / zoom}
                draggable={activeTool === "select"}
                dragBoundFunc={(pos) => ({
                  x: clamp(pos.x, 0, pageSize.width - width),
                  y: clamp(pos.y, 0, pageSize.height - height),
                })}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "select") {
                    onSelectSuggestion?.(null);
                    setSelectedSegmentId(segment.id);
                  }
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "select") {
                    onSelectSuggestion?.(null);
                    setSelectedSegmentId(segment.id);
                  }
                }}
                onDragStart={() => pushHistory()}
                onDragEnd={(e) => {
                  const node = e.target;
                  const coords = toNormalized({
                    x: node.x(),
                    y: node.y(),
                    width: node.width() * node.scaleX(),
                    height: node.height() * node.scaleY(),
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                  updateSegment(segment.id, { coordinates: coords });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const coords = toNormalized({
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(4, node.width() * node.scaleX()),
                    height: Math.max(4, node.height() * node.scaleY()),
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                  node.width(coords.width * pageSize.width);
                  node.height(coords.height * pageSize.height);
                  node.x(coords.x * pageSize.width);
                  node.y(coords.y * pageSize.height);
                  updateSegment(segment.id, { coordinates: coords });
                }}
              />
            );
          })}

          {segments.map((segment, index) => (
            <Text
              key={`label-${segment.id}`}
              x={segment.coordinates.x * pageSize.width + 4}
              y={segment.coordinates.y * pageSize.height + 4}
              text={`#${index + 1}`}
              fontSize={12 / zoom}
              fill="#312E81"
              listening={false}
            />
          ))}

          {pendingSuggestions.map((suggestion) => {
            const x = suggestion.coordinates.x * pageSize.width;
            const y = suggestion.coordinates.y * pageSize.height;
            const width = suggestion.coordinates.width * pageSize.width;
            const height = suggestion.coordinates.height * pageSize.height;
            const selected = suggestion.id === selectedSuggestionId;

            return (
              <Rect
                key={`ai-${suggestion.id}`}
                ref={(node) => {
                  if (selected) suggestionNodeRef.current = node;
                }}
                x={x}
                y={y}
                width={width}
                height={height}
                fill={
                  selected
                    ? "rgba(124, 58, 237, 0.16)"
                    : "rgba(124, 58, 237, 0.06)"
                }
                stroke={selected ? "#6D28D9" : "#8B5CF6"}
                strokeWidth={selected ? 2.5 / zoom : 2 / zoom}
                dash={[8 / zoom, 5 / zoom]}
                draggable={activeTool === "select"}
                dragBoundFunc={(pos) => ({
                  x: clamp(pos.x, 0, pageSize.width - width),
                  y: clamp(pos.y, 0, pageSize.height - height),
                })}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool !== "select") return;
                  setSelectedSegmentId(null);
                  onSelectSuggestion?.(suggestion.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  if (activeTool !== "select") return;
                  setSelectedSegmentId(null);
                  onSelectSuggestion?.(suggestion.id);
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  const coords = toNormalized({
                    x: node.x(),
                    y: node.y(),
                    width: node.width() * node.scaleX(),
                    height: node.height() * node.scaleY(),
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                  onUpdateSuggestionCoordinates?.(suggestion.id, coords);
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const coords = toNormalized({
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(4, node.width() * node.scaleX()),
                    height: Math.max(4, node.height() * node.scaleY()),
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                  node.width(coords.width * pageSize.width);
                  node.height(coords.height * pageSize.height);
                  node.x(coords.x * pageSize.width);
                  node.y(coords.y * pageSize.height);
                  onUpdateSuggestionCoordinates?.(suggestion.id, coords);
                }}
              />
            );
          })}

          {pendingSuggestions.map((suggestion, index) => (
            <Text
              key={`ai-label-${suggestion.id}`}
              x={suggestion.coordinates.x * pageSize.width + 4}
              y={suggestion.coordinates.y * pageSize.height + 4}
              text={`AI ${index + 1}`}
              fontSize={11 / zoom}
              fill="#5B21B6"
              listening={false}
            />
          ))}

          {draft && (
            <Rect
              x={Math.min(draft.x, draft.x + draft.width)}
              y={Math.min(draft.y, draft.y + draft.height)}
              width={Math.abs(draft.width)}
              height={Math.abs(draft.height)}
              fill="rgba(79, 70, 229, 0.12)"
              stroke="#4F46E5"
              strokeWidth={1.5 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          )}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            ignoreStroke
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
            onTransformStart={() => pushHistory()}
          />
          <Transformer
            ref={suggestionTransformerRef}
            rotateEnabled={false}
            ignoreStroke
            borderStroke="#7C3AED"
            anchorStroke="#7C3AED"
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
