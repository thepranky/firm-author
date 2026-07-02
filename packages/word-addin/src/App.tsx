import { useCallback, useEffect, useMemo, useState } from "react";
import {
  scanAuthors,
  anonymiseAuthors,
  generateAuditReport,
  DEFAULT_REPLACEMENT_AUTHOR,
  DEFAULT_REPLACEMENT_INITIALS,
  type ScanResult,
  type TimestampPolicy,
  type AnonymiseResult,
  type AuditReport,
} from "@firm-author/core";
import {
  AuthorTable,
  ReplacementSettings,
  TimestampPolicyOptions,
  IntegrityChecks,
} from "@firm-author/ui";
import {
  getDocumentBytes,
  downloadBytes,
  openDocumentInWord,
  canOpenDocumentInWord,
} from "./office/document";

const PRESET_KEY = "firm-author-addin-preset";

type Preset = {
  replacementAuthor: string;
  replacementInitials: string;
};

function loadPreset(): Preset {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (raw) return JSON.parse(raw) as Preset;
  } catch {
    /* ignore */
  }
  return {
    replacementAuthor: DEFAULT_REPLACEMENT_AUTHOR,
    replacementInitials: DEFAULT_REPLACEMENT_INITIALS,
  };
}

function todayDatetimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<Preset>(loadPreset);
  const [timestampMode, setTimestampMode] = useState<
    "preserve" | "remove" | "normalize"
  >("preserve");
  const [normalizeDatetime, setNormalizeDatetime] = useState(todayDatetimeLocal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnonymiseResult | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [docName, setDocName] = useState("document");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    localStorage.setItem(PRESET_KEY, JSON.stringify(preset));
  }, [preset]);

  const loadDocument = useCallback(async () => {
    setError(null);
    setResult(null);
    setAudit(null);
    setLoading(true);
    try {
      const bytes = await getDocumentBytes();
      const scanResult = await scanAuthors(bytes);
      setOriginalBytes(bytes);
      setScan(scanResult);
      setSelected(new Set());
      setDocName(Office.context.document.url?.split("/").pop() ?? "document");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read document.");
      setScan(null);
      setOriginalBytes(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const allAuthorsSelected = useMemo(() => {
    if (!scan || scan.authors.length === 0) return false;
    return scan.authors.every((a) => selected.has(a.author));
  }, [scan, selected]);

  const someAuthorsSelected = useMemo(() => {
    if (!scan || scan.authors.length === 0) return false;
    return (
      scan.authors.some((a) => selected.has(a.author)) && !allAuthorsSelected
    );
  }, [scan, selected, allAuthorsSelected]);

  const toggleAuthor = (author: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(author)) next.delete(author);
      else next.add(author);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!scan) return;
    if (allAuthorsSelected) setSelected(new Set());
    else setSelected(new Set(scan.authors.map((a) => a.author)));
  };

  const buildTimestampPolicy = (): TimestampPolicy | null => {
    if (timestampMode === "preserve") return { mode: "preserve" };
    if (timestampMode === "remove") return { mode: "remove" };
    if (!normalizeDatetime) return null;
    const iso = new Date(normalizeDatetime).toISOString();
    if (Number.isNaN(Date.parse(iso))) return null;
    return { mode: "normalize", isoDatetime: iso };
  };

  const runAnonymise = async () => {
    if (!originalBytes || !scan) return;
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one author to replace.");
      return;
    }
    const timestampPolicy = buildTimestampPolicy();
    if (!timestampPolicy) {
      setError("Choose a valid timestamp.");
      return;
    }
    setLoading(true);
    try {
      const anonResult = await anonymiseAuthors(originalBytes, {
        authorsToReplace: [...selected],
        replacementAuthor: preset.replacementAuthor,
        replacementInitials: preset.replacementInitials,
        timestampPolicy,
      });
      const report = generateAuditReport(anonResult);
      setResult(anonResult);
      setAudit(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anonymisation failed.");
    } finally {
      setLoading(false);
    }
  };

  const base = docName.replace(/\.docx$/i, "");

  const downloadDocx = () => {
    if (!result) return;
    downloadBytes(
      result.docxBytes,
      `${base}-anonymised.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  };

  const openDocx = async () => {
    if (!result) return;
    setError(null);
    setOpening(true);
    try {
      await openDocumentInWord(result.docxBytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open document.");
    } finally {
      setOpening(false);
    }
  };

  const showOpenInWord = canOpenDocumentInWord();

  const integrityFailed =
    result &&
    (!result.integrity.bodyTextUnchanged ||
      !result.integrity.commentCountUnchanged ||
      !result.integrity.trackedChangeCountUnchanged);

  return (
    <div className="addin-shell">
      <header className="addin-header">
        <div className="addin-header__row">
          <h1>Firm Author</h1>
          <button
            type="button"
            className="btn btn--ghost btn--rescan"
            onClick={() => void loadDocument()}
            disabled={loading}
            aria-label="Rescan document"
          >
            <svg
              className="btn__icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Rescan
          </button>
        </div>
      </header>

      <main className="addin-main">
        {loading && !result && <p className="loading-text">Loading…</p>}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        {scan && !result && (
          <section className="panel">
            <h2 className="addin-section-heading">Authors to replace</h2>
            <AuthorTable
              scan={scan}
              selected={selected}
              allAuthorsSelected={allAuthorsSelected}
              someAuthorsSelected={someAuthorsSelected}
              onToggleAuthor={toggleAuthor}
              onToggleSelectAll={toggleSelectAll}
            />
            <ReplacementSettings preset={preset} onPresetChange={setPreset} />
            <TimestampPolicyOptions
              timestampMode={timestampMode}
              normalizeDatetime={normalizeDatetime}
              onTimestampModeChange={(mode) => {
                setTimestampMode(mode);
                if (mode === "normalize") {
                  setNormalizeDatetime((c) => c || todayDatetimeLocal());
                }
              }}
              onNormalizeDatetimeChange={setNormalizeDatetime}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={loading || selected.size === 0}
                onClick={() => void runAnonymise()}
              >
                {loading ? "Processing…" : "Anonymise selected authors"}
              </button>
            </div>
          </section>
        )}

        {result && audit && (
          <section className="panel">
            <h2 className="addin-section-heading">Download</h2>
            <IntegrityChecks
              integrity={result.integrity}
              footerNote="The original document has not been modified. Click below to download and open the anonymised file."
            />
            {integrityFailed && (
              <div className="alert alert--error" role="alert">
                Integrity checks failed — review in Word before sharing.
              </div>
            )}
            <div className="btn-row btn-row--stacked">
              <button
                type="button"
                className="btn btn--primary"
                onClick={downloadDocx}
              >
                Download .docx
              </button>
              {showOpenInWord && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void openDocx()}
                  disabled={opening}
                >
                  {opening ? "Opening…" : "Open .docx"}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
