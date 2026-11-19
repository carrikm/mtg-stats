import { Link, useSearchParams } from 'react-router'
import DeckTable from '../components/DeckTable'
import FormatSelect from '../components/FormatSelect'
import LoadState from '../components/LoadState'
import StatTiles from '../components/StatTiles'
import { filterMatches, topDecks } from '../stats'

// The format filter lives in the URL (?format=…) and is carried into Breakdown links.
export default function Dashboard({ matches, loadError, retry }) {
  const [params, setParams] = useSearchParams()
  const format = params.get('format') ?? ''

  if (!matches) return <LoadState loadError={loadError} retry={retry} />

  if (matches.length === 0) {
    return (
      <div className="card notice">
        <h1>No matches yet</h1>
        <p>
          <Link to="/new">Log your first match</Link> and your stats will show up here.
        </p>
      </div>
    )
  }

  const filtered = filterMatches(matches, { format })
  const statsUrl = (extra = {}) => `/stats?${new URLSearchParams({ ...(format && { format }), ...extra })}`

  return (
    <>
      <h1>Dashboard</h1>
      <div className="filters card">
        <FormatSelect matches={matches} value={format} onChange={(v) => setParams(v ? { format: v } : {})} />
      </div>
      {filtered.length === 0 ? (
        <p className="card notice">No matches in {format} yet.</p>
      ) : (
        <>
          <StatTiles matches={filtered} />
          <section className="card">
            <h2>{format ? `Most played ${format} decks` : 'Most played decks'}</h2>
            <DeckTable rows={topDecks(filtered, 5)} linkFor={(name) => statsUrl({ my: name })} />
            <p className="table-foot">
              <Link to={statsUrl()}>See every deck and matchup</Link>
            </p>
          </section>
        </>
      )}
    </>
  )
}
