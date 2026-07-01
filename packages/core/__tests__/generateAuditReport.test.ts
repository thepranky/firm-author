import { describe, it, expect } from "vitest";
import {
  generateAuditReport,
  auditReportToJson,
  auditReportToHtml,
} from "../src/generateAuditReport.ts";
import { anonymiseAuthors } from "../src/anonymiseAuthors.ts";
import { buildMultiAuthorTrackedDocx } from "./fixtures/buildDocx.ts";

describe("generateAuditReport", () => {
  it("produces JSON and HTML with expected sections", async () => {
    const bytes = await buildMultiAuthorTrackedDocx();
    const result = await anonymiseAuthors(bytes, {
      authorsToReplace: ["Jane Doe"],
      replacementAuthor: "Law Firm LLP",
      replacementInitials: "LFL",
      timestampPolicy: { mode: "preserve" },
    });

    const report = generateAuditReport(result);
    expect(report.authors).toHaveLength(1);
    expect(report.authors[0].originalAuthor).toBe("Jane Doe");
    expect(report.summary.authorsReplaced).toBe(1);
    expect(report.integrity.bodyTextUnchanged).toBe(true);
    expect(report.futureOptionsNote).toContain("core.xml");

    const json = auditReportToJson(report);
    expect(JSON.parse(json).replacementAuthor).toBe("Law Firm LLP");

    const html = auditReportToHtml(report);
    expect(html).toContain("Integrity verification");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Law Firm LLP");
    expect(html).toContain("PASS");
  });
});
