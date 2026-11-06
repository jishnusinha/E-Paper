import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "../utils/errors.js";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

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

  console.error("[api:error]", err);
  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Unknown error";
  return sendError(res, message, 500, "INTERNAL_ERROR");
}
