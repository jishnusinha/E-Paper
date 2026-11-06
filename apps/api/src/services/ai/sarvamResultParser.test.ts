import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  extractZipEntries,
  isSafeZipPath,
  normalizeSarvamBlocks,
  parseSarvamZipToBlocks,
} from "./sarvamResultParser.js";

describe("sarvamResultParser", () => {
  it("normalizes layout blocks from page metadata", () => {
    const blocks = normalizeSarvamBlocks(
      {
        page_width: 1000,
        page_height: 2000,
        coordinate_space: "pixels",
        blocks: [
          {
            id: "1",
            layout_tag: "heading",
            text: "Hello",
            reading_order: 1,
            bounding_box: { x: 100, y: 200, width: 300, height: 40 },
          },
          {
            layout_tag: "paragraph",
            text: "Body",
            reading_order: 2,
            bbox: [100, 260, 400, 460],
          },
        ],
      },
      { width: 1000, height: 2000 }
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].coordinates.x).toBeCloseTo(0.1);
    expect(blocks[1].type).toBe("paragraph");
  });

  it("rejects missing blocks", () => {
    expect(() =>
      normalizeSarvamBlocks({
        page_width: 100,
        page_height: 100,
      })
    ).toThrow(/blocks/i);
  });

  it("extracts JSON from a safe ZIP", async () => {
    const zip = new JSZip();
    zip.file(
      "page.png/metadata/page_001.json",
      JSON.stringify({
        page_width: 500,
        page_height: 800,
        blocks: [
          {
            layout_tag: "heading",
            text: "Zip Headline",
            bounding_box: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
          },
        ],
      })
    );
    const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
    const files = await extractZipEntries(buffer);
    expect(files.size).toBe(1);

    const blocks = await parseSarvamZipToBlocks(buffer, {
      width: 500,
      height: 800,
    });
    expect(blocks[0].text).toBe("Zip Headline");
  });

  it("rejects unsafe ZIP entry paths", () => {
    expect(isSafeZipPath("../evil.json")).toBe(false);
    expect(isSafeZipPath("/etc/passwd.json")).toBe(false);
    expect(isSafeZipPath("page/metadata/page_001.json")).toBe(true);
  });
});
