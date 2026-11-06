import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/public";
import { EpaperViewer } from "@/features/reader/EpaperViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function EpaperPage() {
  const { date } = useParams();
  const navigate = useNavigate();

  const latestQuery = useQuery({
    queryKey: ["public-latest"],
    queryFn: publicApi.latest,
    enabled: !date,
  });

  const resolvedDate = date || latestQuery.data?.publicationDate;

  const editionQuery = useQuery({
    queryKey: ["public-edition", resolvedDate],
    queryFn: () => publicApi.byDate(resolvedDate!),
    enabled: Boolean(resolvedDate),
  });

  const pagesQuery = useQuery({
    queryKey: ["public-pages", resolvedDate],
    queryFn: () => publicApi.pages(resolvedDate!),
    enabled: Boolean(resolvedDate),
  });

  const datesQuery = useQuery({
    queryKey: ["public-dates"],
    queryFn: publicApi.dates,
  });

  if (!date && latestQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Skeleton className="h-[70vh] w-full max-w-4xl" />
      </div>
    );
  }

  if (!date && !latestQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="font-serif text-3xl font-semibold">E-Paper Studio</p>
        <p className="max-w-md text-muted-foreground">
          No published newspapers are available yet. Check back after the next
          edition is released.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/archive">News Archive</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/login">Admin Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (editionQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="font-serif text-3xl font-semibold">Edition not found</p>
        <p className="text-muted-foreground">
          This date is invalid or the newspaper has not been published.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild>
            <Link to="/epaper">Open latest edition</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!editionQuery.data || !pagesQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Skeleton className="h-[70vh] w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <EpaperViewer
      edition={editionQuery.data}
      pages={pagesQuery.data}
      dates={datesQuery.data ?? []}
      onDateChange={(next) => navigate(`/epaper/${next}`)}
    />
  );
}
