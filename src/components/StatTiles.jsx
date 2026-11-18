import { formatRate, formatRecord, summarize } from '../stats'
import ResultPie from './ResultPie'

function RateCell({ rec, unit }) {
  return (
    <td>
      <strong>{formatRate(rec)}</strong>
      <span className="muted">
        {formatRecord(rec)} · {rec.total} {unit}
      </span>
    </td>
  )
}

// Headline stats for a set of matches: match win rate and pie, game win rate,
// and the play/draw split at both game and match level.
export default function StatTiles({ matches }) {
  const s = summarize(matches)
  return (
    <div className="tiles">
      <section className="card overall">
        <h2>Match win rate</h2>
        <div className="overall-body">
          <div>
            <p className="hero">{formatRate(s.matches)}</p>
            <p className="muted">
              {formatRecord(s.matches)} (W–L–D) over {s.matches.total} {s.matches.total === 1 ? 'match' : 'matches'}
            </p>
            <p className="secondary-stat">
              Game win rate <strong>{formatRate(s.games)}</strong>{' '}
              <span className="muted">
                {formatRecord(s.games)} over {s.games.total} games
              </span>
            </p>
          </div>
          <ResultPie rec={s.matches} />
        </div>
      </section>

      <section className="card">
        <h2>On the play vs on the draw</h2>
        <table className="play-draw">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">On the play</th>
              <th scope="col">On the draw</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Games</th>
              <RateCell rec={s.gamesOnPlay} unit="games" />
              <RateCell rec={s.gamesOnDraw} unit="games" />
            </tr>
            <tr>
              <th scope="row">
                Matches
                <span className="muted">by Game 1</span>
              </th>
              <RateCell rec={s.matchesOnPlay} unit="matches" />
              <RateCell rec={s.matchesOnDraw} unit="matches" />
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
