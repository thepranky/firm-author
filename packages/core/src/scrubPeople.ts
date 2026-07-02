import { authorMatches, getAttributeValue, replaceAttributeValue } from "./xmlReplace.js";

const PERSON_RE =
  /<w15:person\b([^>]*)\/>|<w15:person\b([^>]*)>([\s\S]*?)<\/w15:person>/g;
const PRESENCE_INFO_RE = /\s*<w15:presenceInfo\b[^>]*\/>\s*/g;

type ScrubPeopleOptions = {
  authorsToReplace: string[];
  replacementAuthor: string;
};

type ScrubPeopleResult = {
  xml: string;
  modifiedCount: number;
};

type PersonEntry = {
  fullMatch: string;
  attrs: string;
  content: string;
  author?: string;
};

function parsePeopleEntries(xml: string): PersonEntry[] {
  const entries: PersonEntry[] = [];
  PERSON_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PERSON_RE.exec(xml)) !== null) {
    const attrs = match[1] ?? match[2] ?? "";
    const content = match[3] ?? "";
    entries.push({
      fullMatch: match[0],
      attrs,
      content,
      author: getAttributeValue(attrs, "author"),
    });
  }

  return entries;
}

function buildPersonTag(attrs: string, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return `<w15:person${attrs}/>`;
  }
  return `<w15:person${attrs}>${content}</w15:person>`;
}

export function scrubPeopleXml(
  xml: string,
  options: ScrubPeopleOptions,
): ScrubPeopleResult {
  const entries = parsePeopleEntries(xml);
  if (entries.length === 0) {
    return { xml, modifiedCount: 0 };
  }

  const matchedEntries = entries.filter(
    (entry) => entry.author && authorMatches(entry.author, options.authorsToReplace),
  );
  if (matchedEntries.length === 0) {
    return { xml, modifiedCount: 0 };
  }

  const replacementExists = entries.some(
    (entry) =>
      entry.author?.toLowerCase() === options.replacementAuthor.toLowerCase() &&
      !authorMatches(entry.author, options.authorsToReplace),
  );

  let replacementUsed = replacementExists;
  let modifiedCount = 0;
  let result = xml;

  for (const entry of entries) {
    if (!entry.author || !authorMatches(entry.author, options.authorsToReplace)) {
      continue;
    }

    let replacement = "";
    if (!replacementUsed) {
      const newAttrs = replaceAttributeValue(
        entry.attrs,
        "author",
        options.replacementAuthor,
      );
      const newContent = entry.content.replace(PRESENCE_INFO_RE, "");
      replacement = buildPersonTag(newAttrs, newContent);
      replacementUsed = true;
    }

    if (replacement !== entry.fullMatch) {
      modifiedCount++;
    }
    result = result.replace(entry.fullMatch, replacement);
  }

  return { xml: result, modifiedCount };
}
