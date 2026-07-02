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
      <path d="M4 6h9" />
      <path d="M4 10h13" />
      <path d="M4 14h7" />
      <path d="M15 6l3 3-6 6H9v-3l6-6z" />
    </svg>
  );
}

type AuthorTableProps = {
  scan: ScanResult;
  selected: Set<string>;
  allAuthorsSelected: boolean;
  someAuthorsSelected: boolean;
  onToggleAuthor: (author: string) => void;
  onToggleSelectAll: () => void;
};

export function AuthorTable({
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

  return (
    <>
      <table className="data-table data-table--authors">
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
              <span className="visually-hidden">Initials</span>
            </th>
            <th
              scope="col"
              className="data-table__col-count"
              aria-label="Tracked changes"
            >
              <TrackIcon />
            </th>
            <th scope="col" className="data-table__col-count" aria-label="Comments">
              <CommentIcon />
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
                {a.initials.join(", ") || "—"}
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
