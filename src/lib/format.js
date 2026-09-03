const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

const audExact = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
})

export function money(value, exact = false) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return (exact ? audExact : aud).format(Number(value))
}

export function pct(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(digits)}%`
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  })
  if (!withTime) return date
  const time = d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })
  return `${date} · ${time}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function relativeDue(iso) {
  if (!iso) return { label: 'No SLA', tone: 'neutral' }
  const due = new Date(iso)
  const now = new Date()
  const days = Math.ceil((due - now) / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger' }
  if (days === 0) return { label: 'Due today', tone: 'warning' }
  if (days <= 2) return { label: `Due in ${days}d`, tone: 'warning' }
  return { label: `${days}d remaining`, tone: 'success' }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function addDays(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function nowIso() {
  return new Date().toISOString()
}
