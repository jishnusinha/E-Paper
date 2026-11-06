import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, Newspaper } from "lucide-react";
import { publicApi } from "@/services/public";
import { formatDateLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import heroImage from "@/assets/hero.png";

export function LandingPage() {
  const latestQuery = useQuery({
    queryKey: ["public-latest"],
    queryFn: publicApi.latest,
  });

  const datesQuery = useQuery({
    queryKey: ["public-dates"],
    queryFn: publicApi.dates,
  });

  const latestDate = latestQuery.data?.publicationDate;

  const feedQuery = useQuery({
    queryKey: ["public-articles", latestDate],
    queryFn: () => publicApi.articles(latestDate!),
    enabled: Boolean(latestDate),
  });

  const isLoading = latestQuery.isLoading || (latestDate && feedQuery.isLoading);
  const edition = latestQuery.data;
  const feed = feedQuery.data;
  const featured = feed?.articles.slice(0, 6) ?? [];
  const sections = feed?.sections ?? [];
  const recentEditions = (datesQuery.data ?? []).slice(0, 6);
  const cover =
    sections[0]?.imageUrl ||
    datesQuery.data?.find((item) => item.date === latestDate)?.coverThumbnailUrl ||
    heroImage;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <Skeleton className="h-[420px] w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          E-Paper Studio
        </p>
        <p className="mt-4 max-w-xl text-muted-foreground">
          No published newspapers are available yet. Check back after the next
          edition is released, or open the archive once editions go live.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/archive">Browse Archive</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/login">Admin Login</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-8 sm:px-6 sm:py-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Newspaper className="h-3.5 w-3.5" />
            Latest edition
          </p>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {edition.title}
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Read today&apos;s full newspaper, explore marked articles, and
              browse past editions from the archive.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDateLabel(edition.publicationDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {edition.totalPages} pages
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={`/epaper/${edition.publicationDate}`}>
                Read E-Paper
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/archive">News Archive</Link>
            </Button>
          </div>
        </div>

        <Link
          to={`/epaper/${edition.publicationDate}`}
          className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-soft"
        >
          <img
            src={cover}
            alt={`${edition.title} cover`}
            className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:aspect-[3/4]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-5 text-white">
            <p className="font-serif text-xl font-semibold">{edition.title}</p>
            <p className="text-sm text-white/80">
              {formatDateLabel(edition.publicationDate)}
            </p>
          </div>
        </Link>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Featured articles
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stories marked in the latest published edition.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to={`/epaper/${edition.publicationDate}`}>
              Open reader
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/70 px-6 py-12 text-center">
            <p className="font-medium text-foreground">No articles marked yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Segment stories in the editor to feature them on this page.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((article, index) => (
              <Link
                key={article.id}
                to={`/epaper/${edition.publicationDate}`}
                className="group overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {article.pageTitle}
                  </p>
                  <h3 className="font-serif text-xl font-semibold leading-snug text-foreground">
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">
            Today&apos;s sections
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump into each page of the current newspaper.
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/70 px-6 py-12 text-center text-sm text-muted-foreground">
            Sections will appear after pages are published.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section) => (
              <Link
                key={section.pageId}
                to={`/epaper/${edition.publicationDate}`}
                className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft transition hover:-translate-y-0.5"
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={section.thumbnailUrl || section.imageUrl}
                    alt={section.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1 p-3">
                  <p className="font-serif text-lg font-semibold">{section.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Page {section.pageNumber}
                    {section.articleCount > 0
                      ? ` · ${section.articleCount} articles`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Recent editions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Catch up on earlier newspapers from the archive.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/archive">View all</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentEditions.map((item) => (
            <Link
              key={item.date}
              to={`/epaper/${item.date}`}
              className="flex gap-4 rounded-xl border border-border bg-white p-3 shadow-soft transition hover:-translate-y-0.5"
            >
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.coverThumbnailUrl ? (
                  <img
                    src={item.coverThumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Cover
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1 self-center">
                <p className="truncate font-serif text-lg font-semibold">
                  {item.title}
                </p>
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
      </section>
    </div>
  );
}
