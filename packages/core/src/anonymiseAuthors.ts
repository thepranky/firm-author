import type { AnonymiseOptions, AnonymiseResult } from "./types.js";
import {
  loadDocxZip,
  listRewriteParts,
  readPartAsString,
  repackDocx,
} from "./parts.js";
import { isRewriteTarget } from "./revisionElements.js";
import { scrubPeopleXml } from "./scrubPeople.js";
import { replaceAuthorsInPart } from "./xmlReplace.js";
import { scanAuthors } from "./scanAuthors.js";
import { verifyIntegrity } from "./verifyIntegrity.js";

export async function anonymiseAuthors(
  docxBytes: ArrayBuffer | Uint8Array,
  options: AnonymiseOptions,
): Promise<AnonymiseResult> {
  if (options.authorsToReplace.length === 0) {
    throw new Error("No authors selected for replacement");
  }

  const scanBefore = await scanAuthors(docxBytes);
  const zip = await loadDocxZip(docxBytes);
  const rewriteParts = listRewriteParts(zip);
  const modifiedParts = new Map<string, string>();
  const modifiedHits: typeof scanBefore.hits = [];

  for (const part of rewriteParts) {
    const xml = await readPartAsString(zip, part);
    if (!xml) continue;

    const { xml: newXml, modifiedCount } = replaceAuthorsInPart(xml, {
      authorsToReplace: options.authorsToReplace,
      replacementAuthor: options.replacementAuthor,
      replacementInitials: options.replacementInitials,
      timestampPolicy: options.timestampPolicy,
      part,
      shouldRewriteTag: isRewriteTarget,
    });

    if (modifiedCount > 0) {
      modifiedParts.set(part, newXml);
    }
  }

  const peopleXml = await readPartAsString(zip, "word/people.xml");
  if (peopleXml) {
    const { xml: newPeopleXml, modifiedCount } = scrubPeopleXml(peopleXml, {
      authorsToReplace: options.authorsToReplace,
      replacementAuthor: options.replacementAuthor,
    });
    if (modifiedCount > 0) {
      modifiedParts.set("word/people.xml", newPeopleXml);
    }
  }

  const outputBytes = await repackDocx(docxBytes, modifiedParts);
  const scanAfter = await scanAuthors(outputBytes);
  const integrity = await verifyIntegrity(docxBytes, outputBytes);

  // Collect hits that were modified
  for (const hit of scanBefore.hits) {
    const matches = options.authorsToReplace.some(
      (a) => a.toLowerCase() === hit.authorValue.toLowerCase(),
    );
    if (matches && hit.classification !== "unclassified") {
      modifiedHits.push(hit);
    }
  }

  return {
    docxBytes: outputBytes,
    hits: modifiedHits,
    options,
    integrity,
    scanBefore,
    scanAfter,
    modifiedParts: [...modifiedParts.keys()].sort(),
  };
}
