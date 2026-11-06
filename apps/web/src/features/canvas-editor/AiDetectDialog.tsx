import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCache: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

export function AiDetectDialog({
  open,
  onOpenChange,
  hasCache,
  onConfirm,
  loading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Analyze Newspaper Page?</DialogTitle>
          <DialogDescription>
            This action will send the selected page to Sarvam AI for document
            analysis. Application usage limits and caching still apply.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Available cached result:{" "}
          <span className="font-medium text-foreground">
            {hasCache ? "Yes (will reuse)" : "No"}
          </span>
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Starting…" : "Analyze Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
