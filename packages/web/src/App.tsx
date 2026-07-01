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
import { StepNav, IntegrityChecks } from "./components/StepNav";
import { type StepId } from "./steps";

const PRESET_KEY = "firm-author-preset";

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

function savePreset(preset: Preset) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(preset));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function baseName(filename: string): string {
  return filename.replace(/\.docx$/i, "");
}

function todayDatetimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function activeStep(
  scan: ScanResult | null,
  result: AnonymiseResult | null,
): StepId {
  if (result) return "results";
  if (scan) return "configure";
  return "upload";
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
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
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    savePreset(preset);
  }, [preset]);

  const unlocked = useMemo(() => {
    const s = new Set<StepId>(["upload"]);
    if (scan) s.add("configure");
    if (result) s.add("results");
    return s;
  }, [scan, result]);

  const progressStep = activeStep(scan, result);
  const [viewStep, setViewStep] = useState<StepId>("upload");

  useEffect(() => {
    setViewStep(progressStep);
  }, [progressStep]);

  const goToStep = useCallback((id: StepId) => {
    setViewStep(id);
    if (window.matchMedia("(max-width: 899px)").matches) {
      requestAnimationFrame(() => {
        document.getElementById(`step-${id}`)?.scrollIntoView({
          behavior: "smooth",
          block: id === "upload" ? "start" : "center",
        });
      });
    }
  }, []);

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

  const processFile = useCallback(async (f: File) => {
    setError(null);
    setResult(null);
    setAudit(null);
    if (!f.name.toLowerCase().endsWith(".docx")) {
      setError("Please upload a .docx file.");
      return;
    }
    setLoading(true);
    try {
      const bytes = await f.arrayBuffer();
      const scanResult = await scanAuthors(bytes);
      if (
        scanResult.authors.length === 0 &&
        scanResult.unclassified.length === 0
      ) {
        setError("No authors detected in this document.");
      }
      setFile(f);
      setFileBytes(bytes);
      setScan(scanResult);
      setSelected(new Set());
      goToStep("configure");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read document.");
      setFile(null);
      setFileBytes(null);
      setScan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) void processFile(f);
    },
    [processFile],
  );

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
    if (allAuthorsSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scan.authors.map((a) => a.author)));
    }
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
    if (!fileBytes || !scan) return;
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one author to replace.");
      goToStep("configure");
      return;
    }
    const timestampPolicy = buildTimestampPolicy();
    if (!timestampPolicy) {
      setError("Choose a valid timestamp.");
      return;
    }
    setLoading(true);
    try {
      const anonResult = await anonymiseAuthors(fileBytes, {
        authorsToReplace: [...selected],
        replacementAuthor: preset.replacementAuthor,
        replacementInitials: preset.replacementInitials,
        timestampPolicy,
      });
      const report = generateAuditReport(anonResult);
      setResult(anonResult);
      setAudit(report);
      goToStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anonymisation failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadDocx = () => {
    if (!result || !file) return;
    const blob = new Blob([new Uint8Array(result.docxBytes)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    downloadBlob(blob, `${baseName(file.name)}-anonymised.docx`);
  };

  const integrityFailed =
    result &&
    (!result.integrity.bodyTextUnchanged ||
      !result.integrity.commentCountUnchanged ||
      !result.integrity.trackedChangeCountUnchanged);

  return (
    <div className="shell">
      <header className="site-header">
        <div className="site-header__inner">
          <h1 className="site-header__brand">Firm Author</h1>
          <p className="privacy-strip">
            <span className="privacy-strip__icon" aria-hidden />
            Processed locally in your browser. Never uploaded.
          </p>
        </div>
      </header>

      <div className="content-layout">
        <aside className="step-rail">
          <StepNav
            visible={viewStep}
            progress={progressStep}
            unlocked={unlocked}
            onNavigate={goToStep}
          />
        </aside>

        <div className="content-body">
          <main className={`main main--${viewStep}`}>
        <div className="hero">
          <h2 className="hero__title">
            Anonymise document authors before sharing externally.
          </h2>
          <p className="hero__lead">
            Replace internal tracked-change and comment authors with your firm
            identity. Tracked changes and comments stay intact.
          </p>
        </div>

        <section id="step-upload" className="section">
          <div className="panel">
            <div className="panel__header">
              <span className="panel__step">Step 1</span>
              <h3 className="panel__title">Upload document</h3>
            </div>
            <div
              className={`dropzone${dragOver ? " dropzone--active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  document.getElementById("file-input")?.click();
              }}
            >
              <input
                id="file-input"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void processFile(f);
                }}
              />
              {file ? (
                <>
                  <p className="dropzone__file">{file.name}</p>
                  <p className="dropzone__meta">
                    {(file.size / 1024).toFixed(1)} KB · Click to replace
                  </p>
                </>
              ) : (
                <p className="dropzone__label">
                  Drop a .docx file here, or click to browse
                </p>
              )}
            </div>
            {loading && !scan && (
              <p className="loading-text">Scanning document…</p>
            )}
            {error && !scan && (
              <div className="alert alert--error" role="alert">
                {error}
              </div>
            )}
          </div>
        </section>

        {scan && (
          <section id="step-configure" className="section">
            <div className="panel">
              <div className="panel__header">
                <span className="panel__step">Step 2</span>
                <h3 className="panel__title">Configure anonymisation</h3>
              </div>

              <h4 className="panel__subheading">Authors to replace</h4>

              {scan.authors.length === 0 ? (
                <p className="field-hint">No classified authors found.</p>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input
                            type="checkbox"
                            checked={allAuthorsSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someAuthorsSelected;
                            }}
                            onChange={toggleSelectAll}
                            aria-label="Select all authors"
                          />
                        </th>
                        <th scope="col">Author</th>
                        <th scope="col">Tracked</th>
                        <th scope="col">Comments</th>
                        <th scope="col">Initials</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scan.authors.map((a) => (
                        <tr key={a.author}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(a.author)}
                              onChange={() => toggleAuthor(a.author)}
                              aria-label={`Select ${a.author}`}
                            />
                          </td>
                          <td>{a.author}</td>
                          <td>{a.trackedChangeCount}</td>
                          <td>{a.commentCount}</td>
                          <td>{a.initials.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {scan.unclassified.length > 0 && (
                <div className="alert alert--warn">
                  <strong>Unclassified metadata</strong> —{" "}
                  {scan.unclassified.length} element
                  {scan.unclassified.length !== 1 ? "s" : ""} with{" "}
                  <code>w:author</code> not counted as tracked changes:
                  <ul>
                    {scan.unclassified.map((u, i) => (
                      <li key={i}>
                        {u.part} · {u.authorValue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <hr className="panel__divider" />

              <h4 className="panel__subheading">Replacement settings</h4>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="replacement-author">Replacement author</label>
                  <input
                    id="replacement-author"
                    type="text"
                    value={preset.replacementAuthor}
                    onChange={(e) =>
                      setPreset((p) => ({
                        ...p,
                        replacementAuthor: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="replacement-initials">
                    Replacement initials
                  </label>
                  <input
                    id="replacement-initials"
                    type="text"
                    value={preset.replacementInitials}
                    onChange={(e) =>
                      setPreset((p) => ({
                        ...p,
                        replacementInitials: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="field-hint">
                Saved locally as your firm preset.
              </p>

              <div className="option-group">
                <span className="option-group__label">Timestamp policy</span>
                <label className="option-row">
                  <input
                    type="radio"
                    name="ts"
                    checked={timestampMode === "preserve"}
                    onChange={() => setTimestampMode("preserve")}
                  />
                  Preserve timestamps
                </label>
                <label className="option-row">
                  <input
                    type="radio"
                    name="ts"
                    checked={timestampMode === "remove"}
                    onChange={() => setTimestampMode("remove")}
                  />
                  Remove timestamps
                </label>
                <label className="option-row">
                  <input
                    type="radio"
                    name="ts"
                    checked={timestampMode === "normalize"}
                    onChange={() => {
                      setTimestampMode("normalize");
                      setNormalizeDatetime((current) =>
                        current || todayDatetimeLocal(),
                      );
                    }}
                  />
                  Choose timestamp
                </label>
              </div>

              {timestampMode === "normalize" && (
                <div className="field" style={{ maxWidth: "280px" }}>
                  <input
                    id="normalize-dt"
                    type="datetime-local"
                    value={normalizeDatetime}
                    onChange={(e) => setNormalizeDatetime(e.target.value)}
                    aria-label="Chosen timestamp"
                  />
                </div>
              )}

              {error && scan && (
                <div className="alert alert--error" role="alert">
                  {error}
                </div>
              )}

              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void runAnonymise()}
                  disabled={loading || selected.size === 0}
                >
                  {loading ? "Processing…" : "Anonymise selected authors"}
                </button>
              </div>
            </div>
          </section>
        )}

        {result && audit && (
          <section id="step-results" className="section">
            <div className="panel">
              <div className="panel__header">
                <span className="panel__step">Step 3</span>
                <h3 className="panel__title">Download</h3>
              </div>

              <p className="results-summary">
                Replaced <strong>{audit.summary.authorsReplaced}</strong>{" "}
                author{audit.summary.authorsReplaced !== 1 ? "s" : ""} ·{" "}
                <strong>{audit.summary.totalTrackedChangesAffected}</strong>{" "}
                tracked changes ·{" "}
                <strong>{audit.summary.totalCommentsAffected}</strong> comments
              </p>

              <IntegrityChecks integrity={result.integrity} />

              {integrityFailed && (
                <div className="alert alert--error" role="alert">
                  One or more checks failed. Open the document in Word and
                  review before sharing externally.
                </div>
              )}

              <div className="btn-row btn-row--center">
                <button type="button" className="btn btn--primary" onClick={downloadDocx}>
                  Download .docx
                </button>
              </div>
            </div>
          </section>
        )}
          </main>

          <footer className="site-footer">
            Firm Author · Local-first · No document data leaves your browser
          </footer>
        </div>
      </div>
    </div>
  );
}
