import { create } from "zustand";
import type { EditorTool, SegmentCoordinates } from "@epaper/shared";
import type { Segment } from "@/types";

type HistoryEntry = {
  segments: Segment[];
};

interface EditorState {
  activePageId: string | null;
  selectedSegmentId: string | null;
  activeTool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  segments: Segment[];
  isDrawing: boolean;
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  setActivePageId: (id: string | null) => void;
  setSelectedSegmentId: (id: string | null) => void;
  setActiveTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setSegments: (segments: Segment[], markDirty?: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  addSegment: (segment: Segment) => void;
  updateSegment: (id: string, patch: Partial<Segment>) => void;
  removeSegment: (id: string) => void;
  setIsDrawing: (value: boolean) => void;
  setSaveStatus: (status: EditorState["saveStatus"]) => void;
  resetEditor: () => void;
}

const cloneSegments = (segments: Segment[]) =>
  segments.map((s) => ({
    ...s,
    coordinates: { ...s.coordinates } as SegmentCoordinates,
  }));

export const useEditorStore = create<EditorState>((set, get) => ({
  activePageId: null,
  selectedSegmentId: null,
  activeTool: "select",
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  segments: [],
  isDrawing: false,
  isDirty: false,
  saveStatus: "idle",
  undoStack: [],
  redoStack: [],

  setActivePageId: (id) =>
    set({
      activePageId: id,
      selectedSegmentId: null,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    }),
  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
  setPanOffset: (panOffset) => set({ panOffset }),
  setSegments: (segments, markDirty = false) => {
    const next = cloneSegments(segments);
    const current = get().segments;
    const same =
      current.length === next.length &&
      current.every(
        (segment, index) =>
          segment.id === next[index]?.id &&
          JSON.stringify(segment.coordinates) ===
            JSON.stringify(next[index]?.coordinates) &&
          segment.title === next[index]?.title &&
          segment.hoverColor === next[index]?.hoverColor &&
          segment.hoverOpacity === next[index]?.hoverOpacity &&
          segment.isEnabled === next[index]?.isEnabled
      );

    if (same && get().isDirty === markDirty) return;

    set({
      segments: next,
      isDirty: markDirty,
      undoStack: markDirty ? get().undoStack : [],
      redoStack: markDirty ? get().redoStack : [],
    });
  },
  pushHistory: () => {
    const { segments, undoStack } = get();
    set({
      undoStack: [...undoStack, { segments: cloneSegments(segments) }].slice(
        -50
      ),
      redoStack: [],
    });
  },
  undo: () => {
    const { undoStack, segments, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, { segments: cloneSegments(segments) }],
      segments: cloneSegments(previous.segments),
      isDirty: true,
    });
  },
  redo: () => {
    const { redoStack, segments, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, { segments: cloneSegments(segments) }],
      segments: cloneSegments(next.segments),
      isDirty: true,
    });
  },
  addSegment: (segment) => {
    get().pushHistory();
    set({
      segments: [...get().segments, segment],
      selectedSegmentId: segment.id,
      isDirty: true,
      activeTool: "select",
    });
  },
  updateSegment: (id, patch) => {
    set({
      segments: get().segments.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              coordinates: patch.coordinates
                ? { ...patch.coordinates }
                : s.coordinates,
            }
          : s
      ),
      isDirty: true,
    });
  },
  removeSegment: (id) => {
    get().pushHistory();
    set({
      segments: get().segments.filter((s) => s.id !== id),
      selectedSegmentId:
        get().selectedSegmentId === id ? null : get().selectedSegmentId,
      isDirty: true,
    });
  },
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setSaveStatus: (saveStatus) =>
    set({
      saveStatus,
      isDirty: saveStatus === "saved" ? false : get().isDirty,
    }),
  resetEditor: () =>
    set({
      activePageId: null,
      selectedSegmentId: null,
      activeTool: "select",
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      segments: [],
      isDrawing: false,
      isDirty: false,
      saveStatus: "idle",
      undoStack: [],
      redoStack: [],
    }),
}));
