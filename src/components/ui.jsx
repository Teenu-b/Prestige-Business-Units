import { Link } from 'react-router-dom'

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function PageHeader({ title, lede, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

export function Card({ title, sub, children, pad = true }) {
  return (
    <section className="card">
      <div className={pad ? 'card-pad' : undefined} style={pad ? undefined : { padding: '22px 24px 8px' }}>
        {title ? <h2>{title}</h2> : null}
        {sub ? <p className="sub">{sub}</p> : null}
        {children}
      </div>
    </section>
  )
}

export function Empty({ title, body, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

export function NumberInput({ value, onChange, disabled, step, min }) {
  const empty = value === '' || value === null || value === undefined || value === 0 || value === '0'
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      disabled={disabled}
      placeholder="0"
      value={empty ? '' : value}
      onChange={(e) => {
        let raw = e.target.value
        if (raw === '') {
          onChange('')
          return
        }
        if (/^0\d+/.test(raw)) raw = String(Number(raw))
        const n = Number(raw)
        onChange(Number.isNaN(n) ? '' : n)
      }}
    />
  )
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <div className={`field ${className} ${error ? 'invalid' : ''}`.trim()}>
      {label ? <label>{label}{hint ? <span className="hint"> · {hint}</span> : null}</label> : null}
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}

export function Modal({ title, body, children, onClose, actions, className = '' }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {body ? <p className="lede">{body}</p> : null}
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  )
}

export function CustomerCell({ opp }) {
  return (
    <div>
      <div className="row-title">{opp?.customer?.legalName || 'Untitled'}</div>
      <div className="row-meta">{opp?.number} · {opp?.site?.suburb} {opp?.site?.state}</div>
    </div>
  )
}

export function BackLink({ to = '/pipeline' }) {
  return (
    <Link to={to} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
      Back
    </Link>
  )
}
