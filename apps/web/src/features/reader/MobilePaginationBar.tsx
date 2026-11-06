import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewspaperPage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
}

export function MobilePaginationBar({
  pages,
  activePageId,
  onPageChange,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndex = pages.findIndex((p) => p.id === activePageId);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(
      `[data-mobile-pill="${activePageId}"]`
    );
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activePageId]);

  return (
    <div className="sticky bottom-0 z-40 border-t border-[#f3d0d0] bg-white/95 px-2 py-2 backdrop-blur md:hidden">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={activeIndex <= 0}
          onClick={() => {
            if (activeIndex > 0) onPageChange(pages[activeIndex - 1].id);
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollerRef}
          className="flex flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pages.map((page) => {
            const active = page.id === activePageId;
            return (
              <button
                key={page.id}
                type="button"
                data-mobile-pill={page.id}
                onClick={() => onPageChange(page.id)}
                className={cn(
                  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition",
                  active
                    ? "border-[#dc2626] bg-[#dc2626] text-white"
                    : "border-[#fca5a5] bg-white text-[#b91c1c]"
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
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
