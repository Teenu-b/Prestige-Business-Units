import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card, PageHeader, Stat } from '../components/ui'
import { STAGES, LIFECYCLE } from '../data/constants'
import { money, relativeDue } from '../lib/format'
import { canCreateLead, hasRole } from '../lib/permissions'
import { selectedOption, stageMeta, workStage } from '../lib/workflow'

export default function Dashboard() {
  const { user, unit, opportunities, notifications } = useApp()
  const navigate = useNavigate()
  const active = opportunities.filter((o) => o.lifecycle === 'Active')
  const pipelineValue = active.reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)
  const overdue = active.filter((o) => o.slaDueAt && new Date(o.slaDueAt) < new Date())
  const mine = active.filter((o) =>
    [o.owners.leadId, o.owners.estimatorId, o.owners.salespersonId, o.owners.deliveryId].includes(user.id),
  )
  const byStage = STAGES.map((s) => ({
    ...s,
    count: active.filter((o) => workStage(o.stage) === s.id).length,
    value: active.filter((o) => workStage(o.stage) === s.id).reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0),
  }))
  const unread = notifications.filter((n) => !n.read)

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        lede={hasRole(user, 'REF')
          ? 'Status of the leads you have introduced — nothing else.'
          : `A quiet view of ${unit.name}: what is live, what is yours, and what is late.`}
        actions={canCreateLead(user) ? <Link className="btn btn-primary" to="/leads/new">New lead</Link> : null}
      />

      <div className="stats">
        <Stat label="Active pipeline" value={money(pipelineValue)} hint={`${active.length} live opportunities`} />
        <Stat label="My work" value={mine.length} hint="Assigned to you right now" />
        <Stat label="Past SLA" value={overdue.length} hint={overdue.length ? 'Needs a decision or a chase' : 'All on time'} />
        <Stat label="Unread notices" value={unread.length} hint={<Link to="/notifications">Open inbox</Link>} />
      </div>

      {!hasRole(user, 'REF') ? (
        <Card title="Pipeline by stage" sub="Counts only — open the pipeline for the full list.">
          <div className="pipeline-row">
            {byStage.map((s) => (
              <button
                key={s.id}
                className="pipe-cell"
                onClick={() => navigate(`/pipeline?stage=${s.id}`)}
                style={{ border: 0, cursor: 'pointer' }}
              >
                <strong>{s.count}</strong>
                <span>{s.short}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid-2" style={{ marginTop: 20 }}>
        <Card title="My queue" sub="Items you own, with SLA status.">
          {mine.length === 0 ? <p className="lede">Nothing assigned to you in this unit.</p> : (
            <div className="list-stack">
              {mine.slice(0, 6).map((o) => {
                const due = relativeDue(o.slaDueAt)
                return (
                  <button key={o.id} className="list-item" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/opportunities/${o.id}`)}>
                    <div>
                      <div className="row-title">{o.customer.legalName}</div>
                      <div className="row-meta">{o.number} · {stageMeta(o.stage).label}</div>
                    </div>
                    <span className={`badge ${due.tone}`}>{due.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
        <Card title={hasRole(user, 'DIR') ? 'Overdue & escalations' : 'Needs attention'} sub="Past SLA, or waiting on a gate.">
          {(hasRole(user, 'DIR') ? overdue : [...overdue, ...mine.filter((o) => o.slaDueAt && new Date(o.slaDueAt) < new Date())]
            .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
          ).slice(0, 6).length === 0 ? (
            <p className="lede">No overdue items.</p>
          ) : (
            <div className="list-stack">
              {(hasRole(user, 'DIR') ? overdue : overdue).slice(0, 6).map((o) => (
                <button key={o.id} className="list-item" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/opportunities/${o.id}`)}>
                  <div>
                    <div className="row-title">{o.customer.legalName}</div>
                    <div className="row-meta">{LIFECYCLE[o.lifecycle].label} · Stage {o.stage}</div>
                  </div>
                  <span className="badge danger">{relativeDue(o.slaDueAt).label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
