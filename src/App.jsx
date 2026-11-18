import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { fetchMatches, signOut } from './api'
import { isConfigured, supabase } from './supabase'
import Dashboard from './pages/Dashboard'
import Breakdown from './pages/Breakdown'
import NewMatch from './pages/NewMatch'

export default function App() {
  const [matches, setMatches] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [session, setSession] = useState(null)

  const load = useCallback(async () => {
    try {
      setMatches(await fetchMatches())
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    fetchMatches().then(setMatches, (e) => setLoadError(e.message))
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <SetupNeeded />

  const data = { matches, loadError, retry: load }

  return (
    <div className="app">
      <header className="site-header">
        <span className="brand">Match Log</span>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/stats">Breakdown</NavLink>
          <NavLink to="/new">New Match</NavLink>
        </nav>
        {session && (
          <button type="button" className="link-button" onClick={signOut}>
            Sign out
          </button>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard {...data} />} />
          <Route path="/stats" element={<Breakdown {...data} />} />
          <Route path="/new" element={<NewMatch session={session} onSaved={load} />} />
        </Routes>
      </main>
    </div>
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
