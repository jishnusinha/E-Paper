import { useRef, useState } from "react";
import type { NewspaperPage, Segment } from "@/types";
import type { ThemeConfiguration } from "@epaper/shared";
import { SegmentOverlay } from "./SegmentOverlay";

interface Props {
  page: NewspaperPage;
  segments: Segment[];
  theme: ThemeConfiguration;
  zoom: number;
  onSelectSegment: (segment: Segment) => void;
}

export function EpaperPageView({
  page,
  segments,
  theme,
  zoom,
  onSelectSegment,
}: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-5">
      <div
        className="relative max-h-full max-w-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          dragging.current = true;
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const dx = e.clientX - last.current.x;
          const dy = e.clientY - last.current.y;
          last.current = { x: e.clientX, y: e.clientY };
          setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <img
          src={page.imageUrl}
          alt={page.title || `Page ${page.displayPageNumber}`}
          className="max-h-[calc(100vh-180px)] w-auto max-w-full select-none object-contain shadow-[0_8px_30px_rgba(80,20,20,0.12)] ring-1 ring-black/5"
          draggable={false}
        />
        <SegmentOverlay
          segments={segments}
          theme={theme}
          onSelect={onSelectSegment}
        />
      </div>
    </div>
  );
}
