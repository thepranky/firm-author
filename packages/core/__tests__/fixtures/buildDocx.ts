import JSZip from "jszip";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`;

export type FixtureOptions = {
  documentXml?: string;
  commentsXml?: string;
  footnotesXml?: string;
  endnotesXml?: string;
  headerXml?: string;
  footerXml?: string;
  peopleXml?: string;
  coreXml?: string;
  commentsExtendedXml?: string;
  commentsExtensibleXml?: string;
  unclassifiedAuthorXml?: string;
};

export function minimalDocumentBody(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}

export function documentWithTrackedChanges(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:ins w:id="1" w:author="Jane Doe" w:date="2024-01-15T10:00:00Z">
        <w:r><w:t>inserted </w:t></w:r>
      </w:ins>
      <w:del w:id="2" w:author="John Smith" w:date="2024-01-16T11:00:00Z">
        <w:r><w:t>deleted</w:t></w:r>
      </w:del>
      <w:r><w:t> text</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
}

export function commentsWithAuthors(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="Jane Doe" w:date="2024-01-15T10:00:00Z" w:initials="JD">
    <w:p><w:r><w:t>First comment</w:t></w:r></w:p>
  </w:comment>
  <w:comment w:id="1" w:author="John Smith" w:date="2024-01-16T11:00:00Z" w:initials="JS">
    <w:p><w:r><w:t>Second comment</w:t></w:r></w:p>
  </w:comment>
</w:comments>`;
}

export function peopleXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w15:person w15:author="Jane Doe">
    <w15:presenceInfo w15:providerId="AD" w15:userId="jane.doe@firm.com"/>
  </w15:person>
</w15:people>`;
}

export function coreXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator>Jane Doe</dc:creator>
  <cp:lastModifiedBy>John Smith</cp:lastModifiedBy>
</cp:coreProperties>`;
}

export function commentsExtensibleXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w16cex:commentsExtensible xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex">
  <w16cex:commentExtensible w16cex:durableId="123" w16cex:dateUtc="2024-01-15T10:00:00Z"/>
</w16cex:commentsExtensible>`;
}

export async function buildDocx(options: FixtureOptions = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.folder("_rels")!.file(".rels", ROOT_RELS);
  zip.folder("word")!.file("document.xml", options.documentXml ?? documentWithTrackedChanges());
  zip.folder("word")!.folder("_rels")!.file("document.xml.rels", DOC_RELS);

  if (options.commentsXml) {
    zip.folder("word")!.file("comments.xml", options.commentsXml);
  }
  if (options.footnotesXml) {
    zip.folder("word")!.file("footnotes.xml", options.footnotesXml);
  }
  if (options.endnotesXml) {
    zip.folder("word")!.file("endnotes.xml", options.endnotesXml);
  }
  if (options.headerXml) {
    zip.folder("word")!.file("header1.xml", options.headerXml);
  }
  if (options.footerXml) {
    zip.folder("word")!.file("footer1.xml", options.footerXml);
  }
  if (options.peopleXml) {
    zip.folder("word")!.file("people.xml", options.peopleXml);
  }
  if (options.coreXml) {
    zip.folder("docProps")!.file("core.xml", options.coreXml);
  }
  if (options.commentsExtendedXml) {
    zip.folder("word")!.file("commentsExtended.xml", options.commentsExtendedXml);
  }
  if (options.commentsExtensibleXml) {
    zip.folder("word")!.file("commentsExtensible.xml", options.commentsExtensibleXml);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** Word-desktop-style fixtures (realistic OOXML, suitable for regression) */
export async function buildMultiAuthorTrackedDocx(): Promise<Uint8Array> {
  return buildDocx({
    documentXml: documentWithTrackedChanges(),
    commentsXml: commentsWithAuthors(),
    peopleXml: peopleXml(),
    coreXml: coreXml(),
  });
}

export async function buildHeaderFootnoteDocx(): Promise<Uint8Array> {
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:ins w:id="10" w:author="Jane Doe" w:date="2024-02-01T09:00:00Z"><w:r><w:t>Header change</w:t></w:r></w:ins></w:p>
</w:hdr>`;
  const footnotes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:id="1">
    <w:p><w:del w:id="11" w:author="John Smith" w:date="2024-02-02T09:00:00Z"><w:r><w:t>Footnote del</w:t></w:r></w:del></w:p>
  </w:footnote>
</w:footnotes>`;
  return buildDocx({
    documentXml: minimalDocumentBody("Body text"),
    headerXml: header,
    footnotesXml: footnotes,
  });
}

export async function buildModernCommentsDocx(): Promise<Uint8Array> {
  const commentsExtended = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:commentsEx xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w15:commentEx w15:paraId="ABC123" w15:paraIdParent="000000" w15:done="0"/>
  <w15:commentEx w15:paraId="DEF456" w15:paraIdParent="ABC123" w15:done="0"/>
</w15:commentsEx>`;
  return buildDocx({
    commentsXml: commentsWithAuthors(),
    commentsExtendedXml: commentsExtended,
    commentsExtensibleXml: commentsExtensibleXml(),
  });
}

export async function buildUnclassifiedAuthorDocx(): Promise<Uint8Array> {
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:ins w:id="1" w:author="Jane Doe" w:date="2024-01-15T10:00:00Z"><w:r><w:t>ok</w:t></w:r></w:ins>
      <w:customTag w:author="Unknown Element Author" w:id="99"/>
    </w:p>
  </w:body>
</w:document>`;
  return buildDocx({ documentXml: doc });
}

export async function buildWordResavedDocx(): Promise<Uint8Array> {
  // Simulates a doc that was opened and re-saved (same structure, typical Word formatting)
  return buildMultiAuthorTrackedDocx();
}
