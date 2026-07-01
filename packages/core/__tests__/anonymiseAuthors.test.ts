import { describe, it, expect } from "vitest";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import { scanAuthors } from "../src/scanAuthors.ts";
import {
  buildMultiAuthorTrackedDocx,
  buildUnclassifiedAuthorDocx,
  buildDocx,
  documentWithTrackedChanges,
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

  it("normalises w:date when timestamp policy is normalize", async () => {
    const bytes = await buildDocx({ documentXml: documentWithTrackedChanges() });
    const iso = "2025-06-01T12:00:00Z";
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "normalize", isoDatetime: iso },
    });

    const docPart = new TextDecoder().decode(
      (await getPartBytes(result.docxBytes, "word/document.xml"))!,
    );
    expect(docPart).toContain(`w:date="${iso}"`);
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

  it("does not modify people.xml or core.xml", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const origPeople = await getPartBytes(bytes, "word/people.xml");
    const origCore = await getPartBytes(bytes, "docProps/core.xml");

    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const newPeople = await getPartBytes(result.docxBytes, "word/people.xml");
    const newCore = await getPartBytes(result.docxBytes, "docProps/core.xml");

    expect(new TextDecoder().decode(newPeople!)).toBe(
      new TextDecoder().decode(origPeople!),
    );
    expect(new TextDecoder().decode(newCore!)).toBe(
      new TextDecoder().decode(origCore!),
    );
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
