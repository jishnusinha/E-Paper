import { config as loadEnv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../.env") });
loadEnv();

function normalizeClientUrl(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed || trimmed === "https://" || trimmed === "http://") {
    return undefined;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.preprocess(
    normalizeClientUrl,
    z.string().url().default("http://localhost:5173")
  ),
  // Public origin of this API (used for /media URLs). Falls back to Railway domain.
  PUBLIC_API_URL: z.preprocess(normalizeClientUrl, z.string().url().optional()),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional().default(""),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("epaper_token"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  ADMIN_NAME: z.string().default("Administrator"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  MAX_PDF_UPLOAD_MB: z.coerce.number().default(100),
  PDF_RENDER_TARGET_WIDTH: z.coerce.number().default(3000),
  PDF_PROCESSING_CONCURRENCY: z.coerce.number().default(2),
  SARVAM_API_KEY: z.string().optional().default(""),
  SARVAM_AI_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  SARVAM_MAX_PAGES_PER_DAY: z.coerce.number().default(3),
  SARVAM_MAX_REQUESTS_PER_DAY: z.coerce.number().default(5),
  SARVAM_MONTHLY_BUDGET_INR: z.coerce.number().default(50),
  SARVAM_POLL_INTERVAL_SECONDS: z.coerce.number().default(5),
  /** Estimated INR charged per page parse (application-level estimate only). */
  SARVAM_ESTIMATED_COST_PER_PAGE_INR: z.coerce.number().default(0.5),
  SARVAM_BASE_URL: z.string().url().default("https://api.sarvam.ai"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

export const env = (parsed.success
  ? parsed.data
  : envSchema.parse({
      MONGODB_URI: "mongodb://127.0.0.1:27017/epaper_studio_test",
      JWT_SECRET: "test_secret_key_123456",
      ADMIN_PASSWORD: "TestPassword123!",
    })) as z.infer<typeof envSchema>;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
  );
}

export function isSarvamConfigured(): boolean {
  return Boolean(env.SARVAM_API_KEY && env.SARVAM_API_KEY.trim().length > 0);
}

export function isSarvamAiEnabled(): boolean {
  return Boolean(env.SARVAM_AI_ENABLED && isSarvamConfigured());
}

/** Public origin for this API process (no trailing slash). */
export function getPublicApiOrigin(): string {
  if (env.PUBLIC_API_URL) {
    return env.PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return `http://localhost:${env.PORT}`;
}
