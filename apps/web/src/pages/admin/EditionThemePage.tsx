import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { editionsApi } from "@/services/editions";
import { themesApi } from "@/services/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EditionThemePage() {
  const { editionId = "" } = useParams();
  const queryClient = useQueryClient();

  const editionQuery = useQuery({
    queryKey: ["edition", editionId],
    queryFn: () => editionsApi.get(editionId),
  });
  const themesQuery = useQuery({
    queryKey: ["themes"],
    queryFn: themesApi.list,
  });

  const mutation = useMutation({
    mutationFn: (themeId: string) => editionsApi.setTheme(editionId, themeId),
    onSuccess: () => {
      toast.success("Theme updated");
      void queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Choose Reader Theme</h2>
        <p className="text-sm text-muted-foreground">
          Changing theme never modifies saved article segments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {themesQuery.data?.map((theme) => {
          const selected = editionQuery.data?.themeId === theme.id;
          return (
            <Card key={theme.id} className={selected ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{theme.name}</CardTitle>
                  {selected && <Badge variant="success">Selected</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={selected ? "secondary" : "default"}
                  disabled={selected || mutation.isPending}
                  onClick={() => mutation.mutate(theme.id)}
                >
                  {selected ? "Current Theme" : "Select Theme"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
