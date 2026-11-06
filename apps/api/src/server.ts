import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env, isCloudinaryConfigured } from "./config/env.js";
import { LOCAL_STORAGE_ROOT } from "./services/storage/paths.js";
import { ensureLocalStorage } from "./services/storage/local.js";
import { startProcessingWorker } from "./services/pdf/processor.js";
import { seedThemesIfNeeded } from "./scripts/seed-themes.js";

async function ensureRuntimeDirs() {
  const root = path.join(os.tmpdir(), "epaper");
  await fs.mkdir(path.join(root, "uploads"), { recursive: true });
  await fs.mkdir(path.join(root, "jobs"), { recursive: true });
  await ensureLocalStorage();
}

async function main() {
  await ensureRuntimeDirs();
  await connectDb();
  await seedThemesIfNeeded();
  startProcessingWorker();

  const app = createApp();
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`[api] listening on http://0.0.0.0:${env.PORT}`);
    console.log(`[api] CLIENT_URL=${env.CLIENT_URL}`);
    console.log(`[api] localStorage=${LOCAL_STORAGE_ROOT}`);
    console.log(
      `[api] pageImages=${isCloudinaryConfigured() ? "cloudinary" : "local"}`
    );
  });
}

main().catch((error) => {
  console.error("[api] failed to start", error);
  process.exit(1);
});
