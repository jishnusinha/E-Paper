import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { publicationDateSchema } from "@epaper/shared";
import { themesApi } from "@/services/themes";
import { PdfDropzone } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

const schema = z.object({
  title: z.string().min(1).max(200),
  publicationDate: publicationDateSchema,
  themeId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateEditionPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const themesQuery = useQuery({
    queryKey: ["themes"],
    queryFn: themesApi.list,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      publicationDate: new Date().toISOString().slice(0, 10),
      themeId: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!file) {
      toast.error("Please select a newspaper PDF");
      return;
    }

    const form = new FormData();
    form.append("title", values.title);
    form.append("publicationDate", values.publicationDate);
    if (values.themeId) form.append("themeId", values.themeId);
    form.append("pdf", file);

    try {
      setProgress(0);
      const { data } = await api.post("/admin/editions", form, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      toast.success("Edition created");
      navigate(`/admin/editions/${data.data.id}/editor`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Create Edition</h2>
        <p className="text-sm text-muted-foreground">
          Upload a multi-page newspaper PDF and open the canvas editor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edition details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Newspaper Title</Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicationDate">Publication Date</Label>
              <Input
                id="publicationDate"
                type="date"
                {...register("publicationDate")}
              />
              {errors.publicationDate && (
                <p className="text-xs text-destructive">
                  {errors.publicationDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="themeId">Viewer Theme</Label>
              <select
                id="themeId"
                className="flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
                {...register("themeId")}
              >
                <option value="">Classic Sidebar (default)</option>
                {themesQuery.data?.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Newspaper PDF</Label>
              <PdfDropzone
                file={file}
                onChange={setFile}
                progress={progress}
              />
            </div>

            <Button disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Creating..." : "Create & Open Editor"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
