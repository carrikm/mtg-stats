// Dropdown of every format that appears in the logged matches. "" means all formats.
export default function FormatSelect({ matches, value, onChange }) {
  const formats = [...new Set(matches.map((m) => m.format).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return (
    <label className="field">
      Format
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All formats</option>
        {formats.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
  )
}
