import type { AuthorHit, AuthorSummary, ScanResult } from "./types.js";
import {
  loadDocxZip,
  listRewriteParts,
  readPartAsString,
} from "./parts.js";
import { classifyElement } from "./revisionElements.js";
import { findTagsWithAuthor } from "./xmlReplace.js";
import {
  scanAncillaryParts,
  detectExtensionDatesInPart,
} from "./ancillaryScan.js";

function scanPart(
  part: string,
  xml: string,
): {
  hits: AuthorHit[];
  unclassified: AuthorHit[];
  extensionDates: AuthorHit[];
} {
  const hits: AuthorHit[] = [];
  const unclassified: AuthorHit[] = [];
  const tags = findTagsWithAuthor(xml);

  for (const tag of tags) {
    const classification = classifyElement(tag.localName, part);

    const authorHit: AuthorHit = {
      part,
      elementLocalName: tag.localName,
      attribute: "author",
      authorValue: tag.author!,
      classification,
      id: tag.id,
    };

    if (classification === "unclassified") {
      unclassified.push(authorHit);
    } else {
      hits.push(authorHit);

      if (classification === "comment") {
        if (tag.initials !== undefined) {
          hits.push({
            part,
            elementLocalName: tag.localName,
            attribute: "initials",
            authorValue: tag.author!,
            classification,
            id: tag.id,
          });
        }
        if (tag.date !== undefined) {
          hits.push({
            part,
            elementLocalName: tag.localName,
            attribute: "date",
            authorValue: tag.author!,
            classification,
            id: tag.id,
          });
        }
      } else if (tag.date !== undefined) {
        hits.push({
          part,
          elementLocalName: tag.localName,
          attribute: "date",
          authorValue: tag.author!,
          classification,
          id: tag.id,
        });
      }
    }
  }

  const extensionDates = detectExtensionDatesInPart(xml, part, hits);
  return { hits, unclassified, extensionDates };
}

function buildAuthorSummaries(
  classifiedHits: AuthorHit[],
  rewriteParts: string[],
  zip: Awaited<ReturnType<typeof loadDocxZip>>,
): Promise<AuthorSummary[]> {
  const map = new Map<
    string,
    {
      display: string;
      tracked: number;
      comments: number;
      initials: Set<string>;
    }
  >();

  for (const hit of classifiedHits) {
    const key = hit.authorValue.toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = {
        display: hit.authorValue,
        tracked: 0,
        comments: 0,
        initials: new Set(),
      };
      map.set(key, entry);
    }
    if (hit.classification === "trackedChange" && hit.attribute === "author") {
      entry.tracked++;
    }
    if (hit.classification === "comment" && hit.attribute === "author") {
      entry.comments++;
    }
  }

  return (async () => {
    for (const part of rewriteParts) {
      if (!part.endsWith("comments.xml")) continue;
      const xml = await readPartAsString(zip, part);
      if (!xml) continue;
      for (const tag of findTagsWithAuthor(xml)) {
        if (tag.localName !== "comment" || !tag.initials) continue;
        const key = tag.author!.toLowerCase();
        const entry = map.get(key);
        if (entry) entry.initials.add(tag.initials);
      }
    }

    return [...map.values()]
      .map((e) => ({
        author: e.display,
        trackedChangeCount: e.tracked,
        commentCount: e.comments,
        initials: [...e.initials],
      }))
      .sort((a, b) => a.author.localeCompare(b.author));
  })();
}

export async function scanAuthors(
  docxBytes: ArrayBuffer | Uint8Array,
): Promise<ScanResult> {
  const zip = await loadDocxZip(docxBytes);
  const rewriteParts = listRewriteParts(zip);

  const allHits: AuthorHit[] = [];
  const allUnclassified: AuthorHit[] = [];
  const allExtensionDates: AuthorHit[] = [];

  for (const part of rewriteParts) {
    const xml = await readPartAsString(zip, part);
    if (!xml) continue;
    const { hits, unclassified, extensionDates } = scanPart(part, xml);
    allHits.push(...hits);
    allUnclassified.push(...unclassified);
    allExtensionDates.push(...extensionDates);
  }

  const authors = await buildAuthorSummaries(allHits, rewriteParts, zip);

  const ancillary = await scanAncillaryParts(zip, allHits, (path) =>
    readPartAsString(zip, path),
  );

  return {
    authors,
    hits: allHits,
    unclassified: allUnclassified,
    ancillary,
    extensionDatesDetected: allExtensionDates,
  };
}
