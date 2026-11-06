import { describe, expect, it } from "vitest";
import {
  clampCoordinates,
  containsPoint,
  denormalizeRect,
  isValidCoordinates,
  normalizeRect,
  resizeRect,
  toCropPixels,
} from "./coordinates.js";

describe("normalizeRect", () => {
  it("normalizes positive rectangles", () => {
    expect(normalizeRect(150, 200, 350, 280, 1000, 1000)).toEqual({
      x: 0.15,
      y: 0.2,
      width: 0.35,
      height: 0.28,
    });
  });

  it("normalizes negative drag directions", () => {
    const result = normalizeRect(500, 500, -200, -100, 1000, 1000);
    expect(result.x).toBeCloseTo(0.3);
    expect(result.y).toBeCloseTo(0.4);
    expect(result.width).toBeCloseTo(0.2);
    expect(result.height).toBeCloseTo(0.1);
  });
});

describe("denormalizeRect", () => {
  it("converts normalized coords to page pixels", () => {
    expect(
      denormalizeRect(
        { x: 0.15, y: 0.2, width: 0.35, height: 0.28 },
        1000,
        2000
      )
    ).toEqual({ x: 150, y: 400, width: 350, height: 560 });
  });
});

describe("clampCoordinates", () => {
  it("keeps rectangles inside page bounds", () => {
    const clamped = clampCoordinates({
      x: 0.9,
      y: 0.9,
      width: 0.2,
      height: 0.2,
    });
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1.000001);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(1.000001);
  });
});

describe("isValidCoordinates", () => {
  it("accepts valid segments", () => {
    expect(
      isValidCoordinates({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 })
    ).toBe(true);
  });

  it("rejects out-of-bounds segments", () => {
    expect(
      isValidCoordinates({ x: 0.9, y: 0.1, width: 0.2, height: 0.2 })
    ).toBe(false);
  });
});

describe("containsPoint", () => {
  it("detects points inside rectangles", () => {
    const rect = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
    expect(containsPoint(rect, 0.15, 0.15)).toBe(true);
    expect(containsPoint(rect, 0.5, 0.5)).toBe(false);
  });
});

describe("resizeRect", () => {
  it("resizes from southeast handle", () => {
    const result = resizeRect(
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      "se",
      0.05,
      0.05
    );
    expect(result.width).toBeCloseTo(0.25);
    expect(result.height).toBeCloseTo(0.25);
  });
});

describe("toCropPixels", () => {
  it("computes crop pixels from normalized coords", () => {
    expect(
      toCropPixels(
        { x: 0.15, y: 0.2, width: 0.35, height: 0.28 },
        3000,
        4200
      )
    ).toEqual({ x: 450, y: 840, width: 1050, height: 1176 });
  });
});
