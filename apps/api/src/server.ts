import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startProcessingWorker } from "./services/pdf/processor.js";
import { seedThemesIfNeeded } from "./scripts/seed-themes.js";

async function main() {
  await connectDb();
  await seedThemesIfNeeded();
  startProcessingWorker();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error("[api] failed to start", error);
  process.exit(1);
});
