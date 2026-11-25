import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in (or just signed in) — go straight to the panel.
  useEffect(() => {
    if (session) navigate('/admin', { replace: true })
  }, [session, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      console.error('[LoginPage] sign in failed', err)
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="phone-shell login-page">
      <header className="login-header">
        <button
          type="button"
          className="login-header__back"
          aria-label="Go back"
          onClick={() => navigate('/')}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <ShieldCheck className="login-header__shield" aria-hidden="true" />
        <h1 className="login-header__title">StimaAlert Admin</h1>
      </header>

      <main className="login-body">
        <div className="login-intro">
          <h2 className="login-intro__title">Admin log in</h2>
          <p className="login-intro__text">
            Scheduled outage management is restricted to the StimaAlert team.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">
              Email
            </label>
            <div className="login-control">
              <Mail className="login-control__icon" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                className="login-input"
                autoComplete="username"
                placeholder="you@stimaalert.co.ke"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-control">
              <Lock className="login-control__icon" aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                className="login-input"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default LoginPage
