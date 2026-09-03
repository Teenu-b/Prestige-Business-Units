import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar } from './ui'
import { stageMeta } from '../lib/workflow'

export default function CommandPalette({ open, onClose }) {
  const { opportunities } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const sorted = [...opportunities].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    const term = q.trim().toLowerCase()
    if (!term) return sorted.slice(0, 8)
    return sorted
      .filter((o) => `${o.number || ''} ${o.customer?.legalName || ''} ${o.site?.suburb || ''}`.toLowerCase().includes(term))
      .slice(0, 8)
  }, [opportunities, q])

  if (!open) return null

  const go = (id) => {
    onClose()
    navigate(`/opportunities/${id}`)
  }

  return (
    <div className="palette-back" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={17} />
          <input
            autoFocus
            placeholder="Search opportunities by name, number or suburb…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list">
          {results.length === 0 ? (
            <div className="palette-empty">No opportunities match &ldquo;{q}&rdquo;.</div>
          ) : (
            <>
              <div className="palette-section">{q ? 'Results' : 'Recently updated'}</div>
              {results.map((o) => (
                <button key={o.id} type="button" className="palette-item" onClick={() => go(o.id)}>
                  <Avatar name={o.customer?.legalName || o.number} size={30} />
                  <div>
                    <div className="row-title">{o.customer?.legalName || o.number}</div>
                    <div className="row-meta">{o.number} · {o.site?.suburb} {o.site?.state} · {stageMeta(o.stage).label}</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
