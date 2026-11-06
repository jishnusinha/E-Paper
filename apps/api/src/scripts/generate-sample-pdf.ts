/**
 * Generates a non-copyrighted multi-page sample PDF for local testing.
 * Run: npx tsx src/scripts/generate-sample-pdf.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Minimal valid multi-page PDF built from simple page content streams
  const pages = 3;
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  // We'll construct a simple PDF manually
  let objectId = 1;
  const catalogId = objectId++;
  const pagesId = objectId++;

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontId = objectId++;

  for (let i = 0; i < pages; i++) {
    pageIds.push(objectId++);
    contentIds.push(objectId++);
  }

  const chunks: Buffer[] = [];
  const offsets: number[] = [0];

  const push = (id: number, body: string) => {
    offsets[id] = Buffer.concat(chunks).length;
    chunks.push(Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "utf8"));
  };

  // placeholder offsets index
  for (let i = 0; i <= pageIds[pageIds.length - 1]; i++) offsets[i] = 0;

  const header = Buffer.from("%PDF-1.4\n", "utf8");
  chunks.push(header);

  push(
    catalogId,
    `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  );

  push(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`
  );

  push(
    fontId,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
  );

  for (let i = 0; i < pages; i++) {
    const content = `BT /F1 24 Tf 72 720 Td (Sample Newspaper Page ${i + 1}) Tj ET
BT /F1 14 Tf 72 680 Td (Article A column) Tj ET
BT /F1 14 Tf 320 680 Td (Article B column) Tj ET
BT /F1 14 Tf 72 400 Td (Article C full width) Tj ET`;
    push(
      contentIds[i],
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
    );
    push(
      pageIds[i],
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageObjectIds.push(pageIds[i]);
  }

  const body = Buffer.concat(chunks);
  let xrefPos = body.length;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  // rebuild with accurate offsets
  const rebuilt: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const off: number[] = [0];
  const writeObj = (id: number, bodyStr: string) => {
    off[id] = Buffer.concat(rebuilt).length;
    rebuilt.push(Buffer.from(`${id} 0 obj\n${bodyStr}\nendobj\n`, "utf8"));
  };

  writeObj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  writeObj(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`
  );
  writeObj(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  for (let i = 0; i < pages; i++) {
    const content = `BT /F1 24 Tf 72 720 Td (Sample Newspaper Page ${i + 1}) Tj ET\nBT /F1 14 Tf 72 680 Td (Article A column) Tj ET\nBT /F1 14 Tf 320 680 Td (Article B column) Tj ET\nBT /F1 14 Tf 72 400 Td (Article C full width) Tj ET`;
    writeObj(
      contentIds[i],
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
    );
    writeObj(
      pageIds[i],
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
  }

  const pdfBody = Buffer.concat(rebuilt);
  xrefPos = pdfBody.length;
  xref = `xref\n0 ${Math.max(...[catalogId, pagesId, fontId, ...pageIds, ...contentIds]) + 1}\n0000000000 65535 f \n`;
  const maxId = Math.max(...[catalogId, pagesId, fontId, ...pageIds, ...contentIds]);
  for (let i = 1; i <= maxId; i++) {
    const value = String(off[i] ?? 0).padStart(10, "0");
    xref += `${value} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  const out = Buffer.concat([
    pdfBody,
    Buffer.from(xref, "utf8"),
    Buffer.from(trailer, "utf8"),
  ]);

  // also write a PNG preview of page 1 for sanity
  const canvas = createCanvas(400, 520);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 400, 520);
  ctx.fillStyle = "#111";
  ctx.font = "20px sans-serif";
  ctx.fillText("Sample Newspaper", 40, 60);

  const fixturesDir = path.resolve(__dirname, "../../../../fixtures");
  await fs.mkdir(fixturesDir, { recursive: true });
  const pdfPath = path.join(fixturesDir, "sample-newspaper.pdf");
  await fs.writeFile(pdfPath, out);
  await fs.writeFile(
    path.join(fixturesDir, "sample-page-preview.png"),
    await canvas.encode("png")
  );
  console.log(`[fixture] wrote ${pdfPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
