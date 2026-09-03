import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Inbox, Info, TrendingDown, TrendingUp, X } from 'lucide-react'
import { subscribeToast } from '../lib/toast'

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

export function Sparkline({ data = [] }) {
  const max = Math.max(1, ...data.map((n) => Number(n) || 0))
  return (
    <div className="sparkline">
      {data.map((n, i) => (
        <span key={i} style={{ height: `${Math.max(8, (Number(n) / max) * 100)}%` }} />
      ))}
    </div>
  )
}

export function Stat({ label, value, hint, icon, trend, spark, style }) {
  return (
    <div className="stat" style={style}>
      <div className="stat-body">
        <div className="stat-head">
          {icon ? <span className="stat-icon-inline">{icon}</span> : null}
          <span className="label">{label}</span>
        </div>
        <div className="stat-value-row">
          <span className="value">{value}</span>
          {trend != null ? (
            <span className={`trend-pill ${trend < 0 ? 'down' : 'up'}`}>
              {trend < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {Math.abs(trend)}%
            </span>
          ) : null}
        </div>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
      {spark?.length ? <Sparkline data={spark} /> : null}
    </div>
  )
}

export function Card({ title, sub, children, pad = true, icon, interactive = false, onClick, className = '', style }) {
  return (
    <section className={`card ${interactive ? 'interactive' : ''} ${className}`.trim()} onClick={onClick} style={style}>
      <div className={pad ? 'card-pad' : undefined} style={pad ? undefined : { padding: '22px 24px 8px' }}>
        {title ? (
          icon ? (
            <div className="card-head">
              <span className="card-icon">{icon}</span>
              <h2>{title}</h2>
            </div>
          ) : (
            <h2>{title}</h2>
          )
        ) : null}
        {sub ? <p className="sub">{sub}</p> : null}
        {children}
      </div>
    </section>
  )
}

export function Empty({ title, body, action, icon }) {
  return (
    <div className="empty">
      <div style={{ color: 'var(--muted)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
        {icon || <Inbox size={28} strokeWidth={1.5} />}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

export function SectionHeading({ icon, title }) {
  return (
    <div className="section-head">
      {icon ? <span className="section-icon">{icon}</span> : null}
      <h3>{title}</h3>
    </div>
  )
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={value === it.key ? 'active' : ''}
          onClick={() => onChange(it.key)}
        >
          {it.icon}
          {it.label}
          {it.count != null ? <span className="tab-count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

const TOAST_ICON = {
  success: <CheckCircle2 size={18} />,
  danger: <AlertTriangle size={18} />,
  info: <Info size={18} />,
}

export function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return subscribeToast((item) => {
      setItems((prev) => [...prev, item])
      setTimeout(() => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, leaving: true } : i)))
      }, 3200)
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      }, 3600)
    })
  }, [])

  if (!items.length) return null
  return (
    <div className="toast-host">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.tone} ${item.leaving ? 'leaving' : ''}`.trim()}>
          {TOAST_ICON[item.tone] || TOAST_ICON.success}
          <span style={{ flex: 1 }}>{item.message}</span>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
            style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', opacity: 0.8, padding: 0, display: 'flex' }}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
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

const AVATAR_HUES = [355, 24, 42, 160, 190, 220, 265, 320]

function avatarColor(seed) {
  const s = String(seed || '')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length]
  return { background: `hsl(${hue} 85% 95%)`, color: `hsl(${hue} 55% 38%)` }
}

export function Avatar({ name, size = 34 }) {
  const label = initialsOf(name)
  return (
    <span className="row-avatar" style={{ width: size, height: size, fontSize: size * 0.36, ...avatarColor(name) }}>
      {label}
    </span>
  )
}

function initialsOf(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function CustomerCell({ opp }) {
  const typeLabel = opp?.leadType === 'residential' ? 'Residential' : opp?.leadType === 'commercial' ? 'Commercial' : ''
  const name = opp?.customer?.legalName || 'Untitled'
  return (
    <div className="cell-with-avatar">
      <Avatar name={name} />
      <div>
        <div className="row-title">{name}</div>
        <div className="row-meta">{opp?.number} · {opp?.site?.suburb} {opp?.site?.state}{typeLabel ? ` · ${typeLabel}` : ''}</div>
      </div>
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
