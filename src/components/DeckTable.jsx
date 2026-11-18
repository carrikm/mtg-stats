import { Link } from 'react-router'
import { formatRate, formatRecord } from '../stats'

// rows come from groupBy()/topDecks(); linkFor(name) gives the drill-down URL.
export default function DeckTable({ rows, linkFor, label = 'Deck' }) {
  return (
    <table className="deck-table">
      <thead>
        <tr>
          <th scope="col">{label}</th>
          <th scope="col" className="num">
            Matches
          </th>
          <th scope="col" className="num">
            W–L–D
          </th>
          <th scope="col" className="num">
            Win rate
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>
              <Link to={linkFor(row.name)}>{row.name}</Link>
            </td>
            <td className="num">{row.total}</td>
            <td className="num">{formatRecord(row)}</td>
            <td className="num rate-cell">
              <span className="rate-bar" aria-hidden="true">
                <span style={{ width: `${(row.rate ?? 0) * 100}%` }} />
              </span>
              {formatRate(row)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
