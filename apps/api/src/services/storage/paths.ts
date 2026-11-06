import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

function resolveLocalStorageRoot() {
  if (process.env.LOCAL_STORAGE_DIR?.trim()) {
    return path.resolve(process.env.LOCAL_STORAGE_DIR.trim());
  }

  // Prefer writable locations that work on Railway and local monorepo checkouts.
  const candidates = [
    path.resolve(process.cwd(), ".data", "storage"),
    path.resolve(apiRoot, ".data", "storage"),
    path.resolve(apiRoot, "../../.data/storage"),
    path.join(os.tmpdir(), "epaper", "storage"),
  ];

  return candidates[0];
}

/** Absolute path for locally stored PDFs / page images / crops. */
export const LOCAL_STORAGE_ROOT = resolveLocalStorageRoot();
