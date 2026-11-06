import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { segmentsApi } from "@/services/segments";
import { toast } from "sonner";

export function SegmentPropertiesPanel() {
  const segments = useEditorStore((s) => s.segments);
  const selectedSegmentId = useEditorStore((s) => s.selectedSegmentId);
  const updateSegment = useEditorStore((s) => s.updateSegment);
  const removeSegment = useEditorStore((s) => s.removeSegment);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const selected = segments.find((s) => s.id === selectedSegmentId) ?? null;
  const [title, setTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setTitle(selected?.title ?? "");
  }, [selected?.id, selected?.title]);

  if (!selected) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-white p-4">
        <p className="text-sm font-semibold">Properties</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a segment to edit its title, position, and appearance.
        </p>
      </aside>
    );
  }

  const index = segments.findIndex((s) => s.id === selected.id) + 1;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">Selected Segment</p>
        <p className="text-xs text-muted-foreground">Segment #{index}</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label>Article Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== (selected.title ?? "")) {
                pushHistory();
                updateSegment(selected.id, { title });
              }
            }}
            placeholder="Optional"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <Label>X</Label>
            <p className="mt-1 rounded-md bg-slate-50 px-2 py-2">
              {(selected.coordinates.x * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <Label>Y</Label>
            <p className="mt-1 rounded-md bg-slate-50 px-2 py-2">
              {(selected.coordinates.y * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <Label>Width</Label>
            <p className="mt-1 rounded-md bg-slate-50 px-2 py-2">
              {(selected.coordinates.width * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <Label>Height</Label>
            <p className="mt-1 rounded-md bg-slate-50 px-2 py-2">
              {(selected.coordinates.height * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hover Color</Label>
          <Input
            value={selected.hoverColor ?? "rgba(79, 70, 229, 0.14)"}
            onChange={(e) =>
              updateSegment(selected.id, { hoverColor: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Hover Opacity</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={selected.hoverOpacity ?? 0.14}
            onChange={(e) =>
              updateSegment(selected.id, {
                hoverOpacity: Number(e.target.value),
              })
            }
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.isEnabled !== false}
            onChange={(e) =>
              updateSegment(selected.id, { isEnabled: e.target.checked })
            }
          />
          Segment Enabled
        </label>

        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            try {
              if (selected.id.startsWith("temp-")) {
                toast.error("Save the segment before previewing");
                return;
              }
              const crop = await segmentsApi.crop(selected.id);
              setPreviewUrl(crop.url);
              setPreviewOpen(true);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Preview failed"
              );
            }
          }}
        >
          Preview Article
        </Button>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (window.confirm("Delete this segment?")) {
              removeSegment(selected.id);
            }
          }}
        >
          Delete Segment
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Article Preview</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Article crop"
              className="max-h-[70vh] w-full object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
