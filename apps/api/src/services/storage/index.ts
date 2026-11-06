import { isCloudinaryConfigured } from "../../config/env.js";
import * as cloudinary from "../cloudinary/client.js";
import * as local from "./local.js";

export async function uploadPdf(filePath: string, publicId: string) {
  if (isCloudinaryConfigured()) {
    return cloudinary.uploadPdf(filePath, publicId);
  }
  return local.localUploadPdf(filePath, publicId);
}

export async function uploadPageImage(filePath: string, publicId: string) {
  if (isCloudinaryConfigured()) {
    return cloudinary.uploadPageImage(filePath, publicId);
  }
  return local.localUploadPageImage(filePath, publicId);
}

export function buildThumbnailUrl(publicId: string, width = 240): string {
  if (isCloudinaryConfigured() && !publicId.startsWith("local/")) {
    return cloudinary.buildThumbnailUrl(publicId, width);
  }
  return local.localThumbnailUrl(publicId);
}

export function buildOptimizedPageUrl(publicId: string, width = 1600): string {
  if (isCloudinaryConfigured() && !publicId.startsWith("local/")) {
    return cloudinary.buildOptimizedPageUrl(publicId, width);
  }
  return local.localThumbnailUrl(publicId);
}

export async function buildCropUrl(
  publicId: string,
  crop: { x: number; y: number; width: number; height: number },
  options?: { width?: number }
): Promise<string> {
  if (isCloudinaryConfigured() && !publicId.startsWith("local/")) {
    return cloudinary.buildCropUrl(publicId, crop, options);
  }
  return local.localBuildCropUrl(publicId, crop);
}
