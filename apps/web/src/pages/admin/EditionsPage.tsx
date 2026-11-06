import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { editionsApi } from "@/services/editions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/utils";

export function EditionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["editions", { search, status, page }],
    queryFn: () =>
      editionsApi.list({
        search,
        status,
        page,
        limit: 10,
        sort: "-publicationDate",
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => editionsApi.publish(id),
    onSuccess: () => {
      toast.success("Edition published");
      void queryClient.invalidateQueries({ queryKey: ["editions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => editionsApi.unpublish(id),
    onSuccess: () => {
      toast.success("Edition unpublished");
      void queryClient.invalidateQueries({ queryKey: ["editions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => editionsApi.remove(id),
    onSuccess: () => {
      toast.success("Edition deleted");
      void queryClient.invalidateQueries({ queryKey: ["editions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const totalPages = query.data?.pagination.totalPages ?? 1;
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Newspapers</h2>
          <p className="text-sm text-muted-foreground">
            Manage draft and published editions.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/editions/new">Create Edition</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            placeholder="Search title or date"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="max-w-xs"
          />
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Pages</th>
                  <th className="pb-3 font-medium">Segments</th>
                  <th className="pb-3 font-medium">Theme</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((edition) => (
                  <tr key={edition.id} className="border-b border-border/70">
                    <td className="py-3">
                      {formatDateLabel(edition.publicationDate)}
                    </td>
                    <td className="py-3 font-medium">{edition.title}</td>
                    <td className="py-3">{edition.pageCount ?? 0}</td>
                    <td className="py-3">{edition.segmentCount ?? 0}</td>
                    <td className="py-3">{edition.themeKey}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          edition.publicationStatus === "published"
                            ? "success"
                            : "warning"
                        }
                      >
                        {edition.publicationStatus}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/editions/${edition.id}/editor`}>
                            Editor
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/editions/${edition.id}/preview`}>
                            Preview
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/editions/${edition.id}/theme`}>
                            Theme
                          </Link>
                        </Button>
                        {edition.publicationStatus === "published" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => unpublishMutation.mutate(edition.id)}
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate(edition.id)}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this edition and all of its pages/segments?"
                              )
                            ) {
                              deleteMutation.mutate(edition.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
