import { useSearchParams } from 'react-router'
import DeckTable from '../components/DeckTable'
import FormatSelect from '../components/FormatSelect'
import LoadState from '../components/LoadState'
import MatchList from '../components/MatchList'
import StatTiles from '../components/StatTiles'
import { filterMatches, groupBy } from '../stats'

const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

// Filters live in the URL (?format=…&my=…&opp=…) so dashboard links and the back button work.
export default function Breakdown({ matches, loadError, retry }) {
  const [params, setParams] = useSearchParams()
  const format = params.get('format') ?? ''
  const myDeck = params.get('my') ?? ''
  const oppDeck = params.get('opp') ?? ''

  if (!matches) return <LoadState loadError={loadError} retry={retry} />

  const urlWith = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    return `?${next}`
  }
  const setFilter = (key, value) => setParams(urlWith({ [key]: value }).slice(1))

  const filtered = filterMatches(matches, { format, myDeck, oppDeck })

  return (
    <>
      <h1>Breakdown</h1>
      <div className="filters card">
        <FormatSelect matches={matches} value={format} onChange={(v) => setFilter('format', v)} />
        <label className="field">
          My deck
          <select value={myDeck} onChange={(e) => setFilter('my', e.target.value)}>
            <option value="">All my decks</option>
            {uniqueSorted(matches.map((m) => m.myDeck)).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Opponent&apos;s deck
          <select value={oppDeck} onChange={(e) => setFilter('opp', e.target.value)}>
            <option value="">All opponent decks</option>
            {uniqueSorted(matches.map((m) => m.oppDeck)).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        {(format || myDeck || oppDeck) && (
          <button type="button" className="btn" onClick={() => setParams('')}>
            Clear filters
          </button>
        )}
      </div>

      <p className="subhead">
        {describe(myDeck, oppDeck)}
        {format && ` in ${format}`}
      </p>

      {filtered.length === 0 ? (
        <p className="card notice">No matches for this combination yet.</p>
      ) : (
        <>
          <StatTiles matches={filtered} />

          {!oppDeck && (
            <section className="card">
              <h2>{myDeck ? `${myDeck} by opponent's deck` : "By opponent's deck"}</h2>
              <DeckTable
                label="Opponent's deck"
                rows={groupBy(filtered, 'oppDeck')}
                linkFor={(name) => urlWith({ opp: name })}
              />
            </section>
          )}
          {!myDeck && (
            <section className="card">
              <h2>{oppDeck ? `Against ${oppDeck} by my deck` : 'By my deck'}</h2>
              <DeckTable label="My deck" rows={groupBy(filtered, 'myDeck')} linkFor={(name) => urlWith({ my: name })} />
            </section>
          )}

          <section>
            <h2>Matches</h2>
            <MatchList matches={filtered} />
          </section>
        </>
      )}
    </>
  )
}

function describe(myDeck, oppDeck) {
  if (myDeck && oppDeck) return `${myDeck} against ${oppDeck}`
  if (myDeck) return `${myDeck} against every deck`
  if (oppDeck) return `Every deck of mine against ${oppDeck}`
  return 'All matches'
}
