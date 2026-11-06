import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import type { CropResult } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crop: CropResult | null;
  loading?: boolean;
}

export function ArticleDrawer({ open, onOpenChange, crop, loading }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, crop?.url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const expanded = zoom > 1.05;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close article overlay"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition"
        onClick={() => onOpenChange(false)}
      />

      <aside
        className={cn(
          "absolute inset-y-0 right-0 flex flex-col border-l border-[#f3d0d0] bg-white shadow-2xl transition-all duration-300",
          expanded
            ? "w-full max-w-full sm:w-[min(92vw,920px)]"
            : "w-full max-w-full sm:w-[min(92vw,420px)]"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#f3d0d0] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b91c1c]">
              Article
            </p>
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              {crop?.title || "Article Preview"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#fecaca] text-[#b91c1c] hover:bg-[#fff1f2]"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-auto bg-[#f8f4f2]"
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
          onPointerLeave={() => {
            dragging.current = false;
          }}
        >
          <div className="flex min-h-full items-start justify-center p-4">
            {loading && (
              <p className="py-16 text-sm text-slate-500">Loading article...</p>
            )}
            {!loading && crop?.url && (
              <img
                src={crop.url}
                alt={crop.title || "Article crop"}
                className="w-full max-w-none select-none object-contain"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "top center",
                }}
                draggable={false}
              />
            )}
            {!loading && !crop?.url && (
              <p className="py-16 text-sm text-red-600">
                Unable to load article crop.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-[#f3d0d0] bg-white px-3 py-3">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] hover:bg-[#fff1f2]"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
          >
            <Minus className="h-3.5 w-3.5" />
            Zoom out
          </button>
          <span className="min-w-12 text-center text-xs font-bold text-[#9f1239]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] hover:bg-[#fff1f2]"
            onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
          >
            <Plus className="h-3.5 w-3.5" />
            Zoom in
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </aside>
    </div>
  );
}
