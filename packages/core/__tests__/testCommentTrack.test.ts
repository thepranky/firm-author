import { describe, it, expect } from "vitest";
import { readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanAuthors } from "../src/scanAuthors.ts";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import { generateAuditReport } from "../src/generateAuditReport.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(
  __dirname,
  "fixtures",
  "word-desktop",
  "test_comment_track.docx",
);

async function fixtureExists(): Promise<boolean> {
  try {
    await access(FIXTURE_PATH);
    return true;
  } catch {
    return false;
  }
}

const hasFixture = await fixtureExists();

/**
 * Primary regression fixture — real Word Desktop document (local only, gitignored).
 * Add test_comment_track.docx to fixtures/word-desktop/ on your machine.
 */
describe.skipIf(!hasFixture)(
  "test_comment_track.docx (primary Word Desktop fixture)",
  () => {
    async function loadFixture(): Promise<Uint8Array> {
      const buf = await readFile(FIXTURE_PATH);
      return new Uint8Array(buf);
    }

    it("loads and finds at least one author", async () => {
      const bytes = await loadFixture();
      const scan = await scanAuthors(bytes);
      expect(scan.authors.length).toBeGreaterThan(0);
      expect(
        scan.authors.some(
          (a) => a.trackedChangeCount > 0 || a.commentCount > 0,
        ),
      ).toBe(true);
    });

    it("anonymises all detected authors with integrity checks passing", async () => {
      const bytes = await loadFixture();
      const scan = await scanAuthors(bytes);
      const authorsToReplace = scan.authors.map((a) => a.author);

      const result = await anonymiseAuthors(bytes, {
        authorsToReplace,
        replacementAuthor: "Law Firm LLP",
        replacementInitials: "LFL",
        timestampPolicy: { mode: "preserve" },
      });

      expect(result.integrity.bodyTextUnchanged).toBe(true);
      expect(result.integrity.commentCountUnchanged).toBe(true);
      expect(result.integrity.trackedChangeCountUnchanged).toBe(true);

      const after = await scanAuthors(result.docxBytes);
      for (const orig of authorsToReplace) {
        expect(
          after.authors.find(
            (a) => a.author.toLowerCase() === orig.toLowerCase(),
          ),
        ).toBeUndefined();
      }
      expect(after.authors.some((a) => a.author === "Law Firm LLP")).toBe(true);
    });

    it("produces a valid audit report", async () => {
      const bytes = await loadFixture();
      const scan = await scanAuthors(bytes);
      const result = await anonymiseAuthors(bytes, {
        authorsToReplace: scan.authors.map((a) => a.author),
        replacementAuthor: "Law Firm LLP",
        replacementInitials: "LFL",
        timestampPolicy: { mode: "preserve" },
      });

      const report = generateAuditReport(result);
      expect(report.summary.authorsReplaced).toBeGreaterThan(0);
      expect(report.integrity.bodyTextUnchanged).toBe(true);
    });
  },
);
