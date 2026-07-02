type TimestampPolicyOptionsProps = {
  timestampMode: "preserve" | "remove";
  onTimestampModeChange: (mode: "preserve" | "remove") => void;
};

export function TimestampPolicyOptions({
  timestampMode,
  onTimestampModeChange,
}: TimestampPolicyOptionsProps) {
  return (
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
    </div>
  );
}
