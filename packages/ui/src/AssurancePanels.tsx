import type { IntegrityCheck } from "@firm-author/core";

type IntegrityChecksProps = {
  integrity: IntegrityCheck;
};

function integrityDetail(
  integrity: IntegrityCheck,
  keyword: string,
): { before: number; after: number } | undefined {
  const row = integrity.details.find((d) =>
    d.label.toLowerCase().includes(keyword),
  );
  if (!row) return undefined;
  return { before: row.before, after: row.after };
}

export function IntegrityChecks({ integrity }: IntegrityChecksProps) {
  const comments = integrityDetail(integrity, "comment");
  const tracked = integrityDetail(integrity, "tracked");

  const items = [
    {
      ok: integrity.bodyTextUnchanged,
      label: integrity.bodyTextUnchanged
        ? "Document text is unchanged"
        : "Document text differs from the original",
      detail: integrity.bodyTextUnchanged
        ? "Only author names and initials were updated."
        : "Review the document in Word before sharing.",
    },
    {
      ok: integrity.commentCountUnchanged,
      label: integrity.commentCountUnchanged
        ? `${comments?.after ?? 0} comment${comments?.after === 1 ? "" : "s"} preserved`
        : "Comment count changed",
      detail: integrity.commentCountUnchanged
        ? "The same comments are still in the document."
        : `${comments?.before ?? 0} originally, ${comments?.after ?? 0} after processing.`,
    },
    {
      ok: integrity.trackedChangeCountUnchanged,
      label: integrity.trackedChangeCountUnchanged
        ? `${tracked?.after ?? 0} tracked change${tracked?.after === 1 ? "" : "s"} preserved`
        : "Tracked-change count changed",
      detail: integrity.trackedChangeCountUnchanged
        ? "Insertions, deletions, and formatting marks are intact."
        : `${tracked?.before ?? 0} originally, ${tracked?.after ?? 0} after processing.`,
    },
  ];

  return (
    <div className="integrity-checks">
      <p className="integrity-checks__lead">
        Automatic checks confirm the document content was not altered.
      </p>
      <ul className="integrity-checks__list">
        {items.map((item) => (
          <li
            key={item.label}
            className={`integrity-checks__item${item.ok ? " integrity-checks__item--pass" : " integrity-checks__item--fail"}`}
          >
            <span className="integrity-checks__status" aria-hidden>
              {item.ok ? "✓" : "!"}
            </span>
            <span className="integrity-checks__text">
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
