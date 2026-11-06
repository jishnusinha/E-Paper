import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewspaperPage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
  children: React.ReactNode;
  backgroundColor: string;
}

export function BottomTheme({
  pages,
  activePageId,
  onPageChange,
  children,
  backgroundColor,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndex = pages.findIndex((p) => p.id === activePageId);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(
      `[data-page-id="${activePageId}"]`
    );
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activePageId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ backgroundColor }}>
      <div className="min-h-0 flex-1">{children}</div>
      <div className="border-t border-[#f3d0d0] bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={activeIndex <= 0}
            onClick={() => {
              if (activeIndex > 0) onPageChange(pages[activeIndex - 1].id);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] hover:bg-[#fff1f2] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            ref={scrollerRef}
            className="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {pages.map((page) => {
              const active = activePageId === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  data-page-id={page.id}
                  onClick={() => onPageChange(page.id)}
                  className={cn(
                    "relative w-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition",
                    active
                      ? "border-[#dc2626] shadow-sm"
                      : "border-[#e7e5e4] hover:border-[#f87171]"
                  )}
                >
                  <span className="absolute left-1 top-1 z-10 inline-flex h-4 min-w-4 items-center justify-center rounded bg-[#dc2626] px-1 text-[9px] font-bold text-white">
                    {page.displayPageNumber}
                  </span>
                  <img
                    src={page.thumbnailUrl}
                    alt={`Page ${page.displayPageNumber}`}
                    className="aspect-[3/4] w-full rounded object-cover"
                  />
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] hover:bg-[#fff1f2] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
