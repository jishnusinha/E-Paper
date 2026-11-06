import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { sendSuccess } from "./utils/response.js";
import { LOCAL_STORAGE_ROOT } from "./services/storage/paths.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  const allowedOrigins = new Set(
    [
      env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ].filter(Boolean)
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser tools (curl/postman) and same-origin/proxy requests
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        if (
          env.NODE_ENV !== "production" &&
          /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          callback(null, true);
          return;
        }
        // Allow Railway preview/custom service domains during Hobby deploys
        if (/^https:\/\/[\w.-]+\.up\.railway\.app$/.test(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/media", express.static(LOCAL_STORAGE_ROOT));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/api/health", (_req, res) => {
    sendSuccess(res, { status: "ok", service: "epaper-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/public", publicRoutes);

  app.use(errorHandler);
  return app;
}
