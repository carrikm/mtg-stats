// Pure functions for match results, win rates, and form validation.
// A "match" here is the shape returned by fetchMatches() in api.js:
//   { id, createdAt, result, format, myDeck, oppDeck, games: [{ gameNumber, onPlay, myHand, oppHand, result, comments }] }

export const RESULTS = ['win', 'loss', 'draw']

export const RESULT_LABELS = { win: 'Wins', loss: 'Losses', draw: 'Draws' }

// Whoever won more games takes the match; equal counts are a draw.
export function matchResult(results) {
  const wins = results.filter((r) => r === 'win').length
  const losses = results.filter((r) => r === 'loss').length
  if (wins > losses) return 'win'
  if (losses > wins) return 'loss'
  return 'draw'
}

// Tally a list of 'win' | 'loss' | 'draw'. rate is wins / total, or null when empty.
export function record(results) {
  const rec = { win: 0, loss: 0, draw: 0 }
  for (const r of results) rec[r]++
  const total = rec.win + rec.loss + rec.draw
  return { ...rec, total, rate: total ? rec.win / total : null }
}

export function formatRate(rec) {
  return rec.rate === null ? '—' : `${Math.round(rec.rate * 100)}%`
}

export function formatRecord(rec) {
  return `${rec.win}–${rec.loss}–${rec.draw}`
}

const gameOne = (m) => m.games.find((g) => g.gameNumber === 1)

export function summarize(matches) {
  const games = matches.flatMap((m) => m.games)
  return {
    matches: record(matches.map((m) => m.result)),
    games: record(games.map((g) => g.result)),
    gamesOnPlay: record(games.filter((g) => g.onPlay).map((g) => g.result)),
    gamesOnDraw: record(games.filter((g) => !g.onPlay).map((g) => g.result)),
    // Match-level play/draw uses who was on the play in Game 1 (the die roll).
    matchesOnPlay: record(matches.filter((m) => gameOne(m)?.onPlay).map((m) => m.result)),
    matchesOnDraw: record(matches.filter((m) => gameOne(m) && !gameOne(m).onPlay).map((m) => m.result)),
  }
}

// Group matches by 'myDeck' or 'oppDeck'. Most played first, then by name.
export function groupBy(matches, key) {
  const groups = new Map()
  for (const m of matches) {
    if (!groups.has(m[key])) groups.set(m[key], [])
    groups.get(m[key]).push(m.result)
  }
  return [...groups]
    .map(([name, results]) => ({ name, ...record(results) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export function topDecks(matches, n = 5) {
  return groupBy(matches, 'myDeck').slice(0, n)
}

// Empty filter values mean "all".
export function filterMatches(matches, { format = '', myDeck = '', oppDeck = '' } = {}) {
  return matches.filter(
    (m) =>
      (!format || m.format === format) && (!myDeck || m.myDeck === myDeck) && (!oppDeck || m.oppDeck === oppDeck),
  )
}

// Formats offered to every user before they've logged anything. Picking one saves it
// to that user's own formats the first time they submit a match with it.
export const DEFAULT_FORMATS = ['Legacy', 'Standard', 'Pioneer', 'Modern', 'Vintage']

// Combine preset names with the user's saved ones, ignoring case. The user's own
// spelling wins, so a saved "legacy" isn't listed twice. Sorted by name.
export function mergeNames(defaults, saved) {
  const byKey = new Map(defaults.map((n) => [n.toLowerCase(), n]))
  for (const n of saved) byKey.set(n.toLowerCase(), n)
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

// Starting hand sizes for the dropdowns, from no mulligan down. Values are strings
// to match the form state.
export const HAND_SIZES = ['7', '6', '5', '4', '3', '2', '1', '0']

export const emptyGame = () => ({ play: '', myHand: '7', oppHand: '7', result: '', comments: '' })

export const emptyForm = () => ({ format: '', myDeck: '', oppDeck: '', games: [emptyGame(), emptyGame(), emptyGame()] })

// Hand sizes always have a value (7 by default), so only these show Game 3 was played.
const GAME_STARTED_FIELDS = ['play', 'result']

const hasValue = (v) => String(v).trim() !== ''

// True when Games 1 and 2 already settle the match (2-0 either way).
export function decidedAfterTwo(games) {
  const [a, b] = games
  return a.result !== 'draw' && a.result !== '' && a.result === b.result
}

function validHandSize(v) {
  const s = String(v).trim()
  return /^\d+$/.test(s) && Number(s) <= 7
}

// Returns { errors, payload }. errors maps field keys ("myDeck", "g1.play", …)
// to messages; payload is ready for submitMatch() when errors is empty.
export function validateMatchForm(form) {
  const errors = {}
  if (!form.format.trim()) errors.format = 'Choose or type a format.'
  if (!form.myDeck.trim()) errors.myDeck = 'Choose or type your deck.'
  if (!form.oppDeck.trim()) errors.oppDeck = "Choose or type your opponent's deck."

  const played = []
  form.games.forEach((game, i) => {
    const n = i + 1
    if (n === 3) {
      // Game 3 is optional, but a partly filled Game 3 would skew the stats.
      const started = GAME_STARTED_FIELDS.some((f) => hasValue(game[f]))
      if (!started) return
      if (decidedAfterTwo(form.games)) {
        errors['g3.result'] = 'The match was decided 2–0, so Game 3 should be left blank.'
        return
      }
    }
    if (!game.play) errors[`g${n}.play`] = 'Pick Play or Draw.'
    for (const f of ['myHand', 'oppHand']) {
      if (!hasValue(game[f])) errors[`g${n}.${f}`] = 'Required.'
      else if (!validHandSize(game[f])) errors[`g${n}.${f}`] = 'Enter a whole number from 0 to 7.'
    }
    if (!game.result) errors[`g${n}.result`] = 'Pick who won.'
    played.push({ n, game })
  })

  const payload = {
    format: form.format.trim(),
    myDeck: form.myDeck.trim(),
    oppDeck: form.oppDeck.trim(),
    games: played.map(({ n, game }) => ({
      game_number: n,
      on_play: game.play === 'play',
      my_hand_size: Number(game.myHand),
      opp_hand_size: Number(game.oppHand),
      result: game.result,
      comments: game.comments.trim() || null,
    })),
  }
  return { errors, payload }
}
