import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { isAppError } from "../utils/errors.js";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

function isMongoDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", err.flatten());
  }

  if (isAppError(err)) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(
        res,
        `PDF exceeds the ${env.MAX_PDF_UPLOAD_MB}MB upload limit`,
        413,
        "FILE_TOO_LARGE"
      );
    }
    return sendError(res, err.message, 400, "UPLOAD_ERROR");
  }

  if (isMongoDuplicateKey(err)) {
    return sendError(
      res,
      "An edition already exists for this date",
      409,
      "DATE_EXISTS"
    );
  }

  console.error("[api:error]", err);
  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Unknown error";
  return sendError(res, message, 500, "INTERNAL_ERROR");
}
