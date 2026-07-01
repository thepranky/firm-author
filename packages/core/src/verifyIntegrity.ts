import type { IntegrityCheck } from "./types.js";
import { loadDocxZip, listRewriteParts, readPartAsString } from "./parts.js";
import { findTagsWithAuthor } from "./xmlReplace.js";
import { isKnownRevisionElement } from "./revisionElements.js";

const STORY_PARTS = [
  /^word\/document\.xml$/,
  /^word\/footnotes\.xml$/,
  /^word\/endnotes\.xml$/,
  /^word\/header\d+\.xml$/,
  /^word\/footer\d+\.xml$/,
  /^word\/glossary\/document\.xml$/,
];

function isStoryPart(path: string): boolean {
  return STORY_PARTS.some((p) => p.test(path));
}

function extractBodyText(xml: string): string {
  const texts: string[] = [];
  const re = /<(?:[\w]+:)?t(?:\s[^>]*)?>([^<]*)<\/(?:[\w]+:)?t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    texts.push(m[1]);
  }
  return texts.join("");
}

async function getBodyText(docxBytes: ArrayBuffer | Uint8Array): Promise<string> {
  const zip = await loadDocxZip(docxBytes);
  const parts = listRewriteParts(zip).filter(isStoryPart);
  const chunks: string[] = [];
  for (const part of parts) {
    const xml = await readPartAsString(zip, part);
    if (xml) chunks.push(extractBodyText(xml));
  }
  return chunks.join("");
}

async function countComments(
  docxBytes: ArrayBuffer | Uint8Array,
): Promise<number> {
  const zip = await loadDocxZip(docxBytes);
  const xml = await readPartAsString(zip, "word/comments.xml");
  if (!xml) return 0;
  return (xml.match(/<(?:[\w]+:)?comment\b/g) ?? []).length;
}

async function countTrackedChanges(
  docxBytes: ArrayBuffer | Uint8Array,
): Promise<number> {
  const zip = await loadDocxZip(docxBytes);
  const parts = listRewriteParts(zip);
  let count = 0;
  for (const part of parts) {
    if (part.endsWith("comments.xml")) continue;
    const xml = await readPartAsString(zip, part);
    if (!xml) continue;
    for (const tag of findTagsWithAuthor(xml)) {
      if (isKnownRevisionElement(tag.localName)) count++;
    }
  }
  return count;
}

export async function verifyIntegrity(
  originalBytes: ArrayBuffer | Uint8Array,
  anonymisedBytes: ArrayBuffer | Uint8Array,
): Promise<IntegrityCheck> {
  const [origText, newText] = await Promise.all([
    getBodyText(originalBytes),
    getBodyText(anonymisedBytes),
  ]);
  const [origComments, newComments] = await Promise.all([
    countComments(originalBytes),
    countComments(anonymisedBytes),
  ]);
  const [origTracked, newTracked] = await Promise.all([
    countTrackedChanges(originalBytes),
    countTrackedChanges(anonymisedBytes),
  ]);

  const bodyTextUnchanged = origText === newText;
  const commentCountUnchanged = origComments === newComments;
  const trackedChangeCountUnchanged = origTracked === newTracked;

  return {
    bodyTextUnchanged,
    commentCountUnchanged,
    trackedChangeCountUnchanged,
    details: [
      {
        label: "Body text length (characters)",
        before: origText.length,
        after: newText.length,
      },
      {
        label: "Comment count",
        before: origComments,
        after: newComments,
      },
      {
        label: "Tracked-change element count",
        before: origTracked,
        after: newTracked,
      },
    ],
  };
}
