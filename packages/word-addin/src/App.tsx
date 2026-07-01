import { useCallback, useEffect, useMemo, useState } from "react";
import {
  scanAuthors,
  anonymiseAuthors,
  generateAuditReport,
  auditReportToJson,
  auditReportToHtml,
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
  DownloadActionBar,
} from "@firm-author/ui";
import { getDocumentBytes, downloadBytes } from "./office/document";

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

  const integrityFailed =
    result &&
    (!result.integrity.bodyTextUnchanged ||
      !result.integrity.commentCountUnchanged ||
      !result.integrity.trackedChangeCountUnchanged);

  return (
    <div className="addin-shell">
      <header className="addin-header">
        <h1>Firm Author</h1>
        <p className="privacy-strip">Processed locally · Word Desktop</p>
      </header>

      <main className="addin-main">
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadDocument()}
            disabled={loading}
          >
            Rescan document
          </button>
        </div>

        {loading && !result && <p className="loading-text">Loading…</p>}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        {scan && !result && (
          <section className="panel">
            <h2>Authors to replace</h2>
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
            <h2>Download</h2>
            <IntegrityChecks integrity={result.integrity} />
            {integrityFailed && (
              <div className="alert alert--error" role="alert">
                Integrity checks failed — review in Word before sharing.
              </div>
            )}
            <DownloadActionBar
              rows={[
                [
                  {
                    id: "docx",
                    label: "Download .docx",
                    variant: "primary",
                    onClick: downloadDocx,
                  },
                ],
                [
                  {
                    id: "audit-json",
                    label: "Audit JSON",
                    onClick: () =>
                      downloadBytes(
                        new TextEncoder().encode(auditReportToJson(audit)),
                        `${base}-audit.json`,
                        "application/json",
                      ),
                  },
                  {
                    id: "audit-html",
                    label: "Audit HTML",
                    onClick: () =>
                      downloadBytes(
                        new TextEncoder().encode(auditReportToHtml(audit)),
                        `${base}-audit.html`,
                        "text/html",
                      ),
                  },
                ],
              ]}
            />
            <p className="field-hint">
              The open document is not modified. Download the anonymised file
              and open it separately to verify the Review pane.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
