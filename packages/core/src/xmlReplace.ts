/** Matches opening tags with optional namespace prefix, e.g. <w:ins ...> or <w:comment ...> */
const OPENING_TAG_RE =
  /<(?:[\w]+:)?([\w]+)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;

/** Extract attribute value from tag attributes string; supports w:author and prefixed variants */
export function getAttributeValue(
  attrs: string,
  localName: string,
): string | undefined {
  const re = new RegExp(`(?:[\\w]+:)?${localName}\\s*=\\s*"([^"]*)"`, "i");
  const match = attrs.match(re);
  return match?.[1];
}

export type ParsedTag = {
  fullMatch: string;
  localName: string;
  attrs: string;
  index: number;
  author?: string;
  initials?: string;
  date?: string;
  id?: string;
};

export function findTagsWithAuthor(xml: string): ParsedTag[] {
  const results: ParsedTag[] = [];
  OPENING_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPENING_TAG_RE.exec(xml)) !== null) {
    const localName = match[1];
    const attrs = match[2];
    const author = getAttributeValue(attrs, "author");
    if (!author) continue;

    results.push({
      fullMatch: match[0],
      localName,
      attrs,
      index: match.index,
      author,
      initials: getAttributeValue(attrs, "initials"),
      date: getAttributeValue(attrs, "date"),
      id: getAttributeValue(attrs, "id"),
    });
  }
  return results;
}

/** Find non-w:date date-like attributes on a tag string for reporting */
export function findExtensionDatesOnTag(tag: string): string[] {
  const found: string[] = [];
  const re = /(?:[\w]+:)([\w]*[Dd]ate[\w]*)\s*=\s*"[^"]*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) {
    const attrName = m[0].split("=")[0].trim();
    if (!/^(?:w:)?date$/i.test(attrName.split(":").pop() ?? "")) {
      found.push(attrName);
    }
  }
  return found;
}

export function authorMatches(
  author: string,
  authorsToReplace: string[],
): boolean {
  const lower = author.toLowerCase();
  return authorsToReplace.some((a) => a.toLowerCase() === lower);
}

export function replaceAttributeValue(
  attrs: string,
  localName: string,
  newValue: string,
): string {
  const re = new RegExp(
    `((?:[\\w]+:)?${localName}\\s*=\\s*")([^"]*)(")`,
    "i",
  );
  if (re.test(attrs)) {
    return attrs.replace(re, `$1${escapeXmlAttr(newValue)}$3`);
  }
  return `${attrs} w:${localName}="${escapeXmlAttr(newValue)}"`;
}

export function removeAttribute(attrs: string, localName: string): string {
  const re = new RegExp(
    `\\s*(?:[\\w]+:)?${localName}\\s*=\\s*"[^"]*"`,
    "gi",
  );
  return attrs.replace(re, "");
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type ReplaceOptions = {
  authorsToReplace: string[];
  replacementAuthor: string;
  replacementInitials: string;
  timestampPolicy: import("./types.js").TimestampPolicy;
  shouldRewriteTag: (localName: string, part: string) => boolean;
  part: string;
};

export type ReplaceResult = {
  xml: string;
  modifiedCount: number;
};

export function replaceAuthorsInPart(
  xml: string,
  options: ReplaceOptions,
): ReplaceResult {
  let modifiedCount = 0;
  const tags = findTagsWithAuthor(xml);
  if (tags.length === 0) {
    return { xml, modifiedCount: 0 };
  }

  let result = xml;
  const sorted = [...tags].sort((a, b) => b.index - a.index);

  for (const tag of sorted) {
    if (!options.shouldRewriteTag(tag.localName, options.part)) continue;
    if (!authorMatches(tag.author!, options.authorsToReplace)) continue;

    let newAttrs = tag.attrs;

    newAttrs = replaceAttributeValue(
      newAttrs,
      "author",
      options.replacementAuthor,
    );

    if (
      tag.localName === "comment" &&
      getAttributeValue(newAttrs, "initials") !== undefined
    ) {
      newAttrs = replaceAttributeValue(
        newAttrs,
        "initials",
        options.replacementInitials,
      );
    }

    if (options.timestampPolicy.mode === "remove") {
      newAttrs = removeAttribute(newAttrs, "date");
    } else if (options.timestampPolicy.mode === "normalize") {
      if (getAttributeValue(newAttrs, "date") !== undefined) {
        newAttrs = replaceAttributeValue(
          newAttrs,
          "date",
          options.timestampPolicy.isoDatetime,
        );
      }
    }

    const prefixMatch = tag.fullMatch.match(/^<([\w]+:)?/);
    const prefix = prefixMatch?.[1] ?? "w:";
    const isSelfClosing = tag.fullMatch.trimEnd().endsWith("/>");
    const newTag = isSelfClosing
      ? `<${prefix}${tag.localName}${newAttrs}/>`
      : `<${prefix}${tag.localName}${newAttrs}>`;

    if (newTag !== tag.fullMatch) {
      result =
        result.slice(0, tag.index) +
        newTag +
        result.slice(tag.index + tag.fullMatch.length);
      modifiedCount++;
    }
  }

  return { xml: result, modifiedCount };
}
