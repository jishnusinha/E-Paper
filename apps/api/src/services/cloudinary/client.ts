import { v2 as cloudinary } from "cloudinary";
import { env, isCloudinaryConfigured } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

let configured = false;

export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      503,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

function uploadFailureMessage(error: unknown, fallback: string) {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "object" &&
          error &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (/file size too large|maximum is \d/i.test(raw)) {
    return `${fallback}: file exceeds Cloudinary plan size limit (free plan allows 10MB). Reduce PDF_RENDER_TARGET_WIDTH or upgrade Cloudinary.`;
  }
  if (raw) return `${fallback}: ${raw}`;
  return fallback;
}

export async function uploadPdf(
  filePath: string,
  publicId: string
): Promise<{ publicId: string; url: string }> {
  try {
    const result = await getCloudinary().uploader.upload(filePath, {
      resource_type: "raw",
      folder: "epaper/pdfs",
      public_id: publicId,
      overwrite: true,
    });
    return { publicId: result.public_id, url: result.secure_url };
  } catch (error) {
    throw new AppError(
      uploadFailureMessage(error, "Failed to upload PDF to Cloudinary"),
      502,
      "CLOUDINARY_UPLOAD_FAILED"
    );
  }
}

export async function uploadPageImage(
  filePath: string,
  publicId: string
): Promise<{ publicId: string; url: string; width: number; height: number }> {
  try {
    const result = await getCloudinary().uploader.upload(filePath, {
      resource_type: "image",
      folder: "epaper/pages",
      public_id: publicId,
      overwrite: true,
      format: "webp",
    });
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width ?? 0,
      height: result.height ?? 0,
    };
  } catch (error) {
    throw new AppError(
      uploadFailureMessage(error, "Failed to upload page image to Cloudinary"),
      502,
      "CLOUDINARY_UPLOAD_FAILED"
    );
  }
}

export function buildThumbnailUrl(publicId: string, width = 240): string {
  return getCloudinary().url(publicId, {
    secure: true,
    transformation: [
      { width, crop: "scale", quality: "auto", fetch_format: "auto" },
    ],
  });
}

export function buildOptimizedPageUrl(publicId: string, width = 1600): string {
  return getCloudinary().url(publicId, {
    secure: true,
    transformation: [
      { width, crop: "scale", quality: "auto:good", fetch_format: "auto" },
    ],
  });
}

export function buildCropUrl(
  publicId: string,
  crop: { x: number; y: number; width: number; height: number },
  options?: { width?: number }
): string {
  const transforms: Record<string, unknown>[] = [
    {
      x: Math.round(crop.x),
      y: Math.round(crop.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height),
      crop: "crop",
      gravity: "north_west",
    },
  ];

  if (options?.width) {
    transforms.push({
      width: options.width,
      crop: "scale",
      quality: "auto:good",
      fetch_format: "auto",
    });
  } else {
    transforms.push({ quality: "auto:good", fetch_format: "auto" });
  }

  return getCloudinary().url(publicId, {
    secure: true,
    transformation: transforms,
  });
}
