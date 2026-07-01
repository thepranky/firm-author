export type DownloadAction = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  title?: string;
};

type DownloadActionBarProps = {
  rows: DownloadAction[][];
};

export function DownloadActionBar({ rows }: DownloadActionBarProps) {
  return (
    <>
      {rows.map((row, i) => (
        <div className="btn-row" key={i}>
          {row.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`btn btn--${action.variant ?? "ghost"}`}
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.title}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
