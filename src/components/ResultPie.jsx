import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { RESULTS, RESULT_LABELS, formatRate } from '../stats'

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '0%')

function SliceTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { key, value } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span className={`swatch ${key}`} />
      {RESULT_LABELS[key]}: <strong>{value}</strong> ({pct(value, total)})
    </div>
  )
}

// Donut of match wins / losses / draws, with the win rate in the middle
// and a legend that carries the counts (the colors never stand alone).
export default function ResultPie({ rec }) {
  const slices = RESULTS.map((key) => ({ key, value: rec[key] })).filter((s) => s.value > 0)
  return (
    <figure className="result-pie">
      <div className="pie-wrap">
        <PieChart width={180} height={180} accessibilityLayer>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="key"
            innerRadius={56}
            outerRadius={86}
            startAngle={90}
            endAngle={-270}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={`var(--${s.key})`} />
            ))}
          </Pie>
          <Tooltip content={<SliceTooltip total={rec.total} />} />
        </PieChart>
        <div className="pie-center" aria-hidden="true">
          <strong>{formatRate(rec)}</strong>
          <span>won</span>
        </div>
      </div>
      <figcaption>
        <ul className="legend">
          {RESULTS.map((key) => (
            <li key={key}>
              <span className={`swatch ${key}`} />
              {RESULT_LABELS[key]}
              <span className="legend-value">
                {rec[key]} <span className="muted">({pct(rec[key], rec.total)})</span>
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
