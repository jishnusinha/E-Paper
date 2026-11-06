import type { AiDocumentBlock, SuggestedArticle } from "@epaper/shared";
import {
  horizontalOverlapRatio,
  unionBoxes,
  verticalGap,
} from "./coordinateMapper.js";

const SKIP_AS_SEED = new Set(["image"]);

/**
 * Conservative newspaper article grouping.
 *
 * Layout parsers return blocks (headline, paragraph, image…), not complete
 * articles. This heuristic:
 *  - Seeds groups from headings when available
 *  - Attaches spatially related paragraphs/captions/images beneath them
 *  - Falls back to review-required block-level candidates when ambiguous
 *
 * Prefer separate review-required suggestions over incorrect merges.
 */
export function groupBlocksIntoArticles(
  blocks: AiDocumentBlock[]
): SuggestedArticle[] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort(
    (a, b) =>
      (a.readingOrder ?? 0) - (b.readingOrder ?? 0) ||
      a.coordinates.y - b.coordinates.y ||
      a.coordinates.x - b.coordinates.x
  );

  const headings = sorted.filter((b) => b.type === "heading");
  if (headings.length === 0) {
    return blockLevelSuggestions(sorted);
  }

  const columnCenters = estimateColumnCenters(sorted);
  const used = new Set<string>();
  const suggestions: SuggestedArticle[] = [];

  for (const heading of headings) {
    if (used.has(heading.id)) continue;
    const column = nearestColumn(heading.coordinates.x + heading.coordinates.width / 2, columnCenters);
    const members: AiDocumentBlock[] = [heading];
    used.add(heading.id);

    const nextHeading = headings.find(
      (h) =>
        !used.has(h.id) &&
        h.coordinates.y > heading.coordinates.y &&
        sameColumn(h, heading, columnCenters) &&
        horizontalOverlapRatio(h.coordinates, heading.coordinates) > 0.35
    );

    const yLimit = nextHeading
      ? nextHeading.coordinates.y - 0.005
      : heading.coordinates.y + Math.max(0.35, heading.coordinates.height * 8);

    for (const block of sorted) {
      if (used.has(block.id)) continue;
      if (block.type === "heading") continue;
      if (SKIP_AS_SEED.has(block.type) && !block.text) {
        // images without text still attach if under heading
      }

      if (block.coordinates.y < heading.coordinates.y - 0.01) continue;
      if (block.coordinates.y > yLimit) continue;

      const overlap = horizontalOverlapRatio(block.coordinates, heading.coordinates);
      const blockCol = nearestColumn(
        block.coordinates.x + block.coordinates.width / 2,
        columnCenters
      );
      if (blockCol !== column && overlap < 0.45) continue;
      if (overlap < 0.25 && Math.abs(blockCol - column) > 0) continue;

      const gap = verticalGap(heading.coordinates, block.coordinates);
      const last = members[members.length - 1];
      const gapFromLast = verticalGap(last.coordinates, block.coordinates);
      if (gapFromLast > 0.08 && gap > 0.12) continue;

      members.push(block);
      used.add(block.id);
    }

    suggestions.push(toSuggestion(members, true));
  }

  // Leftover substantial blocks become review-required standalone suggestions.
  for (const block of sorted) {
    if (used.has(block.id)) continue;
    if (block.type === "image" && !block.text) continue;
    if (
      block.coordinates.width * block.coordinates.height < 0.004 &&
      block.text.length < 40
    ) {
      continue;
    }
    suggestions.push(toSuggestion([block], true));
  }

  return suggestions
    .filter((s) => s.coordinates.width >= 0.005 && s.coordinates.height >= 0.005)
    .sort(
      (a, b) =>
        a.coordinates.y - b.coordinates.y || a.coordinates.x - b.coordinates.x
    );
}

function blockLevelSuggestions(blocks: AiDocumentBlock[]): SuggestedArticle[] {
  return blocks
    .filter((b) => b.type !== "image" || Boolean(b.text))
    .filter((b) => b.coordinates.width * b.coordinates.height >= 0.003)
    .map((b) => toSuggestion([b], true));
}

function estimateColumnCenters(blocks: AiDocumentBlock[]): number[] {
  const centers = blocks.map((b) => b.coordinates.x + b.coordinates.width / 2);
  centers.sort((a, b) => a - b);
  if (centers.length === 0) return [0.5];

  const clusters: number[][] = [[centers[0]]];
  for (let i = 1; i < centers.length; i += 1) {
    const prev = clusters[clusters.length - 1];
    const mean = prev.reduce((s, v) => s + v, 0) / prev.length;
    if (Math.abs(centers[i] - mean) < 0.12) prev.push(centers[i]);
    else clusters.push([centers[i]]);
  }

  return clusters
    .map((c) => c.reduce((s, v) => s + v, 0) / c.length)
    .sort((a, b) => a - b);
}

function nearestColumn(x: number, columns: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  columns.forEach((c, i) => {
    const d = Math.abs(c - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function sameColumn(
  a: AiDocumentBlock,
  b: AiDocumentBlock,
  columns: number[]
): boolean {
  const ca = nearestColumn(a.coordinates.x + a.coordinates.width / 2, columns);
  const cb = nearestColumn(b.coordinates.x + b.coordinates.width / 2, columns);
  return ca === cb;
}

function toSuggestion(
  members: AiDocumentBlock[],
  reviewRequired: boolean
): SuggestedArticle {
  const boxes = members.map((m) => m.coordinates);
  const coordinates = unionBoxes(boxes)!;
  const heading = members.find((m) => m.type === "heading");
  const title =
    (heading?.text || members.find((m) => m.text)?.text || "Untitled article")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);

  const extractedText = members
    .map((m) => m.text)
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 20_000);

  // Only use model-provided confidence when every member has one.
  const confidences = members
    .map((m) => m.confidence)
    .filter((c): c is number => typeof c === "number");
  const confidence =
    confidences.length === members.length && members.length > 0
      ? confidences.reduce((s, v) => s + v, 0) / confidences.length
      : null;

  return {
    title,
    coordinates,
    sourceBlockIds: members.map((m) => m.id),
    confidence,
    reviewRequired: reviewRequired || confidence == null,
    extractedText,
  };
}
