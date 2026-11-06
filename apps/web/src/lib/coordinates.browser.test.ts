import { describe, expect, it } from "vitest";
import {
  clampCoordinates,
  denormalizeRect,
  normalizeRect,
  toCropPixels,
} from "@epaper/shared";

describe("browser coordinate helpers", () => {
  it("round-trips through normalize/denormalize", () => {
    const normalized = normalizeRect(100, 200, 300, 400, 1000, 2000);
    const pixels = denormalizeRect(normalized, 1000, 2000);
    expect(pixels.x).toBeCloseTo(100);
    expect(pixels.y).toBeCloseTo(200);
    expect(pixels.width).toBeCloseTo(300);
    expect(pixels.height).toBeCloseTo(400);
  });

  it("clamps overflow", () => {
    const clamped = clampCoordinates({
      x: 0.95,
      y: 0.95,
      width: 0.2,
      height: 0.2,
    });
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1.000001);
  });

  it("builds crop pixels", () => {
    expect(
      toCropPixels({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, 1000, 1000)
    ).toEqual({ x: 100, y: 200, width: 300, height: 400 });
  });
});
