import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { NewspaperPage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
}

export function MobilePreviewStrip({
  pages,
  activePageId,
  onPageChange,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#f3d0d0] bg-white md:hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9f1239]">
          Page previews
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#b91c1c]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#b91c1c]" />
        )}
      </button>

      {open && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pages.map((page) => {
            const active = page.id === activePageId;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onPageChange(page.id)}
                className={cn(
                  "relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border bg-white transition",
                  active
                    ? "border-[#dc2626] shadow-sm"
                    : "border-[#e7e5e4]"
                )}
              >
                <span className="absolute left-1 top-1 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold text-white">
                  {page.displayPageNumber}
                </span>
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.displayPageNumber}`}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
