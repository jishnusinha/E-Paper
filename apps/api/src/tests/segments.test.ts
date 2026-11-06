import { describe, expect, it } from "vitest";
import {
  createSegmentSchema,
  isValidCoordinates,
  clampCoordinates,
  toCropPixels,
} from "@epaper/shared";

describe("segment validation", () => {
  it("accepts valid coordinates", () => {
    const parsed = createSegmentSchema.parse({
      title: "Article 1",
      coordinates: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    });
    expect(parsed.coordinates.width).toBe(0.2);
  });

  it("rejects coordinates that overflow the page", () => {
    expect(() =>
      createSegmentSchema.parse({
        coordinates: { x: 0.9, y: 0.1, width: 0.3, height: 0.2 },
      })
    ).toThrow();
  });

  it("clamps and validates crop math", () => {
    const clamped = clampCoordinates({
      x: 0.95,
      y: 0.95,
      width: 0.2,
      height: 0.2,
    });
    expect(isValidCoordinates(clamped)).toBe(true);
    expect(
      toCropPixels({ x: 0.15, y: 0.2, width: 0.35, height: 0.28 }, 3000, 4200)
    ).toEqual({ x: 450, y: 840, width: 1050, height: 1176 });
  });
});
