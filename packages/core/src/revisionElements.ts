import type { HitClassification } from "./types.js";

/** Known WordprocessingML revision/change elements carrying w:author */
export const KNOWN_REVISION_ELEMENTS = new Set([
  "ins",
  "del",
  "moveFrom",
  "moveTo",
  "rPrChange",
  "pPrChange",
  "tblPrChange",
  "tblPrExChange",
  "trPrChange",
  "tcPrChange",
  "sectPrChange",
  "numberingChange",
  "cellIns",
  "cellDel",
  "cellMerge",
  "customXmlInsRangeStart",
  "customXmlDelRangeStart",
  "customXmlMoveFromRangeStart",
  "customXmlMoveToRangeStart",
  "moveFromRangeStart",
  "moveToRangeStart",
]);

export function classifyElement(
  localName: string,
  part: string,
): HitClassification {
  if (localName === "comment" && part.endsWith("comments.xml")) {
    return "comment";
  }
  if (KNOWN_REVISION_ELEMENTS.has(localName)) {
    return "trackedChange";
  }
  return "unclassified";
}

export function isKnownRevisionElement(localName: string): boolean {
  return KNOWN_REVISION_ELEMENTS.has(localName);
}

export function isRewriteTarget(
  localName: string,
  part: string,
): boolean {
  const classification = classifyElement(localName, part);
  return classification === "trackedChange" || classification === "comment";
}
