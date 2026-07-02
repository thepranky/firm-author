function DownloadIcon() {
  return (
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function OpenIcon() {
  return (
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
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

type AnonymisedDocActionsProps = {
  onDownload: () => void;
  onOpen?: () => void;
  opening?: boolean;
  showOpen?: boolean;
};

export function AnonymisedDocActions({
  onDownload,
  onOpen,
  opening = false,
  showOpen = false,
}: AnonymisedDocActionsProps) {
  return (
    <div className={`btn-row${showOpen ? " btn-row--pair" : " btn-row--center"}`}>
      <button type="button" className="btn btn--primary" onClick={onDownload}>
        <DownloadIcon />
        Download
      </button>
      {showOpen && onOpen && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onOpen}
          disabled={opening}
        >
          <OpenIcon />
          {opening ? "Opening…" : "Open"}
        </button>
      )}
    </div>
  );
}
