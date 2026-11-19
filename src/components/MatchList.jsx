const RESULT_TEXT = { win: 'Win', loss: 'Loss', draw: 'Draw' }

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function gameScore(games) {
  const wins = games.filter((g) => g.result === 'win').length
  const losses = games.filter((g) => g.result === 'loss').length
  return `${wins}–${losses}`
}

export default function MatchList({ matches }) {
  return (
    <ol className="match-list">
      {matches.map((m) => (
        <li key={m.id} className="card match">
          <div className="match-head">
            <span className={`badge ${m.result}`}>
              {RESULT_TEXT[m.result]} {gameScore(m.games)}
            </span>
            <span className="match-title">
              {m.myDeck} <span className="muted">vs</span> {m.oppDeck}
            </span>
            {m.format && <span className="muted">{m.format}</span>}
            <time className="muted" dateTime={m.createdAt}>
              {dateFormat.format(new Date(m.createdAt))}
            </time>
          </div>
          <ul className="game-rows">
            {m.games.map((g) => (
              <li key={g.gameNumber}>
                <span className="game-label">G{g.gameNumber}</span>
                <span>{g.onPlay ? 'Play' : 'Draw'}</span>
                <span className="muted">
                  {g.myHand} vs {g.oppHand} cards
                </span>
                <span className={`result-text ${g.result}`}>{RESULT_TEXT[g.result]}</span>
                {g.comments && <span className="comment">{g.comments}</span>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
