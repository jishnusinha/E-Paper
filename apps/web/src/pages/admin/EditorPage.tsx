import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { editionsApi } from "@/services/editions";
import { segmentsApi } from "@/services/segments";
import { useEditorStore } from "@/stores/editorStore";
import { useSegmentAutosave } from "@/hooks/useSegmentAutosave";
import { PageThumbnailSidebar } from "@/features/canvas-editor/PageThumbnailSidebar";
import { CanvasWorkspace } from "@/features/canvas-editor/CanvasWorkspace";
import { SegmentPropertiesPanel } from "@/features/canvas-editor/SegmentPropertiesPanel";
import { EditorToolbar } from "@/features/canvas-editor/EditorToolbar";
import { ProcessingOverlay } from "@/features/canvas-editor/ProcessingOverlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EditorPage() {
  const { editionId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const syncedQueryKeyRef = useRef<string | null>(null);

  const activePageId = useEditorStore((s) => s.activePageId);
  const setActivePageId = useEditorStore((s) => s.setActivePageId);
  const setSegments = useEditorStore((s) => s.setSegments);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const removeSegment = useEditorStore((s) => s.removeSegment);
  const selectedSegmentId = useEditorStore((s) => s.selectedSegmentId);
  const setSelectedSegmentId = useEditorStore((s) => s.setSelectedSegmentId);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const isDirty = useEditorStore((s) => s.isDirty);

  const { markBaseline, flush } = useSegmentAutosave(activePageId);

  const editionQuery = useQuery({
    queryKey: ["edition", editionId],
    queryFn: () => editionsApi.get(editionId),
    enabled: Boolean(editionId),
    refetchInterval: (query) => {
      const status = query.state.data?.processingStatus;
      return status === "ready" || status === "failed" ? false : 1500;
    },
  });

  const pagesQuery = useQuery({
    queryKey: ["edition-pages", editionId],
    queryFn: () => editionsApi.pages(editionId),
    enabled:
      Boolean(editionId) && editionQuery.data?.processingStatus === "ready",
  });

  const segmentsQuery = useQuery({
    queryKey: ["page-segments", activePageId],
    queryFn: () => segmentsApi.list(activePageId!),
    enabled: Boolean(activePageId),
  });

  useEffect(() => {
    return () => resetEditor();
  }, [resetEditor]);

  useEffect(() => {
    if (!pagesQuery.data?.length) return;
    if (!activePageId || !pagesQuery.data.some((p) => p.id === activePageId)) {
      setActivePageId(pagesQuery.data[0].id);
    }
  }, [pagesQuery.data, activePageId, setActivePageId]);

  useEffect(() => {
    if (!segmentsQuery.data || !activePageId) return;
    // Avoid overwriting in-progress local edits, and only sync once per fetch.
    const syncKey = `${activePageId}:${segmentsQuery.dataUpdatedAt}`;
    if (syncedQueryKeyRef.current === syncKey) return;
    if (isDirty) return;

    syncedQueryKeyRef.current = syncKey;
    setSegments(segmentsQuery.data, false);
    markBaseline(segmentsQuery.data);
  }, [
    activePageId,
    segmentsQuery.data,
    segmentsQuery.dataUpdatedAt,
    isDirty,
    setSegments,
    markBaseline,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedSegmentId) {
          e.preventDefault();
          removeSegment(selectedSegmentId);
        }
      }
      if (e.key === "Escape") {
        setSelectedSegmentId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    undo,
    redo,
    removeSegment,
    selectedSegmentId,
    setSelectedSegmentId,
  ]);

  const publishMutation = useMutation({
    mutationFn: () => editionsApi.publish(editionId),
    onSuccess: () => {
      toast.success("Edition published");
      void queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retryMutation = useMutation({
    mutationFn: () => editionsApi.retryProcessing(editionId),
    onSuccess: () => {
      toast.success("Processing restarted");
      void queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const edition = editionQuery.data;
  const pages = pagesQuery.data ?? [];
  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/admin/editions" className="font-serif text-lg font-semibold">
            E-Paper Studio
          </Link>
          <div>
            <p className="text-sm font-medium">{edition?.title ?? "Loading..."}</p>
            <p className="text-xs text-muted-foreground">
              {edition?.publicationDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              saveStatus === "error"
                ? "destructive"
                : saveStatus === "saved"
                  ? "success"
                  : "outline"
            }
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "All changes saved"
                : saveStatus === "error"
                  ? "Unable to save — Retry"
                  : "Ready"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/editions/${editionId}/preview`)}
          >
            Preview
          </Button>
          <Button
            onClick={async () => {
              await flush();
              publishMutation.mutate();
            }}
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {edition && edition.processingStatus !== "ready" ? (
          <ProcessingOverlay
            edition={edition}
            onRetry={() => retryMutation.mutate()}
          />
        ) : (
          <>
            <PageThumbnailSidebar
              pages={pages}
              onSelect={async (pageId) => {
                await flush();
                setActivePageId(pageId);
              }}
            />
            {activePage ? (
              <CanvasWorkspace page={activePage} />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-editor text-sm text-muted-foreground">
                No pages available
              </div>
            )}
            <SegmentPropertiesPanel />
          </>
        )}
      </div>

      {edition?.processingStatus === "ready" && <EditorToolbar />}
    </div>
  );
}
