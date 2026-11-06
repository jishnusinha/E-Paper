import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CLASSIC_SIDEBAR_THEME } from "@epaper/shared";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { publicApi } from "@/services/public";
import type { CropResult, Edition, NewspaperPage, Segment } from "@/types";
import { ReaderToolbar } from "./ReaderToolbar";
import { PageFlipStage, type FlipDirection } from "./PageFlipStage";
import { ArticleDrawer } from "./ArticleDrawer";
import { MobilePreviewStrip } from "./MobilePreviewStrip";
import { MobilePaginationBar } from "./MobilePaginationBar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageFlipSound } from "@/hooks/usePageFlipSound";
import { cn } from "@/lib/utils";

interface Props {
  edition: Edition;
  pages: NewspaperPage[];
  dates?: Array<{ date: string; title: string }>;
  onDateChange?: (date: string) => void;
  segmentsByPage?: Record<string, Segment[]>;
  fetchPublicSegments?: boolean;
  cropFetcher?: (segmentId: string) => Promise<CropResult>;
}

const READER_RED_THEME = {
  ...CLASSIC_SIDEBAR_THEME,
  viewer: {
    ...CLASSIC_SIDEBAR_THEME.viewer,
    backgroundColor: "#ece7e4",
  },
  segments: {
    hoverColor: "rgba(220, 38, 38, 0.14)",
    hoverOpacity: 0.14,
    borderColor: "rgba(185, 28, 28, 0.8)",
    borderRadius: 2,
  },
};

export function EpaperViewer({
  edition,
  pages,
  dates = [],
  onDateChange,
  segmentsByPage,
  fetchPublicSegments = true,
  cropFetcher,
}: Props) {
  const [activePageId, setActivePageId] = useState(pages[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [crop, setCrop] = useState<CropResult | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flipDirection, setFlipDirection] = useState<FlipDirection>(null);
  const [flipKey, setFlipKey] = useState(0);
  const { play: playFlipSound } = usePageFlipSound();

  useEffect(() => {
    if (pages.length && !pages.some((p) => p.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId]);

  const segmentsQuery = useQuery({
    queryKey: ["public-segments", activePageId],
    queryFn: () => publicApi.segments(activePageId),
    enabled: fetchPublicSegments && Boolean(activePageId) && !segmentsByPage,
  });

  const segments = useMemo(() => {
    if (segmentsByPage && activePageId) {
      return segmentsByPage[activePageId] ?? [];
    }
    return segmentsQuery.data ?? [];
  }, [segmentsByPage, activePageId, segmentsQuery.data]);

  const theme = {
    ...READER_RED_THEME,
    layout: "sidebar" as const,
  };

  const activeIndex = pages.findIndex((p) => p.id === activePageId);
  const activePage = pages[activeIndex] ?? null;

  const goToPage = useCallback(
    (pageId: string) => {
      if (!pageId || pageId === activePageId) return;
      const nextIndex = pages.findIndex((p) => p.id === pageId);
      if (nextIndex < 0) return;

      const direction: FlipDirection =
        activeIndex < 0 ? "next" : nextIndex > activeIndex ? "next" : "prev";

      setFlipDirection(direction);
      setFlipKey((k) => k + 1);
      void playFlipSound();
      setActivePageId(pageId);
      setZoom(1);
    },
    [activePageId, activeIndex, pages, playFlipSound]
  );

  const goPrev = useCallback(() => {
    if (activeIndex > 0) goToPage(pages[activeIndex - 1].id);
  }, [activeIndex, pages, goToPage]);

  const goNext = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < pages.length - 1) {
      goToPage(pages[activeIndex + 1].id);
    }
  }, [activeIndex, pages, goToPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const openSegment = async (segment: Segment) => {
    setModalOpen(true);
    setCropLoading(true);
    setCrop(null);
    try {
      const result = cropFetcher
        ? await cropFetcher(segment.id)
        : await publicApi.crop(segment.id);
      setCrop(result);
    } catch {
      setCrop(null);
    } finally {
      setCropLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f7f2f0]">
      <ReaderToolbar
        className="hidden md:block"
        title={edition.title}
        date={edition.publicationDate}
        dates={
          dates.length
            ? dates
            : [{ date: edition.publicationDate, title: edition.title }]
        }
        pages={pages}
        activePageId={activePageId}
        onPageChange={goToPage}
        onDateChange={(date) => onDateChange?.(date)}
        zoom={zoom}
        onZoomChange={setZoom}
        onFullscreen={() => {
          void document.documentElement.requestFullscreen?.();
        }}
      />

      <MobilePreviewStrip
        pages={pages}
        activePageId={activePageId}
        onPageChange={goToPage}
      />

      <div className="flex min-h-0 flex-1">
        {/* Desktop / tablet sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-[#f3d0d0] bg-[#faf7f7] transition-all md:flex md:flex-col",
            sidebarCollapsed ? "w-16" : "w-44"
          )}
        >
          <div className="flex items-center justify-between border-b border-[#f3d0d0] px-2 py-2.5">
            {!sidebarCollapsed && (
              <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9f1239]">
                Pages
              </p>
            )}
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Expand pages" : "Collapse pages"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#b91c1c] hover:bg-[#ffe4e6]"
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-2.5">
            {pages.map((page) => {
              const active = activePageId === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => goToPage(page.id)}
                  className={cn(
                    "relative w-full overflow-hidden rounded-xl border bg-white p-1 text-left transition",
                    active
                      ? "border-[#dc2626] shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
                      : "border-[#e7e5e4] hover:border-[#f87171]"
                  )}
                >
                  <span className="absolute left-1.5 top-1.5 z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[11px] font-bold text-white">
                    {page.displayPageNumber}
                  </span>
                  <img
                    src={page.thumbnailUrl}
                    alt={`Page ${page.displayPageNumber}`}
                    className="aspect-[3/4] w-full rounded-lg object-cover"
                  />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {activePage ? (
            <PageFlipStage
              page={activePage}
              segments={segments}
              theme={theme}
              zoom={zoom}
              canGoPrev={activeIndex > 0}
              canGoNext={activeIndex >= 0 && activeIndex < pages.length - 1}
              flipDirection={flipDirection}
              flipKey={flipKey}
              onFlipPrev={goPrev}
              onFlipNext={goNext}
              onSelectSegment={openSegment}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <Skeleton className="h-[70vh] w-full max-w-3xl" />
            </div>
          )}
        </div>
      </div>

      <MobilePaginationBar
        pages={pages}
        activePageId={activePageId}
        onPageChange={goToPage}
      />

      <ArticleDrawer
        open={modalOpen}
        onOpenChange={setModalOpen}
        crop={crop}
        loading={cropLoading}
      />
    </div>
  );
}
