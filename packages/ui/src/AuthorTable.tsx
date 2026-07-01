import type { ScanResult } from "@firm-author/core";

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
                onChange={onToggleSelectAll}
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
                  onChange={() => onToggleAuthor(a.author)}
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
