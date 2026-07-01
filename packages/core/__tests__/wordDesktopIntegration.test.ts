import { describe, it, expect } from "vitest";
import { scanAuthors } from "../src/scanAuthors.ts";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import {
  buildMultiAuthorTrackedDocx,
  buildModernCommentsDocx,
  buildHeaderFootnoteDocx,
  buildWordResavedDocx,
} from "./fixtures/buildDocx.ts";

describe("word-desktop style fixture integration", () => {
  const cases: [string, () => Promise<Uint8Array>][] = [
    ["multi-author-tracked", buildMultiAuthorTrackedDocx],
    ["multi-author-comments", buildMultiAuthorTrackedDocx],
    ["modern-comments-replies", buildModernCommentsDocx],
    ["header-footer-footnote", buildHeaderFootnoteDocx],
    ["word-resaved", buildWordResavedDocx],
  ];

  for (const [name, build] of cases) {
    it(`processes ${name}`, async () => {
      const bytes = await build();
      const scan = await scanAuthors(bytes);
      expect(scan.authors.length).toBeGreaterThan(0);

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
  }
});
