import { describe, it, expect } from "vitest";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import { scanAuthors } from "../src/scanAuthors.ts";
import {
  buildMultiAuthorTrackedDocx,
  buildUnclassifiedAuthorDocx,
  buildDocx,
  documentWithTrackedChanges,
  multiAuthorPeopleXml,
} from "./fixtures/buildDocx.ts";
import { getPartBytes } from "../src/parts.ts";

describe("anonymiseAuthors", () => {
  it("replaces only selected authors", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const after = await scanAuthors(result.docxBytes);
    expect(after.authors.find((a) => a.author === "Jane Doe")).toBeUndefined();
    expect(after.authors.find((a) => a.author === "John Smith")).toBeDefined();
    expect(
      after.authors.some((a) => a.author === "Law Firm LLP"),
    ).toBe(true);
  });

  it("replaces comment initials", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const commentsPart = await getPartBytes(result.docxBytes, "word/comments.xml");
    expect(commentsPart).toBeTruthy();
    const text = new TextDecoder().decode(commentsPart!);
    expect(text).toContain('w:author="Law Firm LLP"');
    expect(text).toContain('w:initials="LFL"');
  });

  it("case-insensitive author matching", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["jane doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const after = await scanAuthors(result.docxBytes);
    expect(after.authors.find((a) => a.author.toLowerCase() === "jane doe")).toBeUndefined();
  });

  it("removes w:date when timestamp policy is remove", async () => {
    const bytes = await buildDocx({ documentXml: documentWithTrackedChanges() });
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "remove" },
    });

    const docPart = new TextDecoder().decode(
      (await getPartBytes(result.docxBytes, "word/document.xml"))!,
    );
    expect(docPart).not.toMatch(/w:author="Jane Doe"/);
    expect(docPart).not.toContain('w:date="2024-01-15T10:00:00Z"');
  });

  it("does not rewrite unclassified w:author elements", async () => {
    const bytes = await buildUnclassifiedAuthorDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const docPart = new TextDecoder().decode(
      (await getPartBytes(result.docxBytes, "word/document.xml"))!,
    );
    expect(docPart).toContain('w:author="Unknown Element Author"');
  });

  it("scrubs people.xml for selected authors and strips presence info", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const origCore = await getPartBytes(bytes, "docProps/core.xml");

    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const newPeople = await getPartBytes(result.docxBytes, "word/people.xml");
    const newCore = await getPartBytes(result.docxBytes, "docProps/core.xml");

    expect(newPeople).toBeTruthy();
    const peopleText = new TextDecoder().decode(newPeople!);
    expect(peopleText).toContain('w15:author="Law Firm LLP"');
    expect(peopleText).not.toContain('w15:author="Jane Doe"');
    expect(peopleText).not.toContain("w15:presenceInfo");
    expect(peopleText).not.toContain("jane.doe@firm.com");
    expect(new TextDecoder().decode(newCore!)).toBe(
      new TextDecoder().decode(origCore!),
    );
  });

  it("keeps unmatched people.xml entries unchanged", async () => {
    const bytes = await buildDocx({
      documentXml: documentWithTrackedChanges(),
      commentsXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="Jane Doe" w:date="2024-01-15T10:00:00Z" w:initials="JD">
    <w:p><w:r><w:t>First comment</w:t></w:r></w:p>
  </w:comment>
  <w:comment w:id="1" w:author="John Smith" w:date="2024-01-16T11:00:00Z" w:initials="JS">
    <w:p><w:r><w:t>Second comment</w:t></w:r></w:p>
  </w:comment>
</w:comments>`,
      peopleXml: multiAuthorPeopleXml(),
    });

    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const peopleText = new TextDecoder().decode(
      (await getPartBytes(result.docxBytes, "word/people.xml"))!,
    );
    expect(peopleText).toContain('w15:author="Law Firm LLP"');
    expect(peopleText).toContain('w15:author="John Smith"');
    expect(peopleText).toContain('john.smith@firm.com');
  });

  it("merges multiple scrubbed people.xml authors into one replacement entry", async () => {
    const bytes = await buildDocx({
      documentXml: documentWithTrackedChanges(),
      commentsXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="Jane Doe" w:date="2024-01-15T10:00:00Z" w:initials="JD">
    <w:p><w:r><w:t>First comment</w:t></w:r></w:p>
  </w:comment>
  <w:comment w:id="1" w:author="John Smith" w:date="2024-01-16T11:00:00Z" w:initials="JS">
    <w:p><w:r><w:t>Second comment</w:t></w:r></w:p>
  </w:comment>
</w:comments>`,
      peopleXml: multiAuthorPeopleXml(),
    });

    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const peopleText = new TextDecoder().decode(
      (await getPartBytes(result.docxBytes, "word/people.xml"))!,
    );
    expect((peopleText.match(/w15:person\b/g) ?? [])).toHaveLength(1);
    expect(peopleText).toContain('w15:author="Law Firm LLP"');
    expect(peopleText).not.toContain('w15:author="Jane Doe"');
    expect(peopleText).not.toContain('w15:author="John Smith"');
    expect(peopleText).not.toContain("w15:userId");
  });

  it("passes integrity checks when people.xml is absent", async () => {
    const bytes = await buildDocx({ documentXml: documentWithTrackedChanges() });
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    expect(result.integrity.bodyTextUnchanged).toBe(true);
    expect(result.integrity.commentCountUnchanged).toBe(true);
    expect(result.integrity.trackedChangeCountUnchanged).toBe(true);
  });

  it("passes integrity checks", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    expect(result.integrity.bodyTextUnchanged).toBe(true);
    expect(result.integrity.commentCountUnchanged).toBe(true);
    expect(result.integrity.trackedChangeCountUnchanged).toBe(true);
  });

  it("throws when no authors selected", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    await expect(
      anonymiseAuthors(bytes, {
        authorsToReplace: [],
        replacementAuthor: "Law Firm LLP",
        replacementInitials: "LFL",
        timestampPolicy: { mode: "preserve" },
      }),
    ).rejects.toThrow();
  });
});
