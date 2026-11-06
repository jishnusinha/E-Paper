import type { NewspaperPage } from "@/types";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editorStore";

interface Props {
  pages: NewspaperPage[];
  onSelect: (pageId: string) => void;
}

export function PageThumbnailSidebar({ pages, onSelect }: Props) {
  const activePageId = useEditorStore((s) => s.activePageId);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">Pages</p>
        <p className="text-xs text-muted-foreground">{pages.length} total</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => onSelect(page.id)}
            className={cn(
              "w-full rounded-lg border border-border p-2 text-left transition hover:border-primary/40",
              activePageId === page.id && "border-primary bg-accent/50"
            )}
          >
            <img
              src={page.thumbnailUrl}
              alt={`Page ${page.displayPageNumber}`}
              className="aspect-[3/4] w-full rounded object-cover bg-slate-100"
              loading="lazy"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                Page {page.displayPageNumber}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {page.segmentCount ?? 0} seg
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
