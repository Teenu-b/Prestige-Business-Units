import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Field } from '../components/ui'
import { DEMO_PASSWORD } from '../data/constants'

const QUICK = [
  { email: 'baiju@prestige.group', label: 'Baiju Scariah', role: 'Director' },
  { email: 'priya@prestige.group', label: 'Priya Chen', role: 'Sales supervisor' },
  { email: 'james@prestige.group', label: 'James Okonkwo', role: 'Estimator' },
  { email: 'sarah@prestige.group', label: 'Sarah Nguyen', role: 'Lead generator' },
  { email: 'ana@prestige.group', label: 'Ana Torres', role: 'Site operations' },
  { email: 'david@prestige.group', label: 'David Kim', role: 'Accounts' },
  { email: 'admin@prestige.group', label: 'Helen Park', role: 'Administrator' },
  { email: 'tom@greenfield.partners', label: 'Tom Reeves', role: 'Referrer' },
]

export default function Login() {
  const { user, login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState(QUICK[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = (e) => {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) setError(result.error)
    else navigate('/')
  }

  return (
    <div className="login-wrap">
      <section className="login-art">
        <div>
          <div className="brand">
            <div className="brand-mark">P</div>
            <div>
              <div className="brand-name">Prestige</div>
              <div className="brand-sub">Industrial Group</div>
            </div>
          </div>
          <h2>One record. Nine stages. Every business unit.</h2>
          <p>
            Capture the lead, protect the margin, and take delivery through to handover —
            without the spreadsheet trail.
          </p>
        </div>
        <p>Prestige Renewable Solutions · North Rocks NSW</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h1>Sign in</h1>
          <p className="lede">Select a demo profile or enter credentials. Password for all demo users is {DEMO_PASSWORD}.</p>

          <div className="personas">
            {QUICK.map((p) => (
              <button
                type="button"
                key={p.email}
                className={`persona ${email === p.email ? 'active' : ''}`}
                onClick={() => { setEmail(p.email); setPassword(DEMO_PASSWORD); setError('') }}
              >
                <b>{p.label}</b>
                <span>{p.role}</span>
              </button>
            ))}
          </div>

          <div className="section">
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <div style={{ height: 12 }} />
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
          </div>
          {error ? <div className="alert danger">{error}</div> : null}
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Continue
          </button>
        </form>
      </section>
    </div>
  )
}
