import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { env } from "../../config/env.js";
import { LOCAL_STORAGE_ROOT } from "./paths.js";

export { LOCAL_STORAGE_ROOT };

function publicBaseUrl() {
  return `http://localhost:${env.PORT}/media`;
}

export async function ensureLocalStorage() {
  await fs.mkdir(path.join(LOCAL_STORAGE_ROOT, "pdfs"), { recursive: true });
  await fs.mkdir(path.join(LOCAL_STORAGE_ROOT, "pages"), { recursive: true });
  await fs.mkdir(path.join(LOCAL_STORAGE_ROOT, "crops"), { recursive: true });
}

export async function localUploadPdf(
  filePath: string,
  publicId: string
): Promise<{ publicId: string; url: string }> {
  await ensureLocalStorage();
  const safeId = publicId.replace(/[^\w/-]+/g, "_");
  const dest = path.join(LOCAL_STORAGE_ROOT, "pdfs", `${safeId}.pdf`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(filePath, dest);
  return {
    publicId: `local/pdfs/${safeId}`,
    url: `${publicBaseUrl()}/pdfs/${safeId}.pdf`,
  };
}

export async function localUploadPageImage(
  filePath: string,
  publicId: string
): Promise<{ publicId: string; url: string; width: number; height: number }> {
  await ensureLocalStorage();
  const safeId = publicId.replace(/[^\w/-]+/g, "_");
  const dest = path.join(LOCAL_STORAGE_ROOT, "pages", `${safeId}.png`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(filePath, dest);

  const image = await loadImage(dest);
  return {
    publicId: `local/pages/${safeId}`,
    url: `${publicBaseUrl()}/pages/${safeId}.png`,
    width: image.width,
    height: image.height,
  };
}

export function localThumbnailUrl(publicId: string): string {
  const file = publicId.replace(/^local\/pages\//, "");
  return `${publicBaseUrl()}/pages/${file}.png`;
}

export async function localBuildCropUrl(
  publicId: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  await ensureLocalStorage();
  const file = publicId.replace(/^local\/pages\//, "");
  const sourcePath = path.join(LOCAL_STORAGE_ROOT, "pages", `${file}.png`);
  const safeCropName = `${file.replace(/[\\/]/g, "_")}_${crop.x}_${crop.y}_${crop.width}_${crop.height}.png`;
  const dest = path.join(LOCAL_STORAGE_ROOT, "crops", safeCropName);

  try {
    await fs.access(dest);
  } catch {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const image = await loadImage(sourcePath);
    const canvas = createCanvas(crop.width, crop.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    await fs.writeFile(dest, await canvas.encode("png"));
  }

  return `${publicBaseUrl()}/crops/${safeCropName}`;
}
