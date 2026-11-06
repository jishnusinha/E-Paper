import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { NewspaperPage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
  children: React.ReactNode;
  backgroundColor: string;
}

export function SidebarTheme({
  pages,
  activePageId,
  onPageChange,
  children,
  backgroundColor,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-0 flex-1" style={{ backgroundColor }}>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[#f3d0d0] bg-[#faf7f7] transition-all md:flex md:flex-col",
          collapsed ? "w-16" : "w-40"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#f3d0d0] px-2 py-2.5">
          {!collapsed && (
            <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9f1239]">
              Pages
            </p>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand pages" : "Collapse pages"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#b91c1c] hover:bg-[#ffe4e6]"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
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
                onClick={() => onPageChange(page.id)}
                className={cn(
                  "group relative w-full overflow-hidden rounded-md border bg-white p-1 text-left transition",
                  active
                    ? "border-[#dc2626] shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
                    : "border-[#e7e5e4] hover:border-[#f87171]"
                )}
              >
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold text-white",
                    active ? "bg-[#dc2626]" : "bg-[#b91c1c]/80"
                  )}
                >
                  {page.displayPageNumber}
                </span>
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.displayPageNumber}`}
                  className="aspect-[3/4] w-full rounded-[3px] object-cover"
                />
              </button>
            );
          })}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
