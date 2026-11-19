import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { fetchDeckNames, submitMatch } from '../api'
import DeckInput from '../components/DeckInput'
import GameFields from '../components/GameFields'
import LoginForm from '../components/LoginForm'
import { decidedAfterTwo, emptyForm, emptyGame, validateMatchForm } from '../stats'

export default function NewMatch({ session, onSaved }) {
  if (!session) return <LoginForm />
  return <MatchForm onSaved={onSaved} />
}

function MatchForm({ onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deckNames, setDeckNames] = useState({ formats: [], myDecks: [], oppDecks: [] })
  const [status, setStatus] = useState({ state: 'idle' })
  const formRef = useRef(null)

  const loadDeckNames = () => fetchDeckNames().then(setDeckNames, () => {})
  useEffect(() => {
    loadDeckNames()
  }, [])

  const locked = decidedAfterTwo(form.games)

  function setGame(i, game) {
    setForm((f) => {
      const games = f.games.map((g, j) => (j === i ? game : g))
      // A 2-0 means Game 3 never happened, so clear anything typed there.
      if (decidedAfterTwo(games)) games[2] = emptyGame()
      return { ...f, games }
    })
    setStatus({ state: 'idle' })
  }

  function setDeck(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setStatus({ state: 'idle' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { errors, payload } = validateMatchForm(form)
    setErrors(errors)
    if (Object.keys(errors).length) {
      setStatus({ state: 'invalid' })
      // Let React render the messages, then move focus to the first problem.
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector('[aria-invalid="true"]')
        ;(first?.tagName === 'FIELDSET' ? first.querySelector('input') : first)?.focus()
      })
      return
    }
    setStatus({ state: 'saving' })
    try {
      await submitMatch(payload)
      setForm(emptyForm())
      setStatus({ state: 'saved', summary: `${payload.myDeck} vs ${payload.oppDeck} (${payload.format})` })
      loadDeckNames()
      onSaved()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setStatus({ state: 'error', message: err.message })
    }
  }

  return (
    <form ref={formRef} className="match-form" onSubmit={handleSubmit} noValidate>
      <h1>New Match</h1>

      {status.state === 'saved' && (
        <p className="card success" role="status">
          Saved {status.summary}. <Link to="/">View dashboard</Link>
        </p>
      )}

      <div className="card deck-row">
        <DeckInput
          label="Format"
          noun="format"
          className="field full-row"
          value={form.format}
          onChange={(v) => setDeck('format', v)}
          options={deckNames.formats}
          error={errors.format}
        />
        <DeckInput
          label="My deck"
          value={form.myDeck}
          onChange={(v) => setDeck('myDeck', v)}
          options={deckNames.myDecks}
          error={errors.myDeck}
        />
        <DeckInput
          label="Opponent's deck"
          value={form.oppDeck}
          onChange={(v) => setDeck('oppDeck', v)}
          options={deckNames.oppDecks}
          error={errors.oppDeck}
        />
      </div>

      {form.games.map((game, i) => (
        <GameFields
          key={i}
          number={i + 1}
          game={game}
          onChange={(g) => setGame(i, g)}
          errors={errors}
          optional={i === 2}
          locked={i === 2 && locked}
        />
      ))}

      <div className="submit-row">
        {status.state === 'invalid' && <p className="error">Some fields need attention.</p>}
        {status.state === 'error' && <p className="error">Couldn&apos;t save: {status.message}</p>}
        <button type="submit" className="btn primary" disabled={status.state === 'saving'}>
          {status.state === 'saving' ? 'Submitting…' : 'Submit Results'}
        </button>
      </div>
    </form>
  )
}
