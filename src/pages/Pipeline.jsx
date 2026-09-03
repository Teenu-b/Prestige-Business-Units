import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Empty, PageHeader } from '../components/ui'
import { STAGES } from '../data/constants'
import { money } from '../lib/format'
import { canAdvance, canCreateLead, hasRole } from '../lib/permissions'
import { belowFloor, selectedOption, stageMeta, workStage } from '../lib/workflow'
import { toast } from '../lib/toast'

function dealBadge(o) {
  if (o.variationPending) return { label: 'Variation', tone: 'warning' }
  const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 86400000
  if (ageDays <= 7) return { label: 'New', tone: 'info' }
  if (o.leadSource === 'referrer') return { label: 'Referral', tone: 'neutral' }
  return null
}

function daysInStage(o) {
  const since = o.slaStartedAt || o.createdAt
  if (!since) return null
  return Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86400000))
}

export default function Pipeline() {
  const app = useApp()
  const { opportunities, user, users } = app
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const stageFilter = params.get('stage') || ''
  const lifeFilter = params.get('life') || 'Active'
  const isReferrer = hasRole(user, 'REF')

  const owners = useMemo(
    () => users.filter((u) => u.roles.some((r) => ['BDM', 'DBD'].includes(r))),
    [users],
  )

  const rows = useMemo(() => {
    return opportunities
      .filter((o) => (isReferrer ? true : workStage(o.stage) >= 3))
      .filter((o) => (lifeFilter === 'all' ? true : o.lifecycle === lifeFilter))
      .filter((o) => (stageFilter ? String(o.stage) === stageFilter : true))
      .filter((o) => (ownerFilter ? o.owners?.salespersonId === ownerFilter : true))
      .filter((o) => {
        const hay = `${o.number || ''} ${o.customer?.legalName || ''} ${o.site?.suburb || ''}`.toLowerCase()
        return hay.includes(q.toLowerCase())
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [opportunities, q, stageFilter, lifeFilter, ownerFilter, isReferrer])

  const totalValue = rows.reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)

  const columns = useMemo(() => {
    const byStageId = new Map()
    rows.forEach((o) => {
      const id = workStage(o.stage)
      if (!byStageId.has(id)) byStageId.set(id, [])
      byStageId.get(id).push(o)
    })
    return STAGES.map((s) => ({ stage: s, rows: byStageId.get(s.id) || [] }))
  }, [rows])

  const draggingOpp = draggingId ? opportunities.find((o) => o.id === draggingId) : null

  const handleDrop = (e, stageId) => {
    if (!draggingOpp || stageId !== workStage(draggingOpp.stage) + 1) return
    e.preventDefault()
    setDraggingId(null)
    const result = app.advanceStage(draggingOpp.id)
    if (result.ok) toast(`${draggingOpp.customer?.legalName || draggingOpp.number} moved to ${stageMeta(stageId).label}`)
    else toast(`Can't move yet — ${result.missing[0]}`, 'danger')
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        lede={isReferrer
          ? 'Status of the leads you have introduced — nothing else.'
          : `${rows.length} open opportunities weighted at ${money(totalValue)}. Drag a card to move it into the next stage.`}
        actions={canCreateLead(user) ? <Link className="btn btn-primary" to="/leads/new">New lead</Link> : null}
      />

      <div className="toolbar">
        <input className="search" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        {!isReferrer ? (
          <select className="select" style={{ maxWidth: 190 }} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">All owners</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : null}
        <select className="select" style={{ maxWidth: 180 }} value={lifeFilter} onChange={(e) => setParams({ stage: stageFilter, life: e.target.value })}>
          <option value="Active">Active</option>
          <option value="OnHold">On hold</option>
          <option value="ClosedDelivered">Closed / delivered</option>
          <option value="Lost">Lost</option>
          <option value="Cancelled">Cancelled</option>
          <option value="all">All statuses</option>
        </select>
        {stageFilter ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParams({ life: lifeFilter })}>
            <X size={14} /> Clear stage filter
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="card card-pad">
          <Empty title="Nothing to show" body="Try another filter, or capture a new lead." />
        </div>
      ) : (
        <div className="kanban">
          {(stageFilter ? columns.filter((c) => String(c.stage.id) === stageFilter) : columns).map((col) => {
            const colValue = col.rows.reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)
            const isValidTarget = draggingOpp && col.stage.id === workStage(draggingOpp.stage) + 1
            return (
              <div
                key={col.stage.id}
                className={`kanban-col ${isValidTarget ? 'drop-ok' : ''}`}
                onDragOver={(e) => { if (isValidTarget) e.preventDefault() }}
                onDrop={(e) => handleDrop(e, col.stage.id)}
              >
                <div className="kanban-col-head">
                  <h3>{col.stage.short}</h3>
                  <span className="kanban-col-value">{money(colValue)}</span>
                </div>
                <div className="kanban-col-sub">{col.rows.length} deal{col.rows.length === 1 ? '' : 's'}</div>
                <div className="kanban-cards">
                  {col.rows.length === 0 ? <div className="kanban-empty">No deals here</div> : col.rows.map((o) => {
                    const option = selectedOption(o)
                    const margin = option?.margin
                    const value = option?.priceEx || o.acceptedValue
                    const badge = dealBadge(o)
                    const owner = users.find((u) => u.id === (o.owners?.salespersonId || o.owners?.leadId))
                    const draggable = !isReferrer && canAdvance(user, o)
                    const barColor = margin == null ? 'var(--line-strong)' : belowFloor(margin, o.marginFloor) ? 'var(--danger)' : 'var(--success)'
                    const days = daysInStage(o)
                    return (
                      <div
                        key={o.id}
                        className={`kanban-card ${draggingId === o.id ? 'dragging' : ''}`}
                        draggable={draggable}
                        onDragStart={() => setDraggingId(o.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => navigate(`/opportunities/${o.id}`)}
                        title={draggable ? 'Drag to move to the next stage' : undefined}
                      >
                        <div className="kanban-card-top">
                          <span className="row-title">{o.customer?.legalName || o.number}</span>
                          {badge ? <span className={`badge ${badge.tone}`}>{badge.label}</span> : null}
                        </div>
                        <div className="kanban-card-company">{o.site?.suburb} {o.site?.state}{o.number ? ` · ${o.number}` : ''}</div>
                        <div className="kanban-card-value-row">
                          <span className="kanban-card-value">{money(value)}</span>
                          {margin != null ? <span className="kanban-card-pct">{margin.toFixed(0)}% margin</span> : null}
                        </div>
                        {margin != null ? (
                          <div className="kanban-card-bar"><i style={{ width: `${Math.max(4, Math.min(100, margin))}%`, background: barColor }} /></div>
                        ) : null}
                        <div className="kanban-card-foot">
                          <Avatar name={owner?.name || '—'} size={24} />
                          <span className="row-meta">{days != null ? `${days}d in stage` : '—'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
