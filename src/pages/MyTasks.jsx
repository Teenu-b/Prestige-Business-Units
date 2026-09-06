import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Empty, PageHeader } from '../components/ui'
import { STAGES } from '../data/constants'
import { daysInStage, money } from '../lib/format'
import { hasRole } from '../lib/permissions'
import { selectedOption, stageMeta, workStage } from '../lib/workflow'

function stageProgress(stage) {
  const idx = STAGES.findIndex((s) => s.id === workStage(stage))
  return Math.round(((idx + 1) / STAGES.length) * 100)
}

function systemType(o) {
  const opt = selectedOption(o)
  const kw = Number(opt?.capacityKw) || 0
  const kwh = Number(opt?.capacityKwh) || 0
  if (kw > 0 && kwh > 0) return { label: 'Solar + battery', detail: `${kw}kW ${kwh}kWh` }
  if (kw > 0) return { label: 'Solar only', detail: `${kw}kW` }
  if (kwh > 0) return { label: 'Battery only', detail: `${kwh}kWh` }
  return { label: o.leadType === 'commercial' ? 'Commercial' : o.leadType === 'residential' ? 'Residential' : '—', detail: '' }
}

function ownerId(o) {
  const owners = o.owners || {}
  return owners.salespersonId || owners.estimatorId || owners.deliveryId || owners.leadId || ''
}

export default function MyTasks() {
  const app = useApp()
  const { user, users, opportunities, allOpportunities } = app
  const navigate = useNavigate()
  const canViewAs = hasRole(user, 'DIR', 'ADM')
  const [viewAsId, setViewAsId] = useState(user.id)
  const viewedUser = users.find((u) => u.id === viewAsId) || user

  const teamOptions = useMemo(
    () => users.filter((u) => u.unitIds.includes(app.unit.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [users, app.unit.id],
  )

  const source = canViewAs ? allOpportunities : opportunities

  const rows = useMemo(() => {
    return source
      .filter((o) => o.lifecycle === 'Active')
      .filter((o) => {
        const owners = o.owners || {}
        return [owners.leadId, owners.estimatorId, owners.salespersonId, owners.deliveryId].includes(viewAsId)
      })
      .map((o) => ({ opp: o, days: daysInStage(o.slaStartedAt || o.createdAt) }))
      .sort((a, b) => (b.days || 0) - (a.days || 0))
  }, [source, viewAsId])

  const feedbackCount = rows.filter(({ opp }) => (opp.service?.feedbackText || '').trim()).length

  return (
    <>
      <PageHeader
        title="My tasks"
        lede="The same system seen through one person's eyes — every open job assigned to them, oldest in stage first."
      />

      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {canViewAs ? (
            <div className="unit-switch">
              <span>Signed in as</span>
              <select value={viewAsId} onChange={(e) => setViewAsId(e.target.value)}>
                {teamOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.id === user.id ? ' (you)' : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="lede" style={{ margin: 0 }}>Showing your own assigned jobs.</p>
          )}
          <Badge tone={feedbackCount ? 'warning' : 'neutral'}>
            <MessageSquare size={12} /> Feedback {feedbackCount}
          </Badge>
        </div>

        {rows.length === 0 ? (
          <Empty title="Nothing assigned" body={`${viewedUser.name} has no open jobs right now.`} />
        ) : (
          <div className="table-wrap">
            <table className="table stack zebra">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th>Owner</th>
                  <th>Days in stage</th>
                  <th>Status</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ opp: o, days }) => {
                  const type = systemType(o)
                  const owner = users.find((u) => u.id === ownerId(o))
                  const overdue = o.slaDueAt && new Date(o.slaDueAt) < new Date()
                  return (
                    <tr key={o.id} onClick={() => navigate(`/opportunities/${o.id}`)}>
                      <td data-label="Job">
                        <div className="row-title">{o.number}</div>
                      </td>
                      <td data-label="Customer">
                        <div className="row-title">{o.customer?.legalName || 'Untitled'}</div>
                        <div className="row-meta">{o.site?.suburb} · {o.site?.state}</div>
                      </td>
                      <td data-label="Type">
                        <div>{type.label}</div>
                        {type.detail ? <div className="row-meta">{type.detail}</div> : null}
                      </td>
                      <td data-label="Stage"><Badge tone="neutral">{stageMeta(o.stage).short}</Badge></td>
                      <td data-label="Progress">
                        <div className="table-progress">
                          <span className="tp-track"><i style={{ width: `${stageProgress(o.stage)}%`, background: 'var(--forest)' }} /></span>
                          <span className="tp-val">{stageProgress(o.stage)}%</span>
                        </div>
                      </td>
                      <td data-label="Owner">{owner?.name || '—'}</td>
                      <td data-label="Days in stage">
                        <div className="table-progress">
                          <span className="tp-track"><i style={{ width: `${Math.min(100, ((days || 0) / 60) * 100)}%`, background: overdue ? 'var(--danger)' : 'var(--forest)' }} /></span>
                          <span className="tp-val">{days != null ? `${days}d` : '—'}</span>
                        </div>
                      </td>
                      <td data-label="Status"><Badge tone={overdue ? 'danger' : 'success'}>{overdue ? 'Overdue' : 'On track'}</Badge></td>
                      <td data-label="Value">{money(selectedOption(o)?.priceEx || o.acceptedValue)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
