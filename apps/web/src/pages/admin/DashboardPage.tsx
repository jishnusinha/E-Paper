import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { editionsApi } from "@/services/editions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateLabel } from "@/lib/utils";

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: editionsApi.stats,
  });
  const editionsQuery = useQuery({
    queryKey: ["editions", "recent"],
    queryFn: () => editionsApi.list({ page: 1, limit: 5, sort: "-updatedAt" }),
  });

  const stats = [
    { label: "Total Editions", value: statsQuery.data?.totalEditions },
    { label: "Published", value: statsQuery.data?.publishedEditions },
    { label: "Drafts", value: statsQuery.data?.draftEditions },
    { label: "Pages", value: statsQuery.data?.totalPages },
    { label: "Segments", value: statsQuery.data?.totalSegments },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Live publishing metrics from your newspaper archive.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{item.value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Editions</CardTitle>
        </CardHeader>
        <CardContent>
          {editionsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : editionsQuery.data?.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Pages</th>
                    <th className="pb-3 font-medium">Segments</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editionsQuery.data.items.map((edition) => (
                    <tr key={edition.id} className="border-b border-border/70">
                      <td className="py-3">
                        {formatDateLabel(edition.publicationDate)}
                      </td>
                      <td className="py-3 font-medium">{edition.title}</td>
                      <td className="py-3">{edition.pageCount ?? 0}</td>
                      <td className="py-3">{edition.segmentCount ?? 0}</td>
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
                        <Link
                          className="text-primary hover:underline"
                          to={`/admin/editions/${edition.id}/editor`}
                        >
                          Open editor
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium">No editions yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your first newspaper to start building an interactive
                e-paper.
              </p>
              <Link
                to="/admin/editions/new"
                className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Create Edition
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
