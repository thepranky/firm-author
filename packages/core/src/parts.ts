import JSZip from "jszip";

const REWRITE_PATTERNS = [
  /^word\/document\.xml$/,
  /^word\/comments\.xml$/,
  /^word\/footnotes\.xml$/,
  /^word\/endnotes\.xml$/,
  /^word\/numbering\.xml$/,
  /^word\/glossary\/document\.xml$/,
  /^word\/header\d+\.xml$/,
  /^word\/footer\d+\.xml$/,
];

const INSPECT_ONLY_PATTERNS = [
  /^word\/people\.xml$/,
  /^word\/commentsExtended\.xml$/,
  /^word\/commentsIds\.xml$/,
  /^word\/commentsExtensible\.xml$/,
  /^docProps\/core\.xml$/,
];

export function isRewritePart(path: string): boolean {
  return REWRITE_PATTERNS.some((p) => p.test(path));
}

export function isInspectOnlyPart(path: string): boolean {
  return INSPECT_ONLY_PATTERNS.some((p) => p.test(path));
}

export async function loadDocxZip(
  docxBytes: ArrayBuffer | Uint8Array,
): Promise<JSZip> {
  const zip = await JSZip.loadAsync(docxBytes);
  if (!zip.file("word/document.xml")) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  return zip;
}

export function listRewriteParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir && isRewritePart(path))
    .sort();
}

export function listInspectOnlyParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir && isInspectOnlyPart(path))
    .sort();
}

export async function readPartAsString(
  zip: JSZip,
  path: string,
): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async("string");
}

export async function readPartAsUint8Array(
  zip: JSZip,
  path: string,
): Promise<Uint8Array | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async("uint8array");
}

export async function repackDocx(
  originalBytes: ArrayBuffer | Uint8Array,
  modifiedParts: Map<string, string>,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(originalBytes);
  for (const [path, content] of modifiedParts) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function getPartBytes(
  docxBytes: ArrayBuffer | Uint8Array,
  path: string,
): Promise<Uint8Array | null> {
  const zip = await JSZip.loadAsync(docxBytes);
  const file = zip.file(path);
  if (!file) return null;
  return file.async("uint8array");
}
