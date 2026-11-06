import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { editionsApi } from "@/services/editions";
import { segmentsApi } from "@/services/segments";
import { EpaperViewer } from "@/features/reader/EpaperViewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export function PreviewPage() {
  const { editionId = "" } = useParams();

  const previewQuery = useQuery({
    queryKey: ["edition-preview", editionId],
    queryFn: () => editionsApi.preview(editionId),
    enabled: Boolean(editionId),
  });

  const segmentsByPage = useMemo(() => {
    const map: Record<string, NonNullable<typeof previewQuery.data>["segments"]> =
      {};
    for (const segment of previewQuery.data?.segments ?? []) {
      if (!map[segment.pageId]) map[segment.pageId] = [];
      map[segment.pageId]!.push(segment);
    }
    return map;
  }, [previewQuery.data?.segments]);

  if (previewQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-[70vh] w-full max-w-4xl" />
      </div>
    );
  }

  if (!previewQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p>Preview unavailable</p>
        <Button asChild variant="outline">
          <Link to="/admin/editions">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-4 top-4 z-50 flex gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to={`/admin/editions/${editionId}/editor`}>Back to editor</Link>
        </Button>
      </div>
      <EpaperViewer
        edition={previewQuery.data.edition}
        pages={previewQuery.data.pages}
        segmentsByPage={segmentsByPage}
        fetchPublicSegments={false}
        cropFetcher={(segmentId) => segmentsApi.crop(segmentId)}
      />
    </div>
  );
}
