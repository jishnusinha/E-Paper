import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import { cn, formatDateLabel } from "@/lib/utils";
import type { EditionDateSummary, NewspaperPage } from "@/types";

interface Props {
  title: string;
  date: string;
  dates: EditionDateSummary[];
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
  onDateChange: (date: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFullscreen?: () => void;
  className?: string;
}

export function ReaderToolbar({
  title,
  date,
  dates,
  pages,
  activePageId,
  onPageChange,
  onDateChange,
  zoom,
  onZoomChange,
  onFullscreen,
  className,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndex = pages.findIndex((page) => page.id === activePageId);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(
      `[data-page-pill="${activePageId}"]`
    );
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activePageId]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-[#f0d0d0] bg-white/95 shadow-[0_1px_0_rgba(185,28,28,0.06)] backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <Link
          to="/"
          aria-label="Back to home"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fff1f2]"
        >
          <Home className="h-4 w-4" />
        </Link>

        <div className="hidden min-w-0 shrink-0 lg:block">
          <p className="truncate font-serif text-lg font-semibold tracking-tight text-[#9f1239]">
            {title}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {formatDateLabel(date)}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled={activeIndex <= 0}
            onClick={() => {
              if (activeIndex > 0) onPageChange(pages[activeIndex - 1].id);
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fff1f2] disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={scrollerRef}
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {pages.map((page) => {
              const active = page.id === activePageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  data-page-pill={page.id}
                  onClick={() => onPageChange(page.id)}
                  className={cn(
                    "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-bold transition",
                    active
                      ? "border-[#dc2626] bg-[#dc2626] text-white shadow-sm"
                      : "border-[#fca5a5] bg-white text-[#b91c1c] hover:bg-[#fff1f2]"
                  )}
                >
                  {page.displayPageNumber}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Next page"
            disabled={activeIndex < 0 || activeIndex >= pages.length - 1}
            onClick={() => {
              if (activeIndex >= 0 && activeIndex < pages.length - 1) {
                onPageChange(pages[activeIndex + 1].id);
              }
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fff1f2] disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b91c1c]" />
            <select
              aria-label="Edition date"
              className="h-9 appearance-none rounded-full border border-[#fecaca] bg-white pl-8 pr-7 text-xs font-medium text-[#9f1239] outline-none focus:ring-2 focus:ring-[#fecaca]"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            >
              {dates.map((item) => (
                <option key={item.date} value={item.date}>
                  {formatDateLabel(item.date)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center rounded-full border border-[#fecaca] bg-white">
            <button
              type="button"
              aria-label="Zoom out"
              className="inline-flex h-9 w-9 items-center justify-center text-[#b91c1c] hover:bg-[#fff1f2]"
              onClick={() => onZoomChange(Math.max(0.5, zoom / 1.15))}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-10 text-center text-[11px] font-semibold text-[#9f1239]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              className="inline-flex h-9 w-9 items-center justify-center text-[#b91c1c] hover:bg-[#fff1f2]"
              onClick={() => onZoomChange(Math.min(4, zoom * 1.15))}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {onFullscreen && (
            <button
              type="button"
              aria-label="Fullscreen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] hover:bg-[#fff1f2]"
              onClick={onFullscreen}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
