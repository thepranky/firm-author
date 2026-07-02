type ReplacementPreset = {
  replacementAuthor: string;
  replacementInitials: string;
};

type ReplacementSettingsProps = {
  preset: ReplacementPreset;
  onPresetChange: (preset: ReplacementPreset) => void;
};

export function ReplacementSettings({
  preset,
  onPresetChange,
}: ReplacementSettingsProps) {
  return (
    <>
      <h4 className="section-heading">Replacement settings</h4>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="replacement-author">Replacement author</label>
          <input
            id="replacement-author"
            type="text"
            value={preset.replacementAuthor}
            onChange={(e) =>
              onPresetChange({
                ...preset,
                replacementAuthor: e.target.value,
              })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="replacement-initials">Replacement initials</label>
          <input
            id="replacement-initials"
            type="text"
            value={preset.replacementInitials}
            onChange={(e) =>
              onPresetChange({
                ...preset,
                replacementInitials: e.target.value,
              })
            }
          />
        </div>
      </div>
    </>
  );
}

export type { ReplacementPreset };
