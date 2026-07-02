import type { ScanResult } from "@firm-author/core";

function CommentIcon() {
  return (
    <svg
      className="data-table__hdr-icon"
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg
      className="data-table__hdr-icon"
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export type AuthorTableVariant = "web" | "addin";

type AuthorTableProps = {
  variant?: AuthorTableVariant;
  scan: ScanResult;
  selected: Set<string>;
  allAuthorsSelected: boolean;
  someAuthorsSelected: boolean;
  onToggleAuthor: (author: string) => void;
  onToggleSelectAll: () => void;
};

export function AuthorTable({
  variant = "web",
  scan,
  selected,
  allAuthorsSelected,
  someAuthorsSelected,
  onToggleAuthor,
  onToggleSelectAll,
}: AuthorTableProps) {
  if (scan.authors.length === 0) {
    return <p className="field-hint">No classified authors found.</p>;
  }

  const isAddin = variant === "addin";
  const tableClassName = isAddin
    ? "data-table data-table--authors data-table--authors-addin"
    : "data-table data-table--authors";

  return (
    <>
      <table className={tableClassName}>
        <thead>
          <tr>
            <th scope="col" className="data-table__col-check">
              <input
                type="checkbox"
                checked={allAuthorsSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someAuthorsSelected;
                }}
                onChange={onToggleSelectAll}
                aria-label="Select all authors"
              />
            </th>
            <th scope="col" className="data-table__col-author">
              Author
            </th>
            <th scope="col" className="data-table__col-initials">
              {isAddin ? (
                <span className="visually-hidden">Initials</span>
              ) : (
                "Initials"
              )}
            </th>
            <th
              scope="col"
              className="data-table__col-count"
              aria-label="Tracked changes"
            >
              {isAddin ? <TrackIcon /> : "Track"}
            </th>
            <th scope="col" className="data-table__col-count" aria-label="Comments">
              {isAddin ? <CommentIcon /> : "Comments"}
            </th>
          </tr>
        </thead>
        <tbody>
          {scan.authors.map((a) => (
            <tr key={a.author}>
              <td className="data-table__col-check">
                <input
                  type="checkbox"
                  checked={selected.has(a.author)}
                  onChange={() => onToggleAuthor(a.author)}
                  aria-label={`Select ${a.author}`}
                />
              </td>
              <td className="data-table__col-author">
                <span className="data-table__author-name" title={a.author}>
                  {a.author}
                </span>
              </td>
              <td className="data-table__col-initials">
                {a.initials.join(", ")}
              </td>
              <td className="data-table__col-count">{a.trackedChangeCount}</td>
              <td className="data-table__col-count">{a.commentCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {scan.unclassified.length > 0 && (
        <div className="alert alert--warn">
          <strong>Unclassified metadata</strong> — {scan.unclassified.length}{" "}
          element
          {scan.unclassified.length !== 1 ? "s" : ""} with <code>w:author</code>{" "}
          not counted as tracked changes:
          <ul>
            {scan.unclassified.map((u, i) => (
              <li key={i}>
                {u.part} · {u.authorValue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
