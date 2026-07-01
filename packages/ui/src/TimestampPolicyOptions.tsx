type TimestampPolicyOptionsProps = {
  timestampMode: "preserve" | "remove" | "normalize";
  normalizeDatetime: string;
  onTimestampModeChange: (mode: "preserve" | "remove" | "normalize") => void;
  onNormalizeDatetimeChange: (value: string) => void;
};

export function TimestampPolicyOptions({
  timestampMode,
  normalizeDatetime,
  onTimestampModeChange,
  onNormalizeDatetimeChange,
}: TimestampPolicyOptionsProps) {
  return (
    <>
      <div className="option-group">
        <span className="option-group__label">Timestamp policy</span>
        <label className="option-row">
          <input
            type="radio"
            name="ts"
            checked={timestampMode === "preserve"}
            onChange={() => onTimestampModeChange("preserve")}
          />
          Preserve timestamps
        </label>
        <label className="option-row">
          <input
            type="radio"
            name="ts"
            checked={timestampMode === "remove"}
            onChange={() => onTimestampModeChange("remove")}
          />
          Remove timestamps
        </label>
        <label className="option-row">
          <input
            type="radio"
            name="ts"
            checked={timestampMode === "normalize"}
            onChange={() => onTimestampModeChange("normalize")}
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
            onChange={(e) => onNormalizeDatetimeChange(e.target.value)}
            aria-label="Chosen timestamp"
          />
        </div>
      )}
    </>
  );
}
