import { describe, expect, it } from "vitest";
import { aiDetectSchema, updateAiSuggestionSchema } from "@epaper/shared";

describe("AI request schemas", () => {
  it("defaults language for detect requests", () => {
    expect(aiDetectSchema.parse({})).toEqual({
      language: "en-IN",
      force: false,
    });
  });

  it("rejects invalid language codes", () => {
    expect(() => aiDetectSchema.parse({ language: "english" })).toThrow();
  });

  it("validates suggestion patches", () => {
    expect(
      updateAiSuggestionSchema.parse({
        title: "Fixed title",
        coordinates: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      })
    ).toMatchObject({ title: "Fixed title" });
  });
});
