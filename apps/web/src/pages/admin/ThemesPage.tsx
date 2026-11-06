import { useQuery } from "@tanstack/react-query";
import { themesApi } from "@/services/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function ThemesPage() {
  const themesQuery = useQuery({
    queryKey: ["themes"],
    queryFn: themesApi.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reader Themes</h2>
        <p className="text-sm text-muted-foreground">
          Themes change layout presentation without affecting article segments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {themesQuery.isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}

        {themesQuery.data?.map((theme) => (
          <Card key={theme.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{theme.name}</CardTitle>
                <Badge>{theme.configuration.layout}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{theme.description}</p>
            </CardHeader>
            <CardContent>
              <div
                className="overflow-hidden rounded-lg border border-border"
                style={{
                  background: theme.configuration.viewer.backgroundColor,
                }}
              >
                {theme.configuration.layout === "sidebar" ? (
                  <div className="grid h-48 grid-cols-[72px_1fr]">
                    <div className="space-y-2 border-r border-white/10 bg-white/80 p-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 rounded bg-slate-200" />
                      ))}
                    </div>
                    <div className="m-4 rounded bg-white shadow-sm" />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col">
                    <div className="m-4 flex-1 rounded bg-white/90 shadow-sm" />
                    <div className="flex gap-2 border-t border-white/10 bg-white/80 p-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 w-12 rounded bg-slate-200" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Assign this theme when creating or editing an edition.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
