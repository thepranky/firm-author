export type TimestampPolicy =
  | { mode: "preserve" }
  | { mode: "remove" };

export type AnonymiseOptions = {
  authorsToReplace: string[];
  replacementAuthor: string;
  replacementInitials: string;
  timestampPolicy: TimestampPolicy;
};

export type HitClassification = "trackedChange" | "comment" | "unclassified";

export type AuthorHit = {
  part: string;
  elementLocalName: string;
  attribute: "author" | "initials" | "date";
  authorValue: string;
  classification: HitClassification;
  id?: string;
  /** Extension or non-w:date attribute name when detected for reporting */
  extensionAttribute?: string;
};

export type AuthorSummary = {
  author: string;
  trackedChangeCount: number;
  commentCount: number;
  initials: string[];
};

export type AncillaryFinding = {
  part: string;
  kind: "people" | "commentExtension" | "extensionDate" | "coreProps";
  description: string;
  matchingAuthors: string[];
  attributeOrElement?: string;
};

export type ScanResult = {
  authors: AuthorSummary[];
  hits: AuthorHit[];
  unclassified: AuthorHit[];
  ancillary: AncillaryFinding[];
  extensionDatesDetected: AuthorHit[];
};

export type IntegrityCheck = {
  bodyTextUnchanged: boolean;
  commentCountUnchanged: boolean;
  trackedChangeCountUnchanged: boolean;
  details: { before: number; after: number; label: string }[];
};

export type AnonymiseResult = {
  docxBytes: Uint8Array;
  hits: AuthorHit[];
  options: AnonymiseOptions;
  integrity: IntegrityCheck;
  scanBefore: ScanResult;
  scanAfter: ScanResult;
  modifiedParts: string[];
};

export type AuditReport = {
  processedAt: string;
  timestampPolicy: TimestampPolicy;
  replacementAuthor: string;
  replacementInitials: string;
  authors: AuditAuthorEntry[];
  integrity: IntegrityCheck;
  ancillary: AncillaryFinding[];
  unclassified: AuthorHit[];
  extensionDatesDetected: AuthorHit[];
  summary: AuditSummary;
  futureOptionsNote: string;
};

export type AuditAuthorEntry = {
  originalAuthor: string;
  replacementAuthor: string;
  trackedChangeCount: number;
  commentCount: number;
  initialsReplaced: string[];
  locations: AuditLocation[];
};

export type AuditLocation = {
  part: string;
  element: string;
  attribute: string;
  count: number;
};

export type AuditSummary = {
  authorsReplaced: number;
  totalTrackedChangesAffected: number;
  totalCommentsAffected: number;
  partsModified: string[];
};

export const DEFAULT_REPLACEMENT_AUTHOR = "Law Firm LLP";
export const DEFAULT_REPLACEMENT_INITIALS = "LFL";
