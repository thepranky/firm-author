export type {
  TimestampPolicy,
  AnonymiseOptions,
  HitClassification,
  AuthorHit,
  AuthorSummary,
  AncillaryFinding,
  ScanResult,
  IntegrityCheck,
  AnonymiseResult,
  AuditReport,
  AuditAuthorEntry,
  AuditLocation,
  AuditSummary,
} from "./types.js";

export {
  DEFAULT_REPLACEMENT_AUTHOR,
  DEFAULT_REPLACEMENT_INITIALS,
} from "./types.js";

export { KNOWN_REVISION_ELEMENTS, classifyElement, isRewriteTarget } from "./revisionElements.js";
export { scanAuthors } from "./scanAuthors.js";
export { anonymiseAuthors } from "./anonymiseAuthors.js";
export { verifyIntegrity } from "./verifyIntegrity.js";
export {
  generateAuditReport,
  auditReportToJson,
  auditReportToHtml,
} from "./generateAuditReport.js";
