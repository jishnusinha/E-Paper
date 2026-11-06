import { Sparkles, Check, X } from "lucide-react";
import type { AiSuggestionDto } from "@epaper/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  suggestions: AiSuggestionDto[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  busy?: boolean;
}

export function AiReviewPanel({
  suggestions,
  selectedId,
  onSelect,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  busy,
}: Props) {
  const pending = suggestions.filter((s) => s.status === "pending");
  const accepted = suggestions.filter((s) => s.status === "accepted").length;
  const rejected = suggestions.filter((s) => s.status === "rejected").length;

  if (suggestions.length === 0) return null;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">AI Article Suggestions</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {suggestions.length} found · {pending.length} pending · {accepted}{" "}
          accepted · {rejected} rejected
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => onSelect(suggestion.id)}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-left transition",
              selectedId === suggestion.id
                ? "border-violet-500 bg-violet-50"
                : "border-border hover:bg-slate-50",
              suggestion.status !== "pending" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-medium">
                {suggestion.title || `Suggestion ${index + 1}`}
              </p>
              <Badge
                variant={
                  suggestion.status === "accepted"
                    ? "success"
                    : suggestion.status === "rejected"
                      ? "destructive"
                      : "outline"
                }
              >
                {suggestion.status}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {suggestion.confidence == null
                ? "Needs Review"
                : `Confidence ${(suggestion.confidence * 100).toFixed(0)}%`}
            </p>
            {suggestion.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(suggestion.id);
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(suggestion.id);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            )}
          </button>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2 border-t border-border p-3">
          <Button
            className="w-full"
            size="sm"
            disabled={busy}
            onClick={onAcceptAll}
          >
            Accept All Pending
          </Button>
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRejectAll}
          >
            Reject All Pending
          </Button>
        </div>
      )}
    </aside>
  );
}
