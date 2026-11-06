import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AdminUser } from "../models/AdminUser.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
}

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    if (!token) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    let payload: AuthPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError("Invalid or expired session", 401, "UNAUTHORIZED");
    }

    const admin = await AdminUser.findById(payload.sub).lean();
    if (!admin) {
      throw new AppError("Admin not found", 401, "UNAUTHORIZED");
    }

    req.admin = {
      id: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    next();
  }
);
