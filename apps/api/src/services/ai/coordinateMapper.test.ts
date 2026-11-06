import { describe, expect, it } from "vitest";
import {
  buildCacheKey,
  horizontalOverlapRatio,
  normalizeProviderBox,
  parseProviderBox,
  unionBoxes,
} from "./coordinateMapper.js";

describe("coordinateMapper", () => {
  it("parses xywh objects", () => {
    expect(parseProviderBox({ x: 10, y: 20, width: 30, height: 40 })).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it("parses left/top/right/bottom objects", () => {
    expect(
      parseProviderBox({ left: 10, top: 20, right: 40, bottom: 60 })
    ).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it("normalizes pixel boxes using page metrics", () => {
    const coords = normalizeProviderBox(
      { x: 100, y: 200, width: 200, height: 400 },
      { width: 1000, height: 2000, coordinateSpace: "pixels" }
    );
    expect(coords.x).toBeCloseTo(0.1);
    expect(coords.y).toBeCloseTo(0.1);
    expect(coords.width).toBeCloseTo(0.2);
    expect(coords.height).toBeCloseTo(0.2);
  });

  it("keeps already-normalized boxes", () => {
    const coords = normalizeProviderBox(
      { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      { width: 1000, height: 2000, coordinateSpace: "normalized" }
    );
    expect(coords).toMatchObject({
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    });
  });

  it("rejects boxes that fall outside the page after conversion", () => {
    expect(() =>
      normalizeProviderBox(
        { x: 5000, y: 5000, width: 10, height: 10 },
        { width: 100, height: 100 }
      )
    ).toThrow(/outside page bounds/i);
  });

  it("unions boxes and computes overlap", () => {
    const union = unionBoxes([
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      { x: 0.2, y: 0.25, width: 0.2, height: 0.2 },
    ]);
    expect(union?.x).toBeCloseTo(0.1);
    expect(union?.width).toBeCloseTo(0.3);
    expect(
      horizontalOverlapRatio(
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        { x: 0.2, y: 0.1, width: 0.2, height: 0.2 }
      )
    ).toBeCloseTo(0.5);
  });

  it("builds stable cache keys", () => {
    expect(
      buildCacheKey({
        provider: "sarvam",
        processingVersion: "v1",
        language: "en-IN",
        sourceImageHash: "abc",
      })
    ).toBe("sarvam:v1:en-IN:abc");
  });
});
