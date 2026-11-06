import {
  MousePointer2,
  Square,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils";
import type { EditorTool } from "@epaper/shared";

const tools: Array<{ id: EditorTool; label: string; icon: typeof Square }> = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "draw", label: "Draw Rectangle", icon: Square },
  { id: "pan", label: "Pan", icon: Hand },
];

export function EditorToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedSegmentId = useEditorStore((s) => s.selectedSegmentId);
  const removeSegment = useEditorStore((s) => s.removeSegment);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-white px-4 py-2">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          size="sm"
          variant={activeTool === tool.id ? "default" : "outline"}
          onClick={() => setActiveTool(tool.id)}
          className={cn(activeTool === tool.id && "shadow-sm")}
        >
          <tool.icon className="h-4 w-4" />
          {tool.label}
        </Button>
      ))}
      <div className="mx-2 h-6 w-px bg-border" />
      <Button size="sm" variant="outline" onClick={() => setZoom(zoom * 1.15)}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <span className="min-w-14 text-center text-xs font-medium text-slate-600">
        {Math.round(zoom * 100)}%
      </span>
      <Button size="sm" variant="outline" onClick={() => setZoom(zoom / 1.15)}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => setZoom(1)}>
        <Maximize className="h-4 w-4" />
        Fit
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />
      <Button size="sm" variant="outline" onClick={undo}>
        <Undo2 className="h-4 w-4" />
        Undo
      </Button>
      <Button size="sm" variant="outline" onClick={redo}>
        <Redo2 className="h-4 w-4" />
        Redo
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={!selectedSegmentId}
        onClick={() => {
          if (!selectedSegmentId) return;
          if (window.confirm("Delete the selected segment?")) {
            removeSegment(selectedSegmentId);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
}
