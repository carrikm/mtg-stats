import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORMATS,
  decidedAfterTwo,
  emptyForm,
  filterMatches,
  formatRate,
  formatRecord,
  groupBy,
  matchResult,
  mergeNames,
  record,
  summarize,
  topDecks,
  validateMatchForm,
} from './stats'

const game = (gameNumber, onPlay, result) => ({ gameNumber, onPlay, myHand: 7, oppHand: 7, result, comments: null })

const match = (myDeck, oppDeck, ...games) => ({
  id: Math.random(),
  myDeck,
  oppDeck,
  games: games.map(([onPlay, result], i) => game(i + 1, onPlay, result)),
  result: matchResult(games.map(([, r]) => r)),
})

describe('matchResult', () => {
  it('handles 2-0, 2-1, and 1-1', () => {
    expect(matchResult(['win', 'win'])).toBe('win')
    expect(matchResult(['loss', 'win', 'loss'])).toBe('loss')
    expect(matchResult(['win', 'loss'])).toBe('draw')
  })
  it('counts game draws as neither side', () => {
    expect(matchResult(['draw', 'win'])).toBe('win')
    expect(matchResult(['draw', 'loss', 'win'])).toBe('draw')
  })
})

describe('record', () => {
  it('tallies and computes a rate over all results', () => {
    const rec = record(['win', 'win', 'loss', 'draw'])
    expect(rec).toMatchObject({ win: 2, loss: 1, draw: 1, total: 4, rate: 0.5 })
    expect(formatRate(rec)).toBe('50%')
    expect(formatRecord(rec)).toBe('2–1–1')
  })
  it('has no rate when empty', () => {
    expect(formatRate(record([]))).toBe('—')
  })
})

const sample = [
  match('BR Reanimator', 'UG Show and Tell', [true, 'win'], [false, 'win']),
  match('BR Reanimator', 'UG Show and Tell', [false, 'loss'], [true, 'win'], [false, 'loss']),
  match('Mono Red', 'UG Show and Tell', [true, 'win'], [false, 'loss']),
  match('BR Reanimator', 'Dimir Tempo', [false, 'win'], [true, 'win']),
].map((m, i) => ({ ...m, format: i === 2 ? 'Pauper' : 'Legacy' }))

describe('summarize', () => {
  const s = summarize(sample)
  it('computes match and game records', () => {
    expect(s.matches).toMatchObject({ win: 2, loss: 1, draw: 1 })
    expect(s.games).toMatchObject({ win: 6, loss: 3, draw: 0 })
  })
  it('splits games by play/draw', () => {
    expect(s.gamesOnPlay).toMatchObject({ win: 4, loss: 0 })
    expect(s.gamesOnDraw).toMatchObject({ win: 2, loss: 3 })
  })
  it('splits matches by Game 1 play/draw', () => {
    expect(s.matchesOnPlay).toMatchObject({ win: 1, draw: 1, total: 2 })
    expect(s.matchesOnDraw).toMatchObject({ win: 1, loss: 1, total: 2 })
  })
})

describe('grouping and filtering', () => {
  it('ranks decks by matches played', () => {
    expect(topDecks(sample, 5).map((d) => [d.name, d.total])).toEqual([
      ['BR Reanimator', 3],
      ['Mono Red', 1],
    ])
  })
  it('groups by opponent deck', () => {
    expect(groupBy(sample, 'oppDeck')[0]).toMatchObject({ name: 'UG Show and Tell', total: 3 })
  })
  it('filters by opponent overall and by deck pairing', () => {
    expect(filterMatches(sample, { oppDeck: 'UG Show and Tell' })).toHaveLength(3)
    expect(filterMatches(sample, { myDeck: 'BR Reanimator', oppDeck: 'UG Show and Tell' })).toHaveLength(2)
    expect(filterMatches(sample, {})).toHaveLength(4)
    expect(filterMatches(sample, { format: 'Legacy' })).toHaveLength(3)
    expect(filterMatches(sample, { format: 'Pauper', oppDeck: 'UG Show and Tell' })).toHaveLength(1)
  })
})

describe('mergeNames', () => {
  it('lists the default formats for a new user', () => {
    expect(mergeNames(DEFAULT_FORMATS, [])).toEqual(['Legacy', 'Modern', 'Pioneer', 'Standard', 'Vintage'])
  })
  it("adds the user's own formats and keeps their spelling of a default", () => {
    expect(mergeNames(DEFAULT_FORMATS, ['Pauper', 'legacy'])).toEqual([
      'legacy',
      'Modern',
      'Pauper',
      'Pioneer',
      'Standard',
      'Vintage',
    ])
  })
})

function filledForm(results) {
  const form = emptyForm()
  form.format = 'Legacy'
  form.myDeck = ' BR Reanimator '
  form.oppDeck = 'UG Show and Tell'
  results.forEach((r, i) => {
    form.games[i] = { play: i % 2 ? 'draw' : 'play', myHand: '7', oppHand: '6', result: r, comments: '' }
  })
  return form
}

describe('validateMatchForm', () => {
  it('accepts a 2-0 with Game 3 blank', () => {
    const { errors, payload } = validateMatchForm(filledForm(['win', 'win']))
    expect(errors).toEqual({})
    expect(payload.myDeck).toBe('BR Reanimator')
    expect(payload.games).toHaveLength(2)
    expect(payload.games[0]).toMatchObject({ game_number: 1, on_play: true, my_hand_size: 7, opp_hand_size: 6 })
  })
  it('accepts a complete Game 3', () => {
    const { errors, payload } = validateMatchForm(filledForm(['win', 'loss', 'win']))
    expect(errors).toEqual({})
    expect(payload.games).toHaveLength(3)
  })
  it('requires all of Games 1 and 2 except comments', () => {
    const form = emptyForm()
    form.games[0].myHand = ''
    const { errors } = validateMatchForm(form)
    expect(Object.keys(errors).sort()).toEqual(
      ['format', 'myDeck', 'oppDeck', 'g1.play', 'g1.myHand', 'g1.result', 'g2.play', 'g2.result'].sort(),
    )
  })
  it('starts each game with 7-card hands', () => {
    expect(emptyForm().games.every((g) => g.myHand === '7' && g.oppHand === '7')).toBe(true)
  })
  it('treats an untouched Game 3 as not played despite its default hand sizes', () => {
    const { errors, payload } = validateMatchForm(filledForm(['win', 'loss']))
    expect(errors).toEqual({})
    expect(payload.games).toHaveLength(2)
  })
  it('rejects a partly filled Game 3', () => {
    const form = filledForm(['win', 'loss'])
    form.games[2].play = 'play'
    const { errors } = validateMatchForm(form)
    expect(Object.keys(errors)).toEqual(['g3.result'])
  })
  it('ignores a comment-only Game 3', () => {
    const form = filledForm(['win', 'loss'])
    form.games[2].comments = 'Ran out of time'
    const { errors, payload } = validateMatchForm(form)
    expect(errors).toEqual({})
    expect(payload.games).toHaveLength(2)
  })
  it('rejects a Game 3 after a 2-0', () => {
    const form = filledForm(['loss', 'loss', 'win'])
    expect(decidedAfterTwo(form.games)).toBe(true)
    expect(validateMatchForm(form).errors).toHaveProperty('g3.result')
  })
  it('rejects hand sizes outside 0-7', () => {
    const form = filledForm(['win', 'win'])
    form.games[0].myHand = '8'
    form.games[1].oppHand = '5.5'
    const { errors } = validateMatchForm(form)
    expect(Object.keys(errors).sort()).toEqual(['g1.myHand', 'g2.oppHand'])
  })
})
