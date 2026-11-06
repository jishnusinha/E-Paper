import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { publicApi } from "@/services/public";
import { formatDateLabel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ArchivePage() {
  const [query, setQuery] = useState("");

  const datesQuery = useQuery({
    queryKey: ["public-dates"],
    queryFn: publicApi.dates,
  });

  const editions = useMemo(() => {
    const items = datesQuery.data ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.date.includes(needle) ||
        formatDateLabel(item.date).toLowerCase().includes(needle)
    );
  }, [datesQuery.data, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          News archive
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Past editions
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse every published newspaper by date and open it in the e-paper
          reader.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or date"
          className="pl-9"
        />
      </div>

      {datesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : editions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/70 px-6 py-16 text-center">
          <p className="font-serif text-2xl font-semibold">
            {datesQuery.data?.length ? "No matching editions" : "Archive is empty"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {datesQuery.data?.length
              ? "Try a different search term."
              : "Published newspapers will appear here."}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {editions.map((item) => (
            <Link
              key={item.date}
              to={`/epaper/${item.date}`}
              className="group overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                {item.coverThumbnailUrl ? (
                  <img
                    src={item.coverThumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No cover preview
                  </div>
                )}
              </div>
              <div className="space-y-1 p-4">
                <h2 className="font-serif text-xl font-semibold">{item.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDateLabel(item.date)}
                </p>
                {typeof item.totalPages === "number" && (
                  <p className="text-xs text-muted-foreground">
                    {item.totalPages} pages
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
