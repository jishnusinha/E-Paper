import {
  clampCoordinates,
  type SegmentCoordinates,
} from "@epaper/shared";
import { AppError } from "../../utils/errors.js";

export type ProviderBox =
  | SegmentCoordinates
  | [number, number, number, number]
  | {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      coordinate_space?: string;
    };

export interface PageMetrics {
  width: number;
  height: number;
  coordinateSpace?: string;
}

function isNormalized(coords: SegmentCoordinates): boolean {
  return (
    coords.x >= 0 &&
    coords.y >= 0 &&
    coords.width > 0 &&
    coords.height > 0 &&
    coords.x <= 1 &&
    coords.y <= 1 &&
    coords.width <= 1 &&
    coords.height <= 1 &&
    coords.x + coords.width <= 1.000001 &&
    coords.y + coords.height <= 1.000001
  );
}

function looksLikePixels(coords: SegmentCoordinates, page: PageMetrics): boolean {
  return (
    coords.x > 1.000001 ||
    coords.y > 1.000001 ||
    coords.width > 1.000001 ||
    coords.height > 1.000001 ||
    coords.x + coords.width > page.width * 0.02 ||
    coords.y + coords.height > page.height * 0.02
  );
}

export function parseProviderBox(box: ProviderBox): SegmentCoordinates {
  if (Array.isArray(box)) {
    if (box.length < 4) {
      throw new AppError("Invalid bounding box array", 502, "AI_INVALID_COORDINATES");
    }
    const [a, b, c, d] = box;
    // Treat as [x1,y1,x2,y2] when c>a and d>b; otherwise [x,y,w,h]
    if (c >= a && d >= b && (c - a > 0 || d - b > 0) && (c > 1 || d > 1 || a > 1 || b > 1)) {
      return { x: a, y: b, width: c - a, height: d - b };
    }
    if (c > a && d > b && c <= 1 && d <= 1 && a >= 0 && b >= 0) {
      // Could be either; prefer xyxy when c/d look like corners (larger than width/height style)
      // Heuristic: if width-like values (c,d) are small relative to corners, use xywh.
      return { x: a, y: b, width: c - a, height: d - b };
    }
    return { x: a, y: b, width: c, height: d };
  }

  const x =
    numberField(box, "x") ??
    numberField(box, "left") ??
    numberField(box, "x1");
  const y =
    numberField(box, "y") ??
    numberField(box, "top") ??
    numberField(box, "y1");

  let width = numberField(box, "width");
  let height = numberField(box, "height");

  if (width == null || height == null) {
    const right = numberField(box, "right") ?? numberField(box, "x2");
    const bottom = numberField(box, "bottom") ?? numberField(box, "y2");
    if (x == null || y == null || right == null || bottom == null) {
      throw new AppError(
        "Bounding box is missing required fields",
        502,
        "AI_INVALID_COORDINATES"
      );
    }
    width = right - x;
    height = bottom - y;
  }

  if (x == null || y == null || width == null || height == null) {
    throw new AppError(
      "Bounding box is missing required fields",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  return { x, y, width, height };
}

function numberField(
  box: Exclude<ProviderBox, SegmentCoordinates | [number, number, number, number]>,
  key: string
): number | undefined {
  const value = (box as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Convert provider boxes into normalized page coordinates (0–1).
 * Fails instead of guessing when units cannot be determined.
 */
export function normalizeProviderBox(
  box: ProviderBox,
  page: PageMetrics
): SegmentCoordinates {
  if (page.width <= 0 || page.height <= 0) {
    throw new AppError(
      "Invalid page metrics for coordinate conversion",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  const raw = parseProviderBox(box);
  const space = (page.coordinateSpace || "").toLowerCase();

  let normalized: SegmentCoordinates;

  if (space.includes("norm") || space === "relative" || space === "0-1") {
    normalized = raw;
  } else if (
    space.includes("pixel") ||
    space.includes("px") ||
    looksLikePixels(raw, page)
  ) {
    normalized = {
      x: raw.x / page.width,
      y: raw.y / page.height,
      width: raw.width / page.width,
      height: raw.height / page.height,
    };
  } else if (isNormalized(raw)) {
    normalized = raw;
  } else if (
    raw.x <= page.width &&
    raw.y <= page.height &&
    raw.width <= page.width &&
    raw.height <= page.height
  ) {
    // Values fit inside page dimensions — treat as pixels.
    normalized = {
      x: raw.x / page.width,
      y: raw.y / page.height,
      width: raw.width / page.width,
      height: raw.height / page.height,
    };
  } else {
    throw new AppError(
      "Unable to determine bounding-box coordinate units",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  if (
    !Number.isFinite(normalized.x) ||
    !Number.isFinite(normalized.y) ||
    !Number.isFinite(normalized.width) ||
    !Number.isFinite(normalized.height) ||
    normalized.width <= 0 ||
    normalized.height <= 0
  ) {
    throw new AppError(
      "Bounding box produced invalid coordinates",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  // Reject conversions that clearly escaped the page before soft-clamping.
  if (
    normalized.x < -0.05 ||
    normalized.y < -0.05 ||
    normalized.x > 1.05 ||
    normalized.y > 1.05 ||
    normalized.width > 1.2 ||
    normalized.height > 1.2
  ) {
    throw new AppError(
      "Bounding box falls outside page bounds after conversion",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  return clampCoordinates(normalized);
}

export function unionBoxes(
  boxes: SegmentCoordinates[]
): SegmentCoordinates | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return clampCoordinates({
    x: minX,
    y: minY,
    width: Math.max(0.005, maxX - minX),
    height: Math.max(0.005, maxY - minY),
  });
}

export function horizontalOverlapRatio(
  a: SegmentCoordinates,
  b: SegmentCoordinates
): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, right - left);
  const denom = Math.min(a.width, b.width) || 1;
  return overlap / denom;
}

export function verticalGap(
  a: SegmentCoordinates,
  b: SegmentCoordinates
): number {
  const aBottom = a.y + a.height;
  const bBottom = b.y + b.height;
  if (b.y >= aBottom) return b.y - aBottom;
  if (a.y >= bBottom) return a.y - bBottom;
  return 0;
}

export function buildCacheKey(parts: {
  sourceImageHash: string;
  language: string;
  provider: string;
  processingVersion: string;
}): string {
  return [
    parts.provider,
    parts.processingVersion,
    parts.language,
    parts.sourceImageHash,
  ].join(":");
}
