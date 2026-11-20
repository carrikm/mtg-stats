import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { fetchMatches, signOut } from './api'
import { isConfigured, supabase } from './supabase'
import LoginForm from './components/LoginForm'
import Dashboard from './pages/Dashboard'
import Breakdown from './pages/Breakdown'
import NewMatch from './pages/NewMatch'

export default function App() {
  // undefined while the saved session is being checked, null when signed out.
  const [session, setSession] = useState(undefined)
  const userId = session?.user.id

  // Loaded matches are tagged with the user they belong to, and only shown while
  // that same user is signed in. Signing out, or a slow load finishing after a
  // different user signs in, can never show one user's matches to another.
  const [loaded, setLoaded] = useState({ userId: null, matches: null, error: '' })
  const mine = loaded.userId === userId
  const matches = mine ? loaded.matches : null
  const loadError = mine ? loaded.error : ''

  const load = useCallback(() => loadMatches(userId, setLoaded), [userId])

  useEffect(() => {
    if (!isConfigured) return
    // Also fires once on load with the saved session (or null).
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Load whenever a different user signs in. Keyed on the user id, not the
  // session, so token refreshes don't trigger a reload.
  useEffect(() => {
    if (userId) loadMatches(userId, setLoaded)
  }, [userId])

  if (!isConfigured) return <SetupNeeded />

  const data = { matches, loadError, retry: load }

  return (
    <div className="app">
      <header className="site-header">
        <span className="brand">Match Log</span>
        {session && (
          <>
            <nav>
              <NavLink to="/" end>
                Dashboard
              </NavLink>
              <NavLink to="/stats">Breakdown</NavLink>
              <NavLink to="/new">New Match</NavLink>
            </nav>
            <span className="muted">{session.user.email}</span>
            <button type="button" className="link-button" onClick={signOut}>
              Sign out
            </button>
          </>
        )}
      </header>
      <main>
        {session === undefined ? (
          <p className="muted">Loading…</p>
        ) : !session ? (
          <LoginForm />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard {...data} />} />
            <Route path="/stats" element={<Breakdown {...data} />} />
            <Route path="/new" element={<NewMatch onSaved={load} />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

// Fetches the signed-in user's matches and stores them tagged with that user's id.
// A failed reload keeps that user's already-loaded matches on screen.
function loadMatches(userId, setLoaded) {
  return fetchMatches().then(
    (matches) => setLoaded({ userId, matches, error: '' }),
    (e) => setLoaded((l) => ({ userId, matches: l.userId === userId ? l.matches : null, error: e.message })),
  )
}

function SetupNeeded() {
  return (
    <main className="setup">
      <h1>Connect a database</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env</code> and fill in the URL and anon key from this site&apos;s
        own Supabase project, then restart <code>npm run dev</code>. The README has the full steps.
      </p>
    </main>
  )
}
