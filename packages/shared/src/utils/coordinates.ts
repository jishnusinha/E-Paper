import type { SegmentCoordinates } from "../types/index.js";

export const COORD_EPSILON = 1e-6;
export const MIN_SEGMENT_SIZE = 0.005;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRect(
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number
): SegmentCoordinates {
  if (pageWidth <= 0 || pageHeight <= 0) {
    throw new Error("Page dimensions must be positive");
  }

  let nx = x;
  let ny = y;
  let nw = width;
  let nh = height;

  if (nw < 0) {
    nx += nw;
    nw = Math.abs(nw);
  }
  if (nh < 0) {
    ny += nh;
    nh = Math.abs(nh);
  }

  return clampCoordinates({
    x: nx / pageWidth,
    y: ny / pageHeight,
    width: nw / pageWidth,
    height: nh / pageHeight,
  });
}

export function denormalizeRect(
  coords: SegmentCoordinates,
  pageWidth: number,
  pageHeight: number
): SegmentCoordinates {
  return {
    x: coords.x * pageWidth,
    y: coords.y * pageHeight,
    width: coords.width * pageWidth,
    height: coords.height * pageHeight,
  };
}

export function clampCoordinates(
  coords: SegmentCoordinates
): SegmentCoordinates {
  let { x, y, width, height } = coords;

  width = Math.max(width, MIN_SEGMENT_SIZE);
  height = Math.max(height, MIN_SEGMENT_SIZE);

  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  width = clamp(width, MIN_SEGMENT_SIZE, 1);
  height = clamp(height, MIN_SEGMENT_SIZE, 1);

  if (x + width > 1 + COORD_EPSILON) {
    width = Math.max(MIN_SEGMENT_SIZE, 1 - x);
  }
  if (y + height > 1 + COORD_EPSILON) {
    height = Math.max(MIN_SEGMENT_SIZE, 1 - y);
  }

  if (x + width > 1) {
    x = Math.max(0, 1 - width);
  }
  if (y + height > 1) {
    y = Math.max(0, 1 - height);
  }

  return { x, y, width, height };
}

export function isValidCoordinates(coords: SegmentCoordinates): boolean {
  const { x, y, width, height } = coords;
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return false;
  if (x < -COORD_EPSILON || y < -COORD_EPSILON) return false;
  if (width < MIN_SEGMENT_SIZE - COORD_EPSILON) return false;
  if (height < MIN_SEGMENT_SIZE - COORD_EPSILON) return false;
  if (x + width > 1 + COORD_EPSILON) return false;
  if (y + height > 1 + COORD_EPSILON) return false;
  return true;
}

export function containsPoint(
  coords: SegmentCoordinates,
  px: number,
  py: number
): boolean {
  return (
    px >= coords.x &&
    py >= coords.y &&
    px <= coords.x + coords.width &&
    py <= coords.y + coords.height
  );
}

export function resizeRect(
  coords: SegmentCoordinates,
  handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w",
  dx: number,
  dy: number
): SegmentCoordinates {
  let { x, y, width, height } = coords;

  switch (handle) {
    case "nw":
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case "ne":
      y += dy;
      width += dx;
      height -= dy;
      break;
    case "sw":
      x += dx;
      width -= dx;
      height += dy;
      break;
    case "se":
      width += dx;
      height += dy;
      break;
    case "n":
      y += dy;
      height -= dy;
      break;
    case "s":
      height += dy;
      break;
    case "e":
      width += dx;
      break;
    case "w":
      x += dx;
      width -= dx;
      break;
  }

  return clampCoordinates({ x, y, width, height });
}

export function toCropPixels(
  coords: SegmentCoordinates,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = Math.round(coords.x * imageWidth);
  const y = Math.round(coords.y * imageHeight);
  const width = Math.max(1, Math.round(coords.width * imageWidth));
  const height = Math.max(1, Math.round(coords.height * imageHeight));

  return {
    x: clamp(x, 0, Math.max(0, imageWidth - 1)),
    y: clamp(y, 0, Math.max(0, imageHeight - 1)),
    width: clamp(width, 1, imageWidth - x),
    height: clamp(height, 1, imageHeight - y),
  };
}
