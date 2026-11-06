import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AiSuggestionDto, SegmentCoordinates } from "@epaper/shared";
import { editionsApi } from "@/services/editions";
import { segmentsApi } from "@/services/segments";
import { aiApi } from "@/services/ai";
import { useEditorStore } from "@/stores/editorStore";
import { useSegmentAutosave } from "@/hooks/useSegmentAutosave";
import { PageThumbnailSidebar } from "@/features/canvas-editor/PageThumbnailSidebar";
import { CanvasWorkspace } from "@/features/canvas-editor/CanvasWorkspace";
import { SegmentPropertiesPanel } from "@/features/canvas-editor/SegmentPropertiesPanel";
import { EditorToolbar } from "@/features/canvas-editor/EditorToolbar";
import { ProcessingOverlay } from "@/features/canvas-editor/ProcessingOverlay";
import { AiReviewPanel } from "@/features/canvas-editor/AiReviewPanel";
import { AiDetectDialog } from "@/features/canvas-editor/AiDetectDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ACTIVE_AI_STATUSES = new Set([
  "queued",
  "submitted",
  "processing",
]);

function stageLabel(stage?: string | null, status?: string | null): string | null {
  if (!status && !stage) return null;
  const map: Record<string, string> = {
    preparing_image: "Preparing Image…",
    submitting_to_sarvam: "Submitting to Sarvam…",
    document_analysis_running: "Document Analysis Running…",
    retrieving_results: "Retrieving Results…",
    grouping_article_regions: "Grouping Article Regions…",
    suggestions_ready: "Suggestions Ready",
    analysis_failed: "Analysis Failed",
    rejected: "Rejected by Provider",
    partially_completed: "Partially Completed",
    queued: "Queued…",
  };
  if (stage && map[stage]) return map[stage];
  if (status && map[status]) return map[status];
  if (status === "completed") return "Suggestions Ready";
  if (status === "failed") return "Analysis Failed";
  return stage ?? status ?? null;
}

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
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(
    null
  );
  const [detectDialogOpen, setDetectDialogOpen] = useState(false);

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

  const aiJobQuery = useQuery({
    queryKey: ["page-ai-job", activePageId],
    queryFn: () => aiApi.job(activePageId!),
    enabled: Boolean(activePageId),
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status;
      return status && ACTIVE_AI_STATUSES.has(status) ? 2500 : false;
    },
  });

  const suggestionsQuery = useQuery({
    queryKey: ["page-ai-suggestions", activePageId],
    queryFn: () => aiApi.suggestions(activePageId!),
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
    setSelectedSuggestionId(null);
  }, [activePageId]);

  useEffect(() => {
    if (!segmentsQuery.data || !activePageId) return;
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
    if (aiJobQuery.data?.job?.status === "completed") {
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", activePageId],
      });
    }
  }, [aiJobQuery.data?.job?.status, activePageId, queryClient]);

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
        setSelectedSuggestionId(null);
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

  const detectMutation = useMutation({
    mutationFn: (pageId: string) =>
      aiApi.detect(pageId, { language: "bn-IN" }),
    onSuccess: (result, pageId) => {
      setDetectDialogOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-job", pageId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", pageId],
      });
      if (result.cached) {
        toast.success("Loaded cached AI suggestions");
      } else if (result.reused) {
        toast.message("AI analysis already in progress");
      } else {
        toast.success("AI analysis started");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      // Persist any in-flight manual edits before accepting AI segments.
      await flush();
      return aiApi.accept(id);
    },
    onSuccess: (result) => {
      // Segment already exists on the server — merge without dirty/create races.
      const current = useEditorStore.getState().segments;
      const next = [
        ...current.filter((s) => s.id !== result.segment.id),
        {
          id: result.segment.id,
          editionId: result.segment.editionId,
          pageId: result.segment.pageId,
          title: result.segment.title,
          coordinates: result.segment.coordinates,
          hoverColor: result.segment.hoverColor,
          hoverOpacity: result.segment.hoverOpacity,
          isEnabled: result.segment.isEnabled,
        },
      ];
      setSegments(next, false);
      markBaseline(next);
      syncedQueryKeyRef.current = null;
      void queryClient.invalidateQueries({
        queryKey: ["page-segments", activePageId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", activePageId],
      });
      setSelectedSuggestionId(null);
      setSelectedSegmentId(result.segment.id);
      toast.success(
        result.alreadyAccepted ? "Suggestion already accepted" : "Suggestion accepted"
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => aiApi.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", activePageId],
      });
      setSelectedSuggestionId(null);
      toast.message("Suggestion rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const acceptAllMutation = useMutation({
    mutationFn: async () => {
      await flush();
      return aiApi.acceptAll(activePageId!);
    },
    onSuccess: (results) => {
      const current = useEditorStore.getState().segments;
      const byId = new Map(current.map((s) => [s.id, s]));
      for (const result of results) {
        byId.set(result.segment.id, {
          id: result.segment.id,
          editionId: result.segment.editionId,
          pageId: result.segment.pageId,
          title: result.segment.title,
          coordinates: result.segment.coordinates,
          hoverColor: result.segment.hoverColor,
          hoverOpacity: result.segment.hoverOpacity,
          isEnabled: result.segment.isEnabled,
        });
      }
      const next = [...byId.values()];
      setSegments(next, false);
      markBaseline(next);
      syncedQueryKeyRef.current = null;
      void queryClient.invalidateQueries({
        queryKey: ["page-segments", activePageId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", activePageId],
      });
      setSelectedSuggestionId(null);
      toast.success(`Accepted ${results.length} suggestions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectAllMutation = useMutation({
    mutationFn: () => aiApi.rejectAll(activePageId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["page-ai-suggestions", activePageId],
      });
      setSelectedSuggestionId(null);
      toast.message("All pending suggestions rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: ({
      id,
      coordinates,
    }: {
      id: string;
      coordinates: SegmentCoordinates;
    }) => aiApi.updateSuggestion(id, { coordinates }),
    onSuccess: (updated) => {
      queryClient.setQueryData<AiSuggestionDto[]>(
        ["page-ai-suggestions", activePageId],
        (prev) =>
          prev?.map((s) => (s.id === updated.id ? updated : s)) ?? [updated]
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const edition = editionQuery.data;
  const pages = pagesQuery.data ?? [];
  const activePage = pages.find((p) => p.id === activePageId) ?? null;
  const aiMeta = aiJobQuery.data?.ai;
  const job = aiJobQuery.data?.job;
  const suggestions = suggestionsQuery.data ?? [];
  const aiBusy =
    detectMutation.isPending ||
    Boolean(job && ACTIVE_AI_STATUSES.has(job.status));

  const aiDisabledReason = useMemo(() => {
    if (!activePageId) return "Select a page first";
    if (edition?.processingStatus !== "ready") {
      return "Edition is still processing";
    }
    if (aiMeta && !aiMeta.enabled) {
      return aiMeta.configured
        ? "Sarvam AI is disabled (SARVAM_AI_ENABLED=false)"
        : "Sarvam AI is not configured";
    }
    return null;
  }, [activePageId, edition?.processingStatus, aiMeta]);

  const hasCacheHint = Boolean(job?.cached || job?.status === "completed");

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
              <CanvasWorkspace
                page={activePage}
                aiSuggestions={suggestions}
                selectedSuggestionId={selectedSuggestionId}
                onSelectSuggestion={setSelectedSuggestionId}
                onUpdateSuggestionCoordinates={(id, coordinates) =>
                  updateSuggestionMutation.mutate({ id, coordinates })
                }
              />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-editor text-sm text-muted-foreground">
                No pages available
              </div>
            )}
            {selectedSegmentId ? (
              <SegmentPropertiesPanel />
            ) : suggestions.some((s) => s.status === "pending") ? (
              <AiReviewPanel
                suggestions={suggestions}
                selectedId={selectedSuggestionId}
                onSelect={setSelectedSuggestionId}
                onAccept={(id) => acceptMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                onAcceptAll={() => acceptAllMutation.mutate()}
                onRejectAll={() => rejectAllMutation.mutate()}
                busy={
                  acceptMutation.isPending ||
                  rejectMutation.isPending ||
                  acceptAllMutation.isPending ||
                  rejectAllMutation.isPending
                }
              />
            ) : (
              <SegmentPropertiesPanel />
            )}
          </>
        )}
      </div>

      {edition?.processingStatus === "ready" && (
        <EditorToolbar
          onAutoDetect={() => setDetectDialogOpen(true)}
          aiDisabledReason={aiDisabledReason}
          aiLoading={aiBusy}
          aiStatusLabel={stageLabel(job?.stage, job?.status)}
        />
      )}

      <AiDetectDialog
        open={detectDialogOpen}
        onOpenChange={setDetectDialogOpen}
        hasCache={hasCacheHint}
        loading={detectMutation.isPending}
        onConfirm={() => {
          if (!activePageId) {
            toast.error("Select a newspaper page before running AI detection");
            return;
          }
          detectMutation.mutate(activePageId);
        }}
      />
    </div>
  );
}
