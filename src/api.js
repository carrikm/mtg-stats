import { supabase } from './supabase'

// Give up on loading after this long rather than showing "Loading…" forever.
const LOAD_TIMEOUT_MS = 15000

async function timed(query) {
  const signal = AbortSignal.timeout(LOAD_TIMEOUT_MS)
  const { data, error } = await query.abortSignal(signal)
  if (signal.aborted) throw new Error('The server took too long to respond.')
  if (error) throw error
  return data
}

const toMatch = (row) => ({
  id: row.id,
  createdAt: row.created_at,
  result: row.result,
  myDeck: row.my_deck.name,
  oppDeck: row.opponent_deck.name,
  games: row.games
    .map((g) => ({
      gameNumber: g.game_number,
      onPlay: g.on_play,
      myHand: g.my_hand_size,
      oppHand: g.opp_hand_size,
      result: g.result,
      comments: g.comments,
    }))
    .sort((a, b) => a.gameNumber - b.gameNumber),
})

// All matches, newest first, with deck names and games.
export async function fetchMatches() {
  const data = await timed(
    supabase
      .from('matches')
      .select(
        `id, created_at, result,
         my_deck:my_decks(name),
         opponent_deck:opponent_decks(name),
         games(game_number, on_play, my_hand_size, opp_hand_size, result, comments)`,
      )
      .order('created_at', { ascending: false }),
  )
  return data.map(toMatch)
}

// Names for the deck pickers on the New Match page.
export async function fetchDeckNames() {
  const [mine, theirs] = await Promise.all([
    timed(supabase.from('my_decks').select('name').order('name')),
    timed(supabase.from('opponent_decks').select('name').order('name')),
  ])
  return { myDecks: mine.map((d) => d.name), oppDecks: theirs.map((d) => d.name) }
}

// payload comes from validateMatchForm() in stats.js.
export async function submitMatch(payload) {
  const { data, error } = await supabase.rpc('submit_match', {
    p_my_deck: payload.myDeck,
    p_opp_deck: payload.oppDeck,
    p_games: payload.games,
  })
  if (error) throw error
  return data
}

export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
