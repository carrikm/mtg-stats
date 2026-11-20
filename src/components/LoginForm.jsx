import { useState } from 'react'
import { signIn, signUp } from '../api'

// Every page needs an account: each user sees only their own matches.
export default function LoginForm() {
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === 'signUp'

  function switchMode() {
    setMode(isSignUp ? 'signIn' : 'signUp')
    setError('')
    setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    if (isSignUp) {
      const { data, error } = await signUp(email, password)
      if (error) setError(error.message)
      // With email confirmation on, there's no session until the link is clicked.
      else if (!data.session) setNotice(`Check ${email} for a link to confirm your account, then sign in.`)
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }
    setBusy(false)
  }

  return (
    <form className="card login" onSubmit={handleSubmit}>
      <h1>{isSignUp ? 'Create an account' : 'Sign in'}</h1>
      <p className="muted">Track your own matches. Your results are private to your account.</p>
      <label className="field">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={isSignUp ? 6 : undefined}
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>
      <p className="muted">
        {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="link-button" onClick={switchMode}>
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </form>
  )
}
