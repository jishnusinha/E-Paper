import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PdfDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  maxMb?: number;
  progress?: number | null;
}

export function PdfDropzone({
  file,
  onChange,
  maxMb = 100,
  progress = null,
}: PdfDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (next: File) => {
      if (next.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return false;
      }
      if (next.size > maxMb * 1024 * 1024) {
        setError(`File must be under ${maxMb} MB`);
        return false;
      }
      setError(null);
      return true;
    },
    [maxMb]
  );

  const onFile = (next: File | null) => {
    if (!next) {
      onChange(null);
      return;
    }
    if (validate(next)) onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-border bg-slate-50/70 p-8 text-center transition",
          dragging && "border-primary bg-accent/40"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-medium">Drag and drop your newspaper PDF</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or choose a file from your computer
        </p>
        <label className="mt-4 inline-flex cursor-pointer">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <span className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
            Browse PDF
          </span>
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {progress !== null && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
