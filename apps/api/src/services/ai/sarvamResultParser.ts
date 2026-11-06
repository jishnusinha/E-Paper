import JSZip from "jszip";
import type { AiDocumentBlock, AiDocumentBlockType } from "@epaper/shared";
import { AppError } from "../../utils/errors.js";
import {
  normalizeProviderBox,
  type PageMetrics,
  type ProviderBox,
} from "./coordinateMapper.js";

const MAX_EXTRACTED_BYTES = 8 * 1024 * 1024;

const HEADING_TAGS = new Set([
  "heading",
  "title",
  "headline",
  "h1",
  "h2",
  "h3",
  "section-header",
  "section_header",
]);

const PARAGRAPH_TAGS = new Set([
  "paragraph",
  "text",
  "body",
  "list",
  "list-item",
  "list_item",
]);

const IMAGE_TAGS = new Set([
  "image",
  "figure",
  "photograph",
  "diagram",
  "chart",
  "seal",
  "header_image",
  "footer_image",
]);

const CAPTION_TAGS = new Set(["caption", "figure_caption", "figcaption"]);
const TABLE_TAGS = new Set(["table"]);

function mapBlockType(label: string | undefined): AiDocumentBlockType {
  const tag = (label || "").toLowerCase().trim();
  if (HEADING_TAGS.has(tag)) return "heading";
  if (CAPTION_TAGS.has(tag)) return "caption";
  if (TABLE_TAGS.has(tag)) return "table";
  if (IMAGE_TAGS.has(tag)) return "image";
  if (PARAGRAPH_TAGS.has(tag)) return "paragraph";
  return "unknown";
}

function pickLabel(raw: Record<string, unknown>): string | undefined {
  const candidates = [
    raw.layout_tag,
    raw.tag,
    raw.type,
    raw.label,
    raw.block_type,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickText(raw: Record<string, unknown>): string {
  if (typeof raw.text === "string") return raw.text.trim();
  if (typeof raw.content === "string") return raw.content.trim();
  if (typeof raw.value === "string") return raw.value.trim();
  return "";
}

function pickBox(raw: Record<string, unknown>): ProviderBox | null {
  const candidates = [
    raw.bounding_box,
    raw.bbox,
    raw.box,
    raw.region,
    raw.coordinates,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    return candidate as ProviderBox;
  }
  return null;
}

function pickPageMetrics(
  pageJson: Record<string, unknown>,
  fallback?: { width: number; height: number }
): PageMetrics {
  const width =
    numberOrUndefined(pageJson.page_width) ??
    numberOrUndefined(pageJson.width) ??
    numberOrUndefined(pageJson.image_width) ??
    fallback?.width;
  const height =
    numberOrUndefined(pageJson.page_height) ??
    numberOrUndefined(pageJson.height) ??
    numberOrUndefined(pageJson.image_height) ??
    fallback?.height;

  if (!width || !height || width <= 0 || height <= 0) {
    throw new AppError(
      "Sarvam page metadata is missing usable page dimensions for coordinate conversion",
      502,
      "AI_INVALID_COORDINATES"
    );
  }

  return {
    width,
    height,
    coordinateSpace:
      typeof pageJson.coordinate_space === "string"
        ? pageJson.coordinate_space
        : undefined,
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function isSafeZipPath(name: string): boolean {
  if (!name || name.includes("\0")) return false;
  const normalized = name.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes("../")) return false;
  if (normalized.split("/").some((part) => part === "..")) return false;
  return true;
}

export async function extractZipEntries(
  zipBuffer: Buffer
): Promise<Map<string, string>> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    throw new AppError("Malformed Sarvam result ZIP", 502, "AI_MALFORMED_ZIP");
  }

  const files = new Map<string, string>();
  let total = 0;

  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry || entry.dir) continue;
    if (!isSafeZipPath(name)) {
      throw new AppError(
        "Sarvam ZIP contains unsafe paths",
        502,
        "AI_UNSAFE_ZIP"
      );
    }
    const content = await entry.async("string");
    total += Buffer.byteLength(content, "utf8");
    if (total > MAX_EXTRACTED_BYTES) {
      throw new AppError(
        "Sarvam ZIP extracted content exceeds size limit",
        502,
        "AI_ZIP_TOO_LARGE"
      );
    }
    files.set(name.replace(/\\/g, "/"), content);
  }

  return files;
}

