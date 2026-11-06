import { describe, expect, it } from "vitest";
import type { AiDocumentBlock } from "@epaper/shared";
import { groupBlocksIntoArticles } from "./articleGrouping.js";

function block(
  partial: Partial<AiDocumentBlock> & Pick<AiDocumentBlock, "id" | "type">
): AiDocumentBlock {
  return {
    text: partial.text ?? "",
    coordinates: partial.coordinates ?? {
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.05,
    },
    confidence: partial.confidence ?? null,
    readingOrder: partial.readingOrder,
    ...partial,
  };
}

describe("articleGrouping", () => {
  it("groups paragraphs under a heading in the same column", () => {
    const blocks: AiDocumentBlock[] = [
      block({
        id: "h1",
        type: "heading",
        text: "City News",
        coordinates: { x: 0.1, y: 0.1, width: 0.35, height: 0.04 },
        readingOrder: 1,
      }),
      block({
        id: "p1",
        type: "paragraph",
        text: "Paragraph one",
        coordinates: { x: 0.1, y: 0.16, width: 0.35, height: 0.1 },
        readingOrder: 2,
      }),
      block({
        id: "p2",
        type: "paragraph",
        text: "Paragraph two",
        coordinates: { x: 0.1, y: 0.28, width: 0.35, height: 0.1 },
        readingOrder: 3,
      }),
      block({
        id: "h2",
        type: "heading",
        text: "Sports",
        coordinates: { x: 0.55, y: 0.1, width: 0.35, height: 0.04 },
        readingOrder: 4,
      }),
      block({
        id: "p3",
        type: "paragraph",
        text: "Sports body",
        coordinates: { x: 0.55, y: 0.16, width: 0.35, height: 0.12 },
        readingOrder: 5,
      }),
    ];

    const suggestions = groupBlocksIntoArticles(blocks);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions[0].title).toContain("City News");
    expect(suggestions[0].sourceBlockIds).toEqual(
      expect.arrayContaining(["h1", "p1", "p2"])
    );
    expect(suggestions.some((s) => s.title.includes("Sports"))).toBe(true);
    expect(suggestions.every((s) => s.reviewRequired)).toBe(true);
  });

  it("falls back to block-level suggestions without headings", () => {
    const blocks: AiDocumentBlock[] = [
      block({
        id: "p1",
        type: "paragraph",
        text: "Lone paragraph",
        coordinates: { x: 0.1, y: 0.1, width: 0.4, height: 0.2 },
      }),
      block({
        id: "p2",
        type: "paragraph",
        text: "Another",
        coordinates: { x: 0.55, y: 0.1, width: 0.35, height: 0.2 },
      }),
    ];
    const suggestions = groupBlocksIntoArticles(blocks);
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((s) => s.reviewRequired)).toBe(true);
  });

  it("does not invent confidence scores", () => {
    const suggestions = groupBlocksIntoArticles([
      block({
        id: "h1",
        type: "heading",
        text: "Headline",
        confidence: null,
      }),
    ]);
    expect(suggestions[0].confidence).toBeNull();
  });
});
