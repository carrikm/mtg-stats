import { Link } from 'react-router'
import DeckTable from '../components/DeckTable'
import LoadState from '../components/LoadState'
import StatTiles from '../components/StatTiles'
import { topDecks } from '../stats'

export default function Dashboard({ matches, loadError, retry }) {
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

  return (
    <>
      <h1>Dashboard</h1>
      <StatTiles matches={matches} />
      <section className="card">
        <h2>Most played decks</h2>
        <DeckTable
          rows={topDecks(matches, 5)}
          linkFor={(name) => `/stats?${new URLSearchParams({ my: name })}`}
        />
        <p className="table-foot">
          <Link to="/stats">See every deck and matchup</Link>
        </p>
      </section>
    </>
  )
}
