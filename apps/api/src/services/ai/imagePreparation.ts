import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { AppError } from "../../utils/errors.js";
import { LOCAL_STORAGE_ROOT } from "../storage/paths.js";

const MAX_EDGE = 2200;
const MAX_BYTES = 8 * 1024 * 1024;

export interface PreparedPageImage {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  filename: string;
  width: number;
  height: number;
  contentHash: string;
}

function localPagePath(imagePublicId: string): string | null {
  if (!imagePublicId.startsWith("local/pages/")) return null;
  const file = imagePublicId.replace(/^local\/pages\//, "");
  return path.join(LOCAL_STORAGE_ROOT, "pages", `${file}.png`);
}

async function readLocalOrRemote(
  imagePublicId: string,
  imageUrl: string
): Promise<Buffer> {
  const localPath = localPagePath(imagePublicId);
  if (localPath) {
    try {
      return await fs.readFile(localPath);
    } catch {
      throw new AppError(
        "Page image file is missing from local storage",
        404,
        "PAGE_IMAGE_MISSING"
      );
    }
  }

  // Cloudinary / remote — fetch the existing page URL (never from client-supplied arbitrary URLs).
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new AppError(
      `Unable to fetch page image (${response.status})`,
      502,
      "PAGE_IMAGE_FETCH_FAILED"
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new AppError("Page image download was empty", 502, "PAGE_IMAGE_EMPTY");
  }
  return buffer;
}

/**
 * Prepare a newspaper page image for Sarvam Parse.
 * Preserves aspect ratio; may downscale large pages for upload size.
 * Coordinate conversion uses returned width/height (post-prep metrics).
 */
export async function preparePageImage(params: {
  pageId: string;
  imagePublicId: string;
  imageUrl: string;
}): Promise<PreparedPageImage> {
  const source = await readLocalOrRemote(params.imagePublicId, params.imageUrl);
  const contentHash = createHash("sha256").update(source).digest("hex");

  const image = await loadImage(source);
  let width = image.width;
  let height = image.height;

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = createCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, targetW, targetH);

  let buffer = Buffer.from(await canvas.encode("png"));
  let mimeType: "image/png" | "image/jpeg" = "image/png";

  if (buffer.byteLength > MAX_BYTES) {
    // Re-encode as JPEG for size.
    buffer = Buffer.from(await canvas.encode("jpeg", 85));
    mimeType = "image/jpeg";
  }

  if (buffer.byteLength > MAX_BYTES) {
    throw new AppError(
      "Prepared page image exceeds upload size limit",
      413,
      "AI_IMAGE_TOO_LARGE"
    );
  }

  const ext = mimeType === "image/png" ? "png" : "jpg";
  return {
    buffer,
    mimeType,
    filename: `page-${params.pageId}.${ext}`,
    width: targetW,
    height: targetH,
    contentHash,
  };
}

export function hashImageBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
