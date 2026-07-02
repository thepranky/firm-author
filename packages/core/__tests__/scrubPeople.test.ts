import { describe, expect, it } from "vitest";
import { scrubPeopleXml } from "../src/scrubPeople.ts";
import { multiAuthorPeopleXml } from "./fixtures/buildDocx.ts";

describe("scrubPeopleXml", () => {
  it("rewrites the selected author and strips presenceInfo", () => {
    const result = scrubPeopleXml(multiAuthorPeopleXml(), {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
    });

    expect(result.modifiedCount).toBe(1);
    expect(result.xml).toContain('w15:author="Law Firm LLP"');
    expect(result.xml).not.toContain('w15:author="Jane Doe"');
    expect(result.xml).not.toContain("jane.doe@firm.com");
    expect(result.xml).toContain('w15:author="John Smith"');
    expect(result.xml).toContain("john.smith@firm.com");
  });

  it("matches authors case-insensitively", () => {
    const result = scrubPeopleXml(multiAuthorPeopleXml(), {
      authorsToReplace: ["jane doe"],
      replacementAuthor: "Law Firm LLP",
    });

    expect(result.modifiedCount).toBe(1);
    expect(result.xml).toContain('w15:author="Law Firm LLP"');
  });

  it("merges multiple scrubbed authors into one replacement entry", () => {
    const result = scrubPeopleXml(multiAuthorPeopleXml(), {
      authorsToReplace: ["Jane Doe", "John Smith"],
      replacementAuthor: "Law Firm LLP",
    });

    expect(result.modifiedCount).toBe(2);
    expect((result.xml.match(/w15:person\b/g) ?? [])).toHaveLength(1);
    expect(result.xml).toContain('w15:author="Law Firm LLP"');
    expect(result.xml).not.toContain('w15:author="Jane Doe"');
    expect(result.xml).not.toContain('w15:author="John Smith"');
    expect(result.xml).not.toContain("w15:userId");
  });

  it("drops matched entries when the replacement author already exists", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w15:person w15:author="Jane Doe">
    <w15:presenceInfo w15:providerId="AD" w15:userId="jane.doe@firm.com"/>
  </w15:person>
  <w15:person w15:author="Law Firm LLP"/>
</w15:people>`;

    const result = scrubPeopleXml(xml, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
    });

    expect((result.xml.match(/w15:person\b/g) ?? [])).toHaveLength(1);
    expect(result.xml).toContain('w15:author="Law Firm LLP"');
    expect(result.xml).not.toContain("Jane Doe");
  });

  it("preserves authors that were not selected", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w15:person w15:author="Jane Doe"/>
  <w15:person w15:author="External Reviewer"/>
</w15:people>`;

    const result = scrubPeopleXml(xml, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
    });

    expect(result.xml).toContain('w15:author="Law Firm LLP"');
    expect(result.xml).toContain('w15:author="External Reviewer"');
  });
});
