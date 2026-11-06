import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ThemeConfiguration } from "@epaper/shared";
import type { NewspaperPage, Segment } from "@/types";
import { SegmentOverlay } from "./SegmentOverlay";
import { cn } from "@/lib/utils";

export type FlipDirection = "next" | "prev" | null;

interface Props {
  page: NewspaperPage;
  segments: Segment[];
  theme: ThemeConfiguration;
  zoom: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  flipDirection: FlipDirection;
  flipKey: number;
  onFlipPrev: () => void;
  onFlipNext: () => void;
  onSelectSegment: (segment: Segment) => void;
}

export function PageFlipStage({
  page,
  segments,
  theme,
  zoom,
  canGoPrev,
  canGoNext,
  flipDirection,
  flipKey,
  onFlipPrev,
  onFlipNext,
  onSelectSegment,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [displayPage, setDisplayPage] = useState(page);
  const [displaySegments, setDisplaySegments] = useState(segments);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => setViewportWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!flipDirection) {
      setDisplayPage(page);
      setDisplaySegments(segments);
      return;
    }

    setAnimating(true);
    const timer = window.setTimeout(() => {
      setDisplayPage(page);
      setDisplaySegments(segments);
      setAnimating(false);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [flipKey, flipDirection, page, segments]);

  const aspect =
    displayPage.imageWidth > 0 && displayPage.imageHeight > 0
      ? displayPage.imageWidth / displayPage.imageHeight
      : 3 / 4;

  // Fill the available content width by default; zoom scales that width.
  const paperWidth = useMemo(() => {
    const usable = Math.max(0, viewportWidth - 8);
    return Math.max(1, usable * Math.max(0.5, zoom));
  }, [viewportWidth, zoom]);

  const paperHeight = paperWidth / aspect;

  return (
    <div className="relative h-full min-h-0 w-full bg-[#ece7e4]">
      {/* Edge flip zones stay fixed over the scroll viewport */}
      <button
        type="button"
        aria-label="Previous page"
        disabled={!canGoPrev}
        onClick={onFlipPrev}
        className={cn(
          "group absolute left-0 top-0 z-30 flex h-full w-10 items-center justify-center sm:w-12",
          "bg-gradient-to-r from-black/10 to-transparent opacity-80 transition hover:opacity-100",
          !canGoPrev && "pointer-events-none opacity-0"
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#b91c1c] shadow-md ring-1 ring-[#fecaca] transition group-hover:scale-105">
          <ChevronLeft className="h-5 w-5" />
        </span>
      </button>

      <button
        type="button"
        aria-label="Next page"
        disabled={!canGoNext}
        onClick={onFlipNext}
        className={cn(
          "group absolute right-0 top-0 z-30 flex h-full w-10 items-center justify-center sm:w-12",
          "bg-gradient-to-l from-black/10 to-transparent opacity-80 transition hover:opacity-100",
          !canGoNext && "pointer-events-none opacity-0"
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#b91c1c] shadow-md ring-1 ring-[#fecaca] transition group-hover:scale-105">
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>

      <div
        ref={viewportRef}
        className="h-full w-full overflow-auto overscroll-contain"
      >
        <div
          className={cn(
            "mx-auto flex min-h-full w-full justify-center py-2",
            animating && flipDirection === "next" && "page-flip-next",
            animating && flipDirection === "prev" && "page-flip-prev"
          )}
        >
          {/* Paper frame is sized exactly to the rendered page — overlays clip here */}
          <div
            className="relative shrink-0 overflow-hidden bg-white shadow-[0_10px_40px_rgba(80,20,20,0.14)] ring-1 ring-black/5"
            style={{
              width: paperWidth || "100%",
              height: paperHeight || "auto",
            }}
          >
            <img
              src={displayPage.imageUrl}
              alt={
                displayPage.title || `Page ${displayPage.displayPageNumber}`
              }
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
            />
            <SegmentOverlay
              segments={displaySegments}
              theme={theme}
              onSelect={onSelectSegment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
