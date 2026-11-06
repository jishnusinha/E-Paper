import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createCanvas } from "@napi-rs/canvas";
import { env } from "../../config/env.js";

const require = createRequire(import.meta.url);

// pdfjs-dist legacy build works better in Node
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");

export interface RenderedPage {
  pageNumber: number;
  pdfWidth: number;
  pdfHeight: number;
  imageWidth: number;
  imageHeight: number;
  imagePath: string;
}

async function getDocument(data: Uint8Array) {
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });
  return loadingTask.promise;
}

export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const buffer = await fs.readFile(pdfPath);
  const doc = await getDocument(new Uint8Array(buffer));
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

export async function renderPdfPage(
  pdfPath: string,
  pageNumber: number,
  outputDir: string,
  targetWidth = env.PDF_RENDER_TARGET_WIDTH
): Promise<RenderedPage> {
  const buffer = await fs.readFile(pdfPath);
  const doc = await getDocument(new Uint8Array(buffer));

  try {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.floor(viewport.width),
      Math.floor(viewport.height)
    );
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context as unknown as {
        canvas: unknown;
        fillStyle: unknown;
      },
      viewport,
    }).promise;

    await fs.mkdir(outputDir, { recursive: true });
    const imagePath = path.join(outputDir, `page-${pageNumber}.png`);
    const png = await canvas.encode("png");
    await fs.writeFile(imagePath, png);

    return {
      pageNumber,
      pdfWidth: baseViewport.width,
      pdfHeight: baseViewport.height,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      imagePath,
    };
  } finally {
    await doc.destroy();
  }
}

export async function renderPdfPagesBounded(
  pdfPath: string,
  outputDir: string,
  onPage: (page: RenderedPage, index: number, total: number) => Promise<void>,
  concurrency = env.PDF_PROCESSING_CONCURRENCY
): Promise<number> {
  const total = await getPdfPageCount(pdfPath);
  let next = 1;

  async function worker() {
    while (next <= total) {
      const pageNumber = next;
      next += 1;
      const rendered = await renderPdfPage(pdfPath, pageNumber, outputDir);
      await onPage(rendered, pageNumber - 1, total);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, total)) },
    () => worker()
  );
  await Promise.all(workers);
  return total;
}
