import { useMemo, useState } from "react";
import type { Segment } from "@/types";
import type { ThemeConfiguration } from "@epaper/shared";
import { containsPoint } from "@epaper/shared";
import { cn } from "@/lib/utils";

interface Props {
  segments: Segment[];
  theme: ThemeConfiguration;
  onSelect: (segment: Segment) => void;
}

export function SegmentOverlay({ segments, theme, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const ordered = useMemo(
    () =>
      [...segments].sort(
        (a, b) =>
          a.coordinates.width * a.coordinates.height -
          b.coordinates.width * b.coordinates.height
      ),
    [segments]
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseLeave={() => setHoveredId(null)}
      onMouseMove={(e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const px = (e.clientX - bounds.left) / bounds.width;
        const py = (e.clientY - bounds.top) / bounds.height;
        // Ignore pointer outside the exact paper frame.
        if (px < 0 || py < 0 || px > 1 || py > 1) {
          setHoveredId(null);
          return;
        }
        const hit = ordered.find((segment) =>
          containsPoint(segment.coordinates, px, py)
        );
        setHoveredId(hit?.id ?? null);
      }}
    >
      {ordered.map((segment) => {
        const hovered = hoveredId === segment.id;
        const { x, y, width, height } = segment.coordinates;
        return (
          <button
            key={segment.id}
            type="button"
            aria-label={segment.title || "Open article"}
            className={cn(
              "absolute box-border transition-opacity",
              hovered ? "cursor-pointer opacity-100" : "opacity-0"
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
              maxWidth: `${(1 - x) * 100}%`,
              maxHeight: `${(1 - y) * 100}%`,
              background: segment.hoverColor || theme.segments.hoverColor,
              border: hovered
                ? `2px solid ${theme.segments.borderColor}`
                : "2px solid transparent",
              borderRadius: theme.segments.borderRadius,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(segment);
            }}
            onFocus={() => setHoveredId(segment.id)}
            onBlur={() => setHoveredId(null)}
          />
        );
      })}
    </div>
  );
}
