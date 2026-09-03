import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader } from '../components/ui'
import { LIFECYCLE, STAGES } from '../data/constants'
import { money, relativeDue } from '../lib/format'
import { canCreateLead, hasRole } from '../lib/permissions'
import { selectedOption, stageMeta, workStage } from '../lib/workflow'

export default function Pipeline() {
  const { opportunities, user } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const stageFilter = params.get('stage') || ''
  const lifeFilter = params.get('life') || 'Active'
  const isReferrer = hasRole(user, 'REF')

  const rows = useMemo(() => {
    return opportunities
      .filter((o) => (isReferrer ? true : workStage(o.stage) >= 3))
      .filter((o) => (lifeFilter === 'all' ? true : o.lifecycle === lifeFilter))
      .filter((o) => (stageFilter ? String(o.stage) === stageFilter : true))
      .filter((o) => {
        const hay = `${o.number || ''} ${o.customer?.legalName || ''} ${o.site?.suburb || ''}`.toLowerCase()
        return hay.includes(q.toLowerCase())
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [opportunities, q, stageFilter, lifeFilter, isReferrer])

  return (
    <>
      <PageHeader
        title="Pipeline"
        lede={isReferrer
          ? 'Status of the leads you have introduced — nothing else.'
          : 'Qualified opportunities attached to the pipeline. Leads still being qualified live in Leads.'}
        actions={canCreateLead(user) ? <Link className="btn btn-primary" to="/leads/new">New lead</Link> : null}
      />

      <div className="toolbar">
        <input className="search" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={stageFilter} onChange={(e) => setParams({ stage: e.target.value, life: lifeFilter })}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="select" style={{ maxWidth: 180 }} value={lifeFilter} onChange={(e) => setParams({ stage: stageFilter, life: e.target.value })}>
          <option value="Active">Active</option>
          <option value="OnHold">On hold</option>
          <option value="ClosedDelivered">Closed / delivered</option>
          <option value="Lost">Lost</option>
          <option value="Cancelled">Cancelled</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty title="Nothing to show" body="Try another filter, or capture a new lead." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Stage</th>
                <th>Value</th>
                <th>SLA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const due = relativeDue(o.slaDueAt)
                const option = selectedOption(o)
                return (
                  <tr key={o.id} onClick={() => navigate(`/opportunities/${o.id}`)}>
                    <td><CustomerCell opp={o} /></td>
                    <td>{stageMeta(o.stage).label}{o.variationPending ? ' · variation' : ''}</td>
                    <td>{money(option?.priceEx || o.acceptedValue)}</td>
                    <td><Badge tone={due.tone}>{due.label}</Badge></td>
                    <td><Badge tone={(LIFECYCLE[o.lifecycle] || LIFECYCLE.Active).tone}>{(LIFECYCLE[o.lifecycle] || LIFECYCLE.Active).label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
