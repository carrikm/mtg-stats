import { useId } from 'react'
import { HAND_SIZES } from '../stats'

const PLAY_OPTIONS = [
  ['play', 'Play'],
  ['draw', 'Draw'],
]

const WINNER_OPTIONS = [
  ['win', 'Me'],
  ['loss', 'Opponent'],
  ['draw', 'Draw'],
]

function FieldError({ message }) {
  return message ? <span className="field-error">{message}</span> : null
}

function RadioGroup({ legend, name, options, value, onChange, error, disabled }) {
  return (
    <fieldset className="radio-group" aria-invalid={Boolean(error)} disabled={disabled}>
      <legend>{legend}</legend>
      <div className="radio-row">
        {options.map(([v, text]) => (
          <label key={v} className="radio">
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {text}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  )
}

// Starting hand size, 7 down to 0. Defaults to 7 (no mulligan).
function HandSelect({ label, value, onChange, error }) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}>
        {HAND_SIZES.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <FieldError message={error} />
    </label>
  )
}

// One game's inputs. errors is keyed like "g1.play"; optional marks Game 3.
export default function GameFields({ number, game, onChange, errors, optional, locked }) {
  const name = useId()
  const err = (f) => errors[`g${number}.${f}`]
  const set = (field) => (value) => onChange({ ...game, [field]: value })

  return (
    <fieldset className={`card game${locked ? ' locked' : ''}`} disabled={locked}>
      <legend>
        Game {number}
        {optional && <span className="muted"> (optional)</span>}
      </legend>
      {locked && <p className="hint">The match was decided 2–0, so there&apos;s no Game 3.</p>}
      {optional && !locked && (
        <p className="hint">Leave Play/Draw and the winner blank if it wasn&apos;t played. If you fill it in, fill in all of it.</p>
      )}

      <div className="game-grid">
        <RadioGroup
          legend="I was on the"
          name={`${name}-play`}
          options={PLAY_OPTIONS}
          value={game.play}
          onChange={set('play')}
          error={err('play')}
        />
        <HandSelect label="My starting hand" value={game.myHand} onChange={set('myHand')} error={err('myHand')} />
        <HandSelect
          label="Opponent's starting hand"
          value={game.oppHand}
          onChange={set('oppHand')}
          error={err('oppHand')}
        />
        <RadioGroup
          legend="Who won?"
          name={`${name}-result`}
          options={WINNER_OPTIONS}
          value={game.result}
          onChange={set('result')}
          error={err('result')}
        />
      </div>

      <label className="field">
        Comments
        <textarea rows={2} value={game.comments} onChange={(e) => set('comments')(e.target.value)} />
      </label>
    </fieldset>
  )
}
