import { describe, it, expect } from "vitest";
import { scanAuthors } from "../src/scanAuthors.ts";
import {
  buildDocx,
  buildMultiAuthorTrackedDocx,
  buildHeaderFootnoteDocx,
  buildModernCommentsDocx,
  buildUnclassifiedAuthorDocx,
  commentsWithAuthors,
  documentWithTrackedChanges,
} from "./fixtures/buildDocx.ts";

describe("scanAuthors", () => {
  it("smoke test: loads synthetic docx", async () => {
    const bytes = await buildDocx();
    const result = await scanAuthors(bytes);
    expect(result.authors.length).toBeGreaterThan(0);
  });

  it("finds multiple authors with tracked change and comment counts", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await scanAuthors(bytes);

    const jane = result.authors.find((a) => a.author === "Jane Doe");
    const john = result.authors.find((a) => a.author === "John Smith");

    expect(jane?.trackedChangeCount).toBe(1);
    expect(jane?.commentCount).toBe(1);
    expect(jane?.initials).toContain("JD");

    expect(john?.trackedChangeCount).toBe(1);
    expect(john?.commentCount).toBe(1);
    expect(john?.initials).toContain("JS");
  });

  it("groups authors case-insensitively", async () => {
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:ins w:id="1" w:author="jane doe" w:date="2024-01-15T10:00:00Z"><w:r><w:t>a</w:t></w:r></w:ins>
      <w:ins w:id="2" w:author="Jane Doe" w:date="2024-01-16T10:00:00Z"><w:r><w:t>b</w:t></w:r></w:ins>
    </w:p>
  </w:body>
</w:document>`;
    const bytes = await buildDocx({ documentXml: doc });
    const result = await scanAuthors(bytes);
    expect(result.authors).toHaveLength(1);
    expect(result.authors[0].trackedChangeCount).toBe(2);
  });

  it("reports unclassified w:author separately", async () => {
    const bytes = await buildUnclassifiedAuthorDocx();
    const result = await scanAuthors(bytes);

    expect(result.unclassified).toHaveLength(1);
    expect(result.unclassified[0].authorValue).toBe("Unknown Element Author");
    expect(result.authors.find((a) => a.author === "Jane Doe")?.trackedChangeCount).toBe(1);
  });

  it("detects ancillary people.xml and core.xml", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await scanAuthors(bytes);

    expect(result.ancillary.some((a) => a.part === "word/people.xml")).toBe(true);
    expect(result.ancillary.some((a) => a.part === "docProps/core.xml")).toBe(true);
  });

  it("detects modern comment extension parts without rewriting", async () => {
    const bytes = await buildModernCommentsDocx();
    const result = await scanAuthors(bytes);

    expect(
      result.ancillary.some((a) => a.part === "word/commentsExtensible.xml"),
    ).toBe(true);
    expect(result.extensionDatesDetected.length).toBeGreaterThanOrEqual(0);
  });

  it("scans header and footnote revisions", async () => {
    const bytes = await buildHeaderFootnoteDocx();
    const result = await scanAuthors(bytes);

    expect(result.authors.find((a) => a.author === "Jane Doe")?.trackedChangeCount).toBe(1);
    expect(result.authors.find((a) => a.author === "John Smith")?.trackedChangeCount).toBe(1);
  });
});
