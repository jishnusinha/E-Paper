import type { Edition } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  edition: Edition;
  onRetry: () => void;
}

export function ProcessingOverlay({ edition, onRetry }: Props) {
  const progress = edition.processingProgress;
  const total = progress?.totalPages ?? 0;
  const done = progress?.completedPages ?? 0;

  const steps = [
    {
      label: "Uploading PDF",
      complete: true,
    },
    {
      label: "Reading PDF",
      complete: ["generating_pages", "creating_previews", "finalizing", "done"].includes(
        progress?.stage ?? ""
      ) || edition.processingStatus === "ready",
    },
    {
      label:
        total > 0
          ? `Generating Pages ${done} / ${total}`
          : "Generating Pages",
      complete: edition.processingStatus === "ready",
      active: progress?.stage === "generating_pages",
    },
    {
      label: "Creating Previews",
      complete: edition.processingStatus === "ready",
      active: progress?.stage === "creating_previews",
    },
  ];

  return (
    <div className="flex h-full flex-1 items-center justify-center bg-editor p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-soft">
        <p className="font-serif text-2xl font-semibold">Preparing Newspaper</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {edition.processingError ||
            progress?.message ||
            "Processing your PDF into interactive pages."}
        </p>

        <div className="mt-6 space-y-3">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span>{step.label}</span>
              <span
                className={
                  step.complete
                    ? "font-medium text-emerald-600"
                    : step.active
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                }
              >
                {step.complete
                  ? "Complete"
                  : step.active
                    ? "In Progress"
                    : "Pending"}
              </span>
            </div>
          ))}
        </div>

        {edition.processingStatus === "failed" && (
          <Button className="mt-6 w-full" onClick={onRetry}>
            Retry Processing
          </Button>
        )}
      </div>
    </div>
  );
}
