import { describe, expect, it } from "vitest";
import { clampCoordinates, normalizeRect } from "@epaper/shared";

describe("AI suggestion coordinate alignment", () => {
  it("keeps suggestion rectangles in the same normalized space as segments", () => {
    const pageW = 900;
    const pageH = 1200;
    const normalized = clampCoordinates(
      normalizeRect(90, 120, 270, 300, pageW, pageH)
    );
    expect(normalized).toEqual({
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.25,
    });

    // Round-trip used by Konva drag/resize handlers.
    const px = {
      x: normalized.x * pageW,
      y: normalized.y * pageH,
      width: normalized.width * pageW,
      height: normalized.height * pageH,
    };
    expect(px.x).toBeCloseTo(90);
    expect(px.height).toBeCloseTo(300);
  });
});