export function findPageMetadataJson(
  files: Map<string, string>
): { path: string; json: Record<string, unknown> } {
  const pageMetaPaths = [...files.keys()]
    .filter(
      (p) =>
        /metadata\/page_\d+\.json$/i.test(p) || /\/page_\d+\.json$/i.test(p)
    )
    .sort();

  if (pageMetaPaths.length === 0) {
    // Fall back to primary JSON document if metadata is absent.
    const primary = [...files.keys()].find(
      (p) =>
        p.toLowerCase().endsWith(".json") &&
        !p.toLowerCase().endsWith("manifest.json")
    );
    if (!primary) {
      throw new AppError(
        "Sarvam ZIP is missing page metadata JSON",
        502,
        "AI_MISSING_JSON"
      );
    }
    return { path: primary, json: JSON.parse(files.get(primary)!) as Record<string, unknown> };
  }

  const pathName = pageMetaPaths[0];
  try {
    return {
      path: pathName,
      json: JSON.parse(files.get(pathName)!) as Record<string, unknown>,
    };
  } catch {
    throw new AppError(
      "Sarvam page metadata JSON is invalid",
      502,
      "AI_INVALID_JSON"
    );
  }
}

export function normalizeSarvamBlocks(
  pageJson: Record<string, unknown>,
  fallbackPageSize?: { width: number; height: number }
): AiDocumentBlock[] {
  const metrics = pickPageMetrics(pageJson, fallbackPageSize);
  const rawBlocks = Array.isArray(pageJson.blocks)
    ? pageJson.blocks
    : Array.isArray(pageJson.elements)
      ? pageJson.elements
      : null;

  if (!rawBlocks) {
    throw new AppError(
      "Sarvam JSON does not contain a blocks array",
      502,
      "AI_MISSING_BLOCKS"
    );
  }

  const blocks: AiDocumentBlock[] = [];

  rawBlocks.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const raw = item as Record<string, unknown>;
    const label = pickLabel(raw);
    const text = pickText(raw);
    const box = pickBox(raw);
    if (!box) return;

    let coordinates;
    try {
      coordinates = normalizeProviderBox(box, metrics);
    } catch {
      return;
    }

    const readingOrder =
      numberOrUndefined(raw.reading_order) ??
      numberOrUndefined(raw.readingOrder) ??
      index;

    const confidence =
      numberOrUndefined(raw.confidence) ??
      numberOrUndefined(raw.score) ??
      null;

    blocks.push({
      id:
        typeof raw.id === "string" && raw.id
          ? raw.id
          : `block-${index + 1}`,
      type: mapBlockType(label),
      text,
      coordinates,
      readingOrder,
      confidence,
      originalLabel: label,
    });
  });

  if (blocks.length === 0) {
    throw new AppError(
      "No usable layout blocks with valid bounding boxes were found",
      422,
      "AI_NO_VALID_BLOCKS"
    );
  }

  return blocks.sort(
    (a, b) => (a.readingOrder ?? 0) - (b.readingOrder ?? 0)
  );
}

export async function parseSarvamZipToBlocks(
  zipBuffer: Buffer,
  fallbackPageSize?: { width: number; height: number }
): Promise<AiDocumentBlock[]> {
  const files = await extractZipEntries(zipBuffer);
  const { json } = findPageMetadataJson(files);

  // Primary document JSON may wrap pages: { pages: [{ blocks }]}
  if (Array.isArray(json.pages) && json.pages[0]) {
    return normalizeSarvamBlocks(
      json.pages[0] as Record<string, unknown>,
      fallbackPageSize
    );
  }

  return normalizeSarvamBlocks(json, fallbackPageSize);
}
