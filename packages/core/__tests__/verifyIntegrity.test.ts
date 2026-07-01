import { describe, it, expect } from "vitest";
import { verifyIntegrity } from "../src/verifyIntegrity.ts";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import { buildMultiAuthorTrackedDocx } from "./fixtures/buildDocx.ts";

describe("verifyIntegrity", () => {
  it("reports unchanged body text, comments, and tracked changes after anonymisation", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const check = await verifyIntegrity(bytes, result.docxBytes);
    expect(check.bodyTextUnchanged).toBe(true);
    expect(check.commentCountUnchanged).toBe(true);
    expect(check.trackedChangeCountUnchanged).toBe(true);
    expect(check.details).toHaveLength(3);
  });
});
