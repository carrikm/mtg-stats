import { useId } from 'react'

// A text box with a dropdown of existing deck names. Typing a name that isn't
// listed adds that deck to the database when the match is submitted.
export default function DeckInput({ label, value, onChange, options, error }) {
  const listId = useId()
  const errorId = useId()
  const isNew = value.trim() && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase())
  return (
    <label className="field">
      {label}
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pick from the list or type a new deck"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : (
        isNew && <span className="hint">New deck. It will be added when you submit.</span>
      )}
    </label>
  )
}
