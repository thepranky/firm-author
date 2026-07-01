import { describe, it, expect } from "vitest";
import {
  buildMultiAuthorTrackedDocx,
  buildHeaderFootnoteDocx,
  buildModernCommentsDocx,
  buildWordResavedDocx,
} from "./fixtures/buildDocx.ts";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixtures", "word-desktop");

/** Writes realistic OOXML fixtures to word-desktop/ for manual Word Desktop QA */
describe("word-desktop fixtures", () => {
  it("writes fixture files", async () => {
    await mkdir(FIXTURE_DIR, { recursive: true });

    const fixtures: [string, Promise<Uint8Array>][] = [
      ["multi-author-tracked.docx", buildMultiAuthorTrackedDocx()],
      ["multi-author-comments.docx", buildMultiAuthorTrackedDocx()],
      ["modern-comments-replies.docx", buildModernCommentsDocx()],
      ["header-footer-footnote.docx", buildHeaderFootnoteDocx()],
      ["word-resaved.docx", buildWordResavedDocx()],
    ];

    for (const [name, bytesPromise] of fixtures) {
      const bytes = await bytesPromise;
      await writeFile(join(FIXTURE_DIR, name), bytes);
      expect(bytes.length).toBeGreaterThan(100);
    }
  });
});
