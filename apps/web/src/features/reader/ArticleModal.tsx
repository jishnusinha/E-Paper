import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { CropResult } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crop: CropResult | null;
  loading?: boolean;
}

export function ArticleModal({ open, onOpenChange, crop, loading }: Props) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(960px,96vw)] overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{crop?.title || "Article Preview"}</DialogTitle>
        </DialogHeader>

        <div
          className="relative flex max-h-[70vh] min-h-[280px] items-center justify-center overflow-hidden bg-slate-100"
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
          {loading && (
            <p className="text-sm text-muted-foreground">Loading article...</p>
          )}
          {!loading && crop?.url && (
            <img
              src={crop.url}
              alt={crop.title || "Article crop"}
              className="max-h-[68vh] max-w-full select-none object-contain"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
              draggable={false}
            />
          )}
          {!loading && !crop?.url && (
            <p className="text-sm text-destructive">Unable to load article crop.</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
          >
            <Minus className="h-4 w-4" />
            Zoom Out
          </Button>
          <span className="min-w-14 text-center text-sm font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
          >
            <Plus className="h-4 w-4" />
            Zoom In
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
