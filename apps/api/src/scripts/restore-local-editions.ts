/**
 * Rebuilds edition/page/segment Mongo documents from files already on disk
 * under `.data/storage` after a DB wipe (storage survived, editions collection empty).
 *
 * Usage: npm run restore:editions -w @epaper/api
 */
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { loadImage } from "@napi-rs/canvas";
import { normalizeRect } from "@epaper/shared";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { Edition } from "../models/Edition.js";
import { Page } from "../models/Page.js";
import { Segment } from "../models/Segment.js";
import { Theme } from "../models/Theme.js";
import { LOCAL_STORAGE_ROOT } from "../services/storage/paths.js";

const RESTORE = [
  {
    id: "6aeb29fe8e3099833f7d6e6d",
    title: "Morning Edition",
    publicationDate: "2026-11-03",
  },
  {
    id: "6aeb2ee7509abf21261e6811",
    title: "City Daily",
    publicationDate: "2026-11-04",
  },
] as const;

function mediaUrl(...parts: string[]) {
  return `http://localhost:${env.PORT}/media/${parts.join("/")}`;
}

async function listPageFiles(editionId: string) {
  const dir = path.join(LOCAL_STORAGE_ROOT, "pages", editionId);
  const entries = await fs.readdir(dir);
  return entries
    .filter((name) => /^page-\d+\.png$/i.test(name))
    .map((name) => {
      const pageNumber = Number(name.match(/^page-(\d+)\.png$/i)?.[1]);
      return { name, pageNumber, filePath: path.join(dir, name) };
    })
    .filter((item) => Number.isFinite(item.pageNumber))
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

async function restoreSegments(
  editionId: string,
  pagesByNumber: Map<number, InstanceType<typeof Page>>
) {
  const cropsDir = path.join(LOCAL_STORAGE_ROOT, "crops");
  let files: string[] = [];
  try {
    files = await fs.readdir(cropsDir);
  } catch {
    return 0;
  }

  const prefix = `${editionId}_page-`;
  const cropFiles = files.filter((name) => name.startsWith(prefix));
  let created = 0;

  for (const file of cropFiles) {
    const match = file.match(
      new RegExp(
        `^${editionId}_page-(\\d+)_(\\d+)_(\\d+)_(\\d+)_(\\d+)\\.png$`
      )
    );
    if (!match) continue;

    const [, pageStr, xStr, yStr, wStr, hStr] = match;
    const pageNumber = Number(pageStr);
    const page = pagesByNumber.get(pageNumber);
    if (!page) continue;

    const coordinates = normalizeRect(
      Number(xStr),
      Number(yStr),
      Number(wStr),
      Number(hStr),
      page.imageWidth,
      page.imageHeight
    );

    await Segment.create({
      editionId: page.editionId,
      pageId: page._id,
      title: `Story · page ${pageNumber}`,
      coordinates,
      isEnabled: true,
    });
    created += 1;
  }

  return created;
}

async function restoreOne(item: (typeof RESTORE)[number], theme: InstanceType<typeof Theme>) {
  const editionObjectId = new mongoose.Types.ObjectId(item.id);
  const existing = await Edition.findById(editionObjectId);
  if (existing) {
    console.log(`skip ${item.id} — already exists (${existing.title})`);
    return;
  }

  const pageFiles = await listPageFiles(item.id);
  if (pageFiles.length === 0) {
    console.warn(`skip ${item.id} — no page images found`);
    return;
  }

  const pdfPublicId = `local/pdfs/edition-${item.id}`;
  const pdfPath = path.join(LOCAL_STORAGE_ROOT, "pdfs", `edition-${item.id}.pdf`);
  let hasPdf = true;
  try {
    await fs.access(pdfPath);
  } catch {
    hasPdf = false;
  }

  const edition = await Edition.create({
    _id: editionObjectId,
    title: item.title,
    publicationDate: item.publicationDate,
    originalPdfPublicId: hasPdf ? pdfPublicId : null,
    originalPdfUrl: hasPdf ? mediaUrl("pdfs", `edition-${item.id}.pdf`) : null,
    totalPages: pageFiles.length,
    themeId: theme._id,
    themeKey: theme.key,
    themeConfig: theme.configuration,
    processingStatus: "ready",
    publicationStatus: "published",
    publishedAt: new Date(`${item.publicationDate}T08:00:00.000Z`),
    processingProgress: {
      stage: "done",
      totalPages: pageFiles.length,
      completedPages: pageFiles.length,
      message: "Restored from local storage",
    },
  });

  const pagesByNumber = new Map<number, InstanceType<typeof Page>>();

  for (const pageFile of pageFiles) {
    const image = await loadImage(pageFile.filePath);
    const publicId = `local/pages/${item.id}/page-${pageFile.pageNumber}`;
    const imageUrl = mediaUrl("pages", item.id, `page-${pageFile.pageNumber}.png`);

    const page = await Page.create({
      editionId: edition._id,
      sourcePdfPageNumber: pageFile.pageNumber,
      displayPageNumber: pageFile.pageNumber,
      displayOrder: pageFile.pageNumber,
      title: `Page ${pageFile.pageNumber}`,
      pdfWidth: image.width,
      pdfHeight: image.height,
      imageWidth: image.width,
      imageHeight: image.height,
      imagePublicId: publicId,
      imageUrl,
      thumbnailUrl: imageUrl,
      isVisible: true,
    });

    pagesByNumber.set(pageFile.pageNumber, page);
  }

  const segmentCount = await restoreSegments(item.id, pagesByNumber);

  console.log(
    `restored ${item.title} (${item.publicationDate}) — ${pageFiles.length} pages, ${segmentCount} articles`
  );
}

async function main() {
  await connectDb();

  const theme =
    (await Theme.findOne({ key: "classic-sidebar" })) ||
    (await Theme.findOne({ isActive: true }));

  if (!theme) {
    throw new Error("No theme found. Run npm run seed:themes first.");
  }

  for (const item of RESTORE) {
    await restoreOne(item, theme);
  }

  const published = await Edition.countDocuments({
    publicationStatus: "published",
    processingStatus: "ready",
  });
  console.log(`published ready editions: ${published}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
