import type {
  AnonymiseResult,
  AuditAuthorEntry,
  AuditLocation,
  AuditReport,
} from "./types.js";

function groupLocations(
  hits: AnonymiseResult["hits"],
  originalAuthor: string,
): AuditLocation[] {
  const map = new Map<string, AuditLocation>();
  const key = originalAuthor.toLowerCase();

  for (const hit of hits) {
    if (hit.authorValue.toLowerCase() !== key) continue;
    const locKey = `${hit.part}|${hit.elementLocalName}|${hit.attribute}`;
    const existing = map.get(locKey);
    const element = hit.elementLocalName.startsWith("w:")
      ? hit.elementLocalName
      : `w:${hit.elementLocalName}`;
    const attribute =
      hit.attribute === "author"
        ? "w:author"
        : hit.attribute === "initials"
          ? "w:initials"
          : "w:date";

    if (existing) {
      existing.count++;
    } else {
      map.set(locKey, {
        part: hit.part,
        element,
        attribute,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.part.localeCompare(b.part),
  );
}

export function generateAuditReport(result: AnonymiseResult): AuditReport {
  const { options, hits, integrity, scanBefore } = result;
  const authors: AuditAuthorEntry[] = [];

  for (const authorToReplace of options.authorsToReplace) {
    const summary = scanBefore.authors.find(
      (a) => a.author.toLowerCase() === authorToReplace.toLowerCase(),
    );
    if (!summary) continue;

    authors.push({
      originalAuthor: summary.author,
      replacementAuthor: options.replacementAuthor,
      trackedChangeCount: summary.trackedChangeCount,
      commentCount: summary.commentCount,
      initialsReplaced: summary.initials,
      locations: groupLocations(hits, summary.author),
    });
  }

  const partsModified = [
    ...new Set(hits.map((h) => h.part)),
  ].sort();

  const totalTrackedChangesAffected = authors.reduce(
    (s, a) => s + a.trackedChangeCount,
    0,
  );
  const totalCommentsAffected = authors.reduce(
    (s, a) => s + a.commentCount,
    0,
  );

  return {
    processedAt: new Date().toISOString(),
    timestampPolicy: options.timestampPolicy,
    replacementAuthor: options.replacementAuthor,
    replacementInitials: options.replacementInitials,
    authors,
    integrity,
    ancillary: scanBefore.ancillary,
    unclassified: scanBefore.unclassified,
    extensionDatesDetected: scanBefore.extensionDatesDetected,
    summary: {
      authorsReplaced: authors.length,
      totalTrackedChangesAffected,
      totalCommentsAffected,
      partsModified,
    },
    futureOptionsNote:
      "Future option: also replace document creator / last modified by metadata in docProps/core.xml (not active in MVP).",
  };
}

export function auditReportToJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function integrityRow(label: string, pass: boolean, detail?: string): string {
  const status = pass
    ? '<span class="pass">PASS</span>'
    : '<span class="fail">FAIL</span>';
  return `<tr><td>${escapeHtml(label)}</td><td>${status}</td><td>${escapeHtml(detail ?? "")}</td></tr>`;
}

export function auditReportToHtml(report: AuditReport): string {
  const integrityRows = [
    integrityRow(
      "Body text unchanged",
      report.integrity.bodyTextUnchanged,
      report.integrity.details.find((d) => d.label.includes("Body"))?.before +
        " → " +
        report.integrity.details.find((d) => d.label.includes("Body"))?.after,
    ),
    integrityRow(
      "Comment count unchanged",
      report.integrity.commentCountUnchanged,
      report.integrity.details.find((d) => d.label.includes("Comment"))
        ? `${report.integrity.details.find((d) => d.label.includes("Comment"))!.before} → ${report.integrity.details.find((d) => d.label.includes("Comment"))!.after}`
        : "",
    ),
    integrityRow(
      "Tracked-change count unchanged",
      report.integrity.trackedChangeCountUnchanged,
      report.integrity.details.find((d) => d.label.includes("Tracked"))
        ? `${report.integrity.details.find((d) => d.label.includes("Tracked"))!.before} → ${report.integrity.details.find((d) => d.label.includes("Tracked"))!.after}`
        : "",
    ),
  ].join("\n");

  const authorRows = report.authors
    .map(
      (a) => `
    <tr>
      <td>${escapeHtml(a.originalAuthor)}</td>
      <td>${escapeHtml(a.replacementAuthor)}</td>
      <td>${a.trackedChangeCount}</td>
      <td>${a.commentCount}</td>
      <td>${escapeHtml(a.initialsReplaced.join(", ") || "—")}</td>
    </tr>`,
    )
    .join("");

  const ancillaryList =
    report.ancillary.length === 0
      ? "<p>None detected.</p>"
      : `<ul>${report.ancillary
          .map(
            (f) =>
              `<li><strong>${escapeHtml(f.part)}</strong>: ${escapeHtml(f.description)} (${escapeHtml(f.matchingAuthors.join(", ") || "n/a")})</li>`,
          )
          .join("")}</ul>`;

  const unclassifiedList =
    report.unclassified.length === 0
      ? "<p>None.</p>"
      : `<ul>${report.unclassified
          .map(
            (u) =>
              `<li>${escapeHtml(u.part)} — &lt;w:${escapeHtml(u.elementLocalName)}&gt; author="${escapeHtml(u.authorValue)}"</li>`,
          )
          .join("")}</ul>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Author Anonymisation Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f5f5f5; }
    .pass { color: #0a7; font-weight: 600; }
    .fail { color: #c00; font-weight: 600; }
    .meta { color: #555; font-size: 0.9rem; }
    .note { background: #fffbe6; border: 1px solid #f0e6a0; padding: 0.75rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Author Anonymisation Audit Report</h1>
  <p class="meta">Processed: ${escapeHtml(report.processedAt)}</p>
  <p class="meta">Replacement author: <strong>${escapeHtml(report.replacementAuthor)}</strong> (${escapeHtml(report.replacementInitials)})</p>
  <p class="meta">Timestamp policy: <strong>${escapeHtml(report.timestampPolicy.mode)}</strong></p>

  <h2>Summary</h2>
  <ul>
    <li>Authors replaced: ${report.summary.authorsReplaced}</li>
    <li>Tracked changes affected: ${report.summary.totalTrackedChangesAffected}</li>
    <li>Comments affected: ${report.summary.totalCommentsAffected}</li>
    <li>Parts modified: ${escapeHtml(report.summary.partsModified.join(", ") || "none")}</li>
  </ul>

  <h2>Authors replaced</h2>
  <table>
    <thead><tr><th>Original</th><th>Replacement</th><th>Tracked changes</th><th>Comments</th><th>Initials</th></tr></thead>
    <tbody>${authorRows || "<tr><td colspan=\"5\">None</td></tr>"}</tbody>
  </table>

  <h2>Integrity verification</h2>
  <table>
    <thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
    <tbody>${integrityRows}</tbody>
  </table>

  <h2>Ancillary metadata detected (not modified)</h2>
  ${ancillaryList}

  <h2>Unclassified w:author hits</h2>
  ${unclassifiedList}

  <p class="note">${escapeHtml(report.futureOptionsNote)}</p>
</body>
</html>`;
}
