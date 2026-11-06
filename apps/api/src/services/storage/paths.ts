import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

/** Absolute path to monorepo `.data/storage` (two levels above apps/api). */
export const LOCAL_STORAGE_ROOT = path.resolve(apiRoot, "../../.data/storage");
