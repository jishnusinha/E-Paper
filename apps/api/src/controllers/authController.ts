import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@epaper/shared";
import { env } from "../config/env.js";
import { AdminUser } from "../models/AdminUser.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

function setAuthCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function issueAuthResponse(
  res: Response,
  admin: { _id: unknown; name: string; email: string; role: string }
) {
  const token = signToken({
    sub: String(admin._id),
    email: admin.email,
    role: admin.role,
  });
  setAuthCookie(res, token);

  return sendSuccess(res, {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const normalizedEmail = email.toLowerCase();

  const existing = await AdminUser.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "EMAIL_EXISTS"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await AdminUser.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: "admin",
  });

  return issueAuthResponse(res, admin);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const admin = await AdminUser.findOne({ email: email.toLowerCase() });
  if (!admin) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  return issueAuthResponse(res, admin);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  return sendSuccess(res, { ok: true });
});

export const me = [
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, req.admin);
  }),
];
