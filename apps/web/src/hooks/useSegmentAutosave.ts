import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { segmentsApi } from "@/services/segments";
import type { Segment } from "@/types";

export function useSegmentAutosave(pageId: string | null) {
  const segments = useEditorStore((s) => s.segments);
  const isDirty = useEditorStore((s) => s.isDirty);
  const setSegments = useEditorStore((s) => s.setSegments);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const baselineRef = useRef<Segment[]>([]);
  const timerRef = useRef<number | null>(null);
  const segmentsRef = useRef(segments);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    baselineRef.current = [];
  }, [pageId]);

  useEffect(() => {
    if (!pageId || !isDirty) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const current = segmentsRef.current;
        const baseline = baselineRef.current;
        const baselineIds = new Set(baseline.map((s) => s.id));
        const currentIds = new Set(current.map((s) => s.id));

        const create = current
          .filter((s) => s.id.startsWith("temp-") || !baselineIds.has(s.id))
          .map((s) => ({
            clientId: s.clientId || s.id,
            title: s.title,
            coordinates: s.coordinates,
            hoverColor: s.hoverColor,
            hoverOpacity: s.hoverOpacity,
            isEnabled: s.isEnabled,
          }));

        const update = current
          .filter((s) => !s.id.startsWith("temp-") && baselineIds.has(s.id))
          .map((s) => {
            const prev = baseline.find((b) => b.id === s.id)!;
            return {
              id: s.id,
              data: {
                title: s.title,
                coordinates: s.coordinates,
                hoverColor: s.hoverColor,
                hoverOpacity: s.hoverOpacity,
                isEnabled: s.isEnabled,
              },
              changed:
                JSON.stringify(prev.coordinates) !==
                  JSON.stringify(s.coordinates) ||
                prev.title !== s.title ||
                prev.hoverColor !== s.hoverColor ||
                prev.hoverOpacity !== s.hoverOpacity ||
                prev.isEnabled !== s.isEnabled,
            };
          })
          .filter((u) => u.changed)
          .map(({ id, data }) => ({ id, data }));

        const del = baseline
          .filter((s) => !currentIds.has(s.id) && !s.id.startsWith("temp-"))
          .map((s) => s.id);

        if (create.length === 0 && update.length === 0 && del.length === 0) {
          setSaveStatus("saved");
          return;
        }

        const result = await segmentsApi.batch(pageId, {
          create,
          update,
          delete: del,
        });

        baselineRef.current = result.segments;
        setSegments(result.segments, false);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 700);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [segments, isDirty, pageId, setSaveStatus, setSegments]);

  const markBaseline = useCallback((items: Segment[]) => {
    baselineRef.current = items;
  }, []);

  const flush = useCallback(async () => {
    if (!pageId || !isDirtyRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaveStatus("saving");
    try {
      const current = segmentsRef.current;
      const result = await segmentsApi.batch(pageId, {
        create: current
          .filter((s) => s.id.startsWith("temp-"))
          .map((s) => ({
            clientId: s.id,
            title: s.title,
            coordinates: s.coordinates,
            hoverColor: s.hoverColor,
            hoverOpacity: s.hoverOpacity,
            isEnabled: s.isEnabled,
          })),
        update: current
          .filter((s) => !s.id.startsWith("temp-"))
          .map((s) => ({
            id: s.id,
            data: {
              title: s.title,
              coordinates: s.coordinates,
              hoverColor: s.hoverColor,
              hoverOpacity: s.hoverOpacity,
              isEnabled: s.isEnabled,
            },
          })),
        delete: [],
      });
      baselineRef.current = result.segments;
      setSegments(result.segments, false);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [pageId, setSaveStatus, setSegments]);

  return { markBaseline, flush };
}
