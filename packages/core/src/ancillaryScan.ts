import type JSZip from "jszip";
import type { AncillaryFinding, AuthorHit } from "./types.js";
import { findTagsWithAuthor, findExtensionDatesOnTag } from "./xmlReplace.js";

const PEOPLE_AUTHOR_RE = /w15:author\s*=\s*"([^"]*)"/g;
const CORE_CREATOR_RE = /<dc:creator>([^<]*)<\/dc:creator>/i;
const CORE_LAST_MODIFIED_RE = /<cp:lastModifiedBy>([^<]*)<\/cp:lastModifiedBy>/i;

function visibleAuthorSet(hits: AuthorHit[]): Set<string> {
  const set = new Set<string>();
  for (const hit of hits) {
    if (hit.classification !== "unclassified") {
      set.add(hit.authorValue.toLowerCase());
    }
  }
  return set;
}

function matchesVisible(author: string, visible: Set<string>): boolean {
  return visible.has(author.toLowerCase());
}

export function scanPeopleXml(
  xml: string,
  visibleAuthors: Set<string>,
): AncillaryFinding[] {
  const findings: AncillaryFinding[] = [];
  const authors: string[] = [];
  PEOPLE_AUTHOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PEOPLE_AUTHOR_RE.exec(xml)) !== null) {
    authors.push(m[1]);
  }

  const matching = authors.filter((a) => matchesVisible(a, visibleAuthors));
  if (matching.length > 0) {
    findings.push({
      part: "word/people.xml",
      kind: "people",
      description:
        "Author registry entries detected in people.xml (not rewritten in MVP)",
      matchingAuthors: matching,
      attributeOrElement: "w15:person/@w15:author",
    });
  }

  if (/w15:userId\s*=/.test(xml) || /w15:providerId\s*=/.test(xml)) {
    findings.push({
      part: "word/people.xml",
      kind: "people",
      description:
        "Presence info (w15:userId / w15:providerId) detected — not rewritten in MVP",
      matchingAuthors: matching,
      attributeOrElement: "w15:presenceInfo",
    });
  }

  return findings;
}

export function scanCoreXml(
  xml: string,
  visibleAuthors: Set<string>,
): AncillaryFinding[] {
  const findings: AncillaryFinding[] = [];
  const creator = xml.match(CORE_CREATOR_RE)?.[1];
  const lastMod = xml.match(CORE_LAST_MODIFIED_RE)?.[1];
  const matching: string[] = [];

  if (creator && matchesVisible(creator, visibleAuthors)) matching.push(creator);
  if (lastMod && matchesVisible(lastMod, visibleAuthors)) matching.push(lastMod);

  if (matching.length > 0) {
    findings.push({
      part: "docProps/core.xml",
      kind: "coreProps",
      description:
        "Document creator / last modified by matches visible author (not rewritten in MVP)",
      matchingAuthors: [...new Set(matching)],
      attributeOrElement: "dc:creator / cp:lastModifiedBy",
    });
  }
  return findings;
}

export function scanCommentExtensionPart(
  part: string,
  xml: string,
  visibleAuthors: Set<string>,
): AncillaryFinding[] {
  const findings: AncillaryFinding[] = [];
  const authorLike = /author\s*=\s*"([^"]*)"/gi;
  const dateLike = /(?:[\w]+:)?[\w]*[Dd]ate[\w]*\s*=\s*"([^"]*)"/g;

  const authors: string[] = [];
  let m: RegExpExecArray | null;
  authorLike.lastIndex = 0;
  while ((m = authorLike.exec(xml)) !== null) {
    authors.push(m[1]);
  }

  const matchingAuthors = authors.filter((a) =>
    matchesVisible(a, visibleAuthors),
  );

  const dates: string[] = [];
  dateLike.lastIndex = 0;
  while ((m = dateLike.exec(xml)) !== null) {
    dates.push(m[0].split("=")[0].trim());
  }

  if (matchingAuthors.length > 0 || dates.length > 0) {
    findings.push({
      part,
      kind: "commentExtension",
      description:
        "Modern comment extension metadata detected (inspect-only in MVP)",
      matchingAuthors: [...new Set(matchingAuthors)],
      attributeOrElement: dates.length
        ? dates.join(", ")
        : "comment extension part",
    });
  }

  return findings;
}

export function scanAncillaryParts(
  zip: JSZip,
  hits: AuthorHit[],
  readPart: (path: string) => Promise<string | null>,
): Promise<AncillaryFinding[]> {
  const visible = visibleAuthorSet(hits);
  const inspectPaths = [
    "word/people.xml",
    "word/commentsExtended.xml",
    "word/commentsIds.xml",
    "word/commentsExtensible.xml",
    "docProps/core.xml",
  ];

  return (async () => {
    const findings: AncillaryFinding[] = [];
    for (const path of inspectPaths) {
      if (!zip.file(path)) continue;
      const xml = await readPart(path);
      if (!xml) continue;

      if (path === "word/people.xml") {
        findings.push(...scanPeopleXml(xml, visible));
      } else if (path === "docProps/core.xml") {
        findings.push(...scanCoreXml(xml, visible));
      } else {
        findings.push(...scanCommentExtensionPart(path, xml, visible));
      }
    }
    return findings;
  })();
}

export function detectExtensionDatesInPart(
  xml: string,
  part: string,
  hits: AuthorHit[],
): AuthorHit[] {
  const extensionHits: AuthorHit[] = [];
  const tags = findTagsWithAuthor(xml);

  for (const tag of tags) {
    const extDates = findExtensionDatesOnTag(tag.fullMatch);
    for (const attr of extDates) {
      extensionHits.push({
        part,
        elementLocalName: tag.localName,
        attribute: "date",
        authorValue: tag.author!,
        classification:
          tag.localName === "comment" ? "comment" : "trackedChange",
        id: tag.id,
        extensionAttribute: attr,
      });
    }
  }
  return extensionHits;
}

export { visibleAuthorSet };
