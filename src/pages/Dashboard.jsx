import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CircleDollarSign,
  History,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Card, PageHeader, Stat } from '../components/ui'
import { STAGES } from '../data/constants'
import { money, relativeDue, relativeTime } from '../lib/format'
import { canCreateLead, hasRole } from '../lib/permissions'
import { currentProposal, selectedOption, stageMeta, workStage } from '../lib/workflow'

const RANGES = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
]

function rangeStart(key) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (key === 'week') {
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d
  }
  if (key === 'month') {
    d.setDate(1)
    return d
  }
  d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1)
  return d
}

const DUE_COLOR = { success: 'var(--forest)', warning: 'var(--warning)', danger: 'var(--danger)' }

export default function Dashboard() {
  const { user, unit, opportunities, allOpportunities, users, notifications } = useApp()
  const navigate = useNavigate()
  const [range, setRange] = useState('month')
  const isRef = hasRole(user, 'REF')
  const isManager = hasRole(user, 'DIR', 'ADM', 'DBD')

  const active = opportunities.filter((o) => o.lifecycle === 'Active')
  const leadsInQualification = active.filter((o) => workStage(o.stage) === 2)
  const pipelineActive = active.filter((o) => workStage(o.stage) >= 3)
  const pipelineValue = pipelineActive.reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)
  const overdue = active.filter((o) => o.slaDueAt && new Date(o.slaDueAt) < new Date())
  const overdueValue = overdue.reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)
  const mine = active.filter((o) =>
    [o.owners.leadId, o.owners.estimatorId, o.owners.salespersonId, o.owners.deliveryId].includes(user.id),
  )
  const byStage = STAGES.map((s) => ({
    ...s,
    count: active.filter((o) => workStage(o.stage) === s.id).length,
    value: active.filter((o) => workStage(o.stage) === s.id).reduce((sum, o) => sum + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0),
  }))
  const unread = notifications.filter((n) => !n.read)
  const awaitingDirector = opportunities.filter((o) => currentProposal(o)?.status === 'pending_director')

  const start = rangeStart(range)
  const closedInRange = opportunities.filter(
    (o) => o.lifecycle === 'ClosedDelivered' && o.closure?.closedAt && new Date(o.closure.closedAt) >= start,
  )
  const closedValue = closedInRange.reduce((sum, o) => sum + (o.acceptedValue || 0), 0)

  const healthProgress = pipelineValue > 0 ? Math.max(0, Math.min(100, Math.round(((pipelineValue - overdueValue) / pipelineValue) * 100))) : 100

  const dueBuckets = useMemo(() => {
    const buckets = { success: 0, warning: 0, danger: 0 }
    pipelineActive.forEach((o) => {
      const tone = relativeDue(o.slaDueAt).tone
      buckets[tone === 'neutral' ? 'success' : tone] += 1
    })
    return buckets
  }, [pipelineActive])
  const donutTotal = Math.max(1, dueBuckets.success + dueBuckets.warning + dueBuckets.danger)
  const donutStyle = {
    background: `conic-gradient(
      var(--forest) 0 ${(dueBuckets.success / donutTotal) * 360}deg,
      var(--warning) ${(dueBuckets.success / donutTotal) * 360}deg ${((dueBuckets.success + dueBuckets.warning) / donutTotal) * 360}deg,
      var(--danger) ${((dueBuckets.success + dueBuckets.warning) / donutTotal) * 360}deg 360deg
    )`,
  }

  const reps = useMemo(
    () => users.filter((u) => (u.roles.includes('BDM') || u.roles.includes('DBD')) && u.unitIds.includes(unit.id)),
    [users, unit.id],
  )
  const repStats = useMemo(() => {
    return reps
      .map((rep) => {
        const owned = allOpportunities.filter((o) => o.owners?.salespersonId === rep.id)
        const activeOwned = owned.filter((o) => o.lifecycle === 'Active' && workStage(o.stage) >= 3)
        const pipelineVal = activeOwned.reduce((s, o) => s + (selectedOption(o)?.priceEx || o.acceptedValue || 0), 0)
        const won = owned.filter((o) => o.lifecycle === 'ClosedDelivered')
        const lost = owned.filter((o) => o.lifecycle === 'Lost')
        const wonValue = won.reduce((s, o) => s + (o.acceptedValue || 0), 0)
        const decided = won.length + lost.length
        const winRate = decided ? Math.round((won.length / decided) * 100) : null
        return { rep, pipelineVal, wonValue, winRate, avgDeal: won.length ? wonValue / won.length : 0, dealCount: owned.length }
      })
      .sort((a, b) => b.pipelineVal - a.pipelineVal)
  }, [reps, allOpportunities])

  const activityFeed = useMemo(() => {
    return opportunities
      .flatMap((o) => (o.audit || []).map((a) => ({ ...a, oppName: o.customer?.legalName || o.number, oppId: o.id })))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 7)
  }, [opportunities])

  const attention = useMemo(() => {
    const rows = []
    overdue.forEach((o) => rows.push({
      id: `od-${o.id}`, oppId: o.id, tone: 'danger',
      title: o.customer?.legalName || o.number,
      meta: `${stageMeta(o.stage).label} · ${relativeDue(o.slaDueAt).label}`,
      cta: 'Open opportunity',
    }))
    opportunities.filter((o) => o.variationPending).forEach((o) => rows.push({
      id: `var-${o.id}`, oppId: o.id, tone: 'warning',
      title: o.customer?.legalName || o.number,
      meta: `Variation pending · ${(o.variations || [])[0]?.reason || 'awaiting resolution'}`,
      cta: 'Review variation',
    }))
    awaitingDirector.forEach((o) => rows.push({
      id: `dir-${o.id}`, oppId: o.id, tone: 'warning',
      title: o.customer?.legalName || o.number,
      meta: 'Below-floor pricing awaiting Director approval',
      cta: 'Review pricing',
    }))
    return rows.slice(0, 6)
  }, [overdue, opportunities, awaitingDirector])

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        lede={isRef
          ? 'Status of the leads you have introduced — nothing else.'
          : `A quiet view of ${unit.name}: what is live, what is yours, and what is late.`}
        actions={canCreateLead(user) ? <Link className="btn btn-primary" to="/leads/new">New lead</Link> : null}
      />

      {!isRef ? (
        <div className="hero-forecast">
          <div className="hero-top">
            <span className="hero-eyebrow"><Sparkles size={13} /> Pipeline · {unit.name}</span>
            <div className="segmented">
              {RANGES.map((r) => (
                <button key={r.key} type="button" className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hero-value-row">
            <span className="hero-value">{money(pipelineValue)}</span>
            {overdue.length ? (
              <span className="hero-delta"><AlertTriangle size={13} /> {overdue.length} at risk</span>
            ) : (
              <span className="hero-delta"><TrendingUp size={13} /> all on track</span>
            )}
          </div>
          <div className="hero-caption">Weighted across {pipelineActive.length} qualified opportunities · {healthProgress}% of value on schedule</div>
          <div className="hero-track"><i style={{ width: `${healthProgress}%` }} /></div>
          <div className="hero-chips">
            <div className="hero-chip">
              <div className="hc-label"><span className="dot" style={{ background: '#7ef0c2' }} /> Closed {RANGES.find((r) => r.key === range)?.label.toLowerCase()}</div>
              <div className="hc-value">{money(closedValue)}</div>
            </div>
            <div className="hero-chip">
              <div className="hc-label"><span className="dot" style={{ background: '#ffb4a2' }} /> Past SLA</div>
              <div className="hc-value">{money(overdueValue)}</div>
            </div>
            <div className="hero-chip">
              <div className="hc-label"><span className="dot" style={{ background: '#c4b5fd' }} /> Awaiting director</div>
              <div className="hc-value">{awaitingDirector.length}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stats">
        {!isRef ? (
          <Stat icon={<Briefcase size={17} />} label="Leads to qualify" value={leadsInQualification.length} hint={<Link to="/leads">Open leads</Link>} style={{ '--i': 0 }} />
        ) : null}
        <Stat icon={<UserCheck size={17} />} label="My work" value={mine.length} hint="Assigned to you right now" style={{ '--i': 1 }} />
        <Stat icon={<AlertTriangle size={17} />} label="Past SLA" value={overdue.length} hint={overdue.length ? 'Needs a decision or a chase' : 'All on time'} style={{ '--i': 2 }} />
        <Stat icon={<Bell size={17} />} label="Unread notices" value={unread.length} hint={<Link to="/notifications">Open inbox</Link>} style={{ '--i': 3 }} />
        <Stat icon={<CircleDollarSign size={17} />} label="Closed value" value={money(closedValue)} hint={`${closedInRange.length} jobs, ${RANGES.find((r) => r.key === range)?.label.toLowerCase()}`} style={{ '--i': 4 }} />
      </div>

      <div className="grid-2">
        <div>
          {!isRef ? (
            <Card title="Pipeline by stage" sub="Counts only — open the pipeline for the full list.">
              <div className="pipeline-row">
                {byStage.map((s, i) => {
                  const maxCount = Math.max(1, ...byStage.map((x) => x.count))
                  return (
                    <button
                      key={s.id}
                      className="pipe-cell"
                      onClick={() => navigate(`/pipeline?stage=${s.id}`)}
                      style={{ border: 0, cursor: 'pointer', '--i': i }}
                    >
                      <strong>{s.count}</strong>
                      <span>{s.short}</span>
                      <span className="pipe-bar"><i style={{ width: `${(s.count / maxCount) * 100}%` }} /></span>
                    </button>
                  )
                })}
              </div>
            </Card>
          ) : null}

          {isManager && repStats.length ? (
            <Card title="Team performance" sub={`${repStats.length} reps · sorted by open pipeline`} style={{ marginTop: 20 }}>
              <div className="table-wrap">
                <table className="table stack">
                  <thead>
                    <tr>
                      <th>Rep</th>
                      <th>Pipeline</th>
                      <th>Closed</th>
                      <th>Win rate</th>
                      <th>Avg deal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repStats.map(({ rep, pipelineVal, wonValue, winRate, avgDeal }) => (
                      <tr key={rep.id} onClick={() => navigate(`/pipeline?rep=${rep.id}`)}>
                        <td data-label="Rep">
                          <div className="cell-with-avatar">
                            <Avatar name={rep.name} size={30} />
                            <span className="row-title">{rep.name}</span>
                          </div>
                        </td>
                        <td data-label="Pipeline">{money(pipelineVal)}</td>
                        <td data-label="Closed">{money(wonValue)}</td>
                        <td data-label="Win rate">
                          {winRate == null ? <span className="row-meta">No decided deals</span> : (
                            <div className="table-progress">
                              <span className="tp-track"><i style={{ width: `${winRate}%`, background: winRate >= 50 ? 'var(--success)' : 'var(--warning)' }} /></span>
                              <span className="tp-val">{winRate}%</span>
                            </div>
                          )}
                        </td>
                        <td data-label="Avg deal">{avgDeal ? money(avgDeal) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <Card title="Latest activity" sub="Most recent updates across your visible opportunities." style={{ marginTop: 20 }}>
            {activityFeed.length === 0 ? (
              <p className="lede">No activity recorded yet.</p>
            ) : (
              <div className="activity-feed">
                {activityFeed.map((a) => (
                  <div className="activity-row" key={a.id}>
                    <span className="activity-icon"><History size={15} /></span>
                    <div>
                      <div className="activity-text">
                        <b>{users.find((u) => u.id === a.actorId)?.name || 'Someone'}</b> {a.action.toLowerCase()} for <b>{a.oppName}</b>
                        {a.detail ? ` — ${a.detail}` : ''}
                      </div>
                      <div className="activity-time">{relativeTime(a.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          {!isRef ? (
            <Card title="Pipeline health" sub="Active opportunities by SLA status.">
              {pipelineActive.length === 0 ? (
                <p className="lede">No qualified opportunities in the pipeline yet.</p>
              ) : (
                <div className="donut-wrap">
                  <div className="donut" style={donutStyle}>
                    <div className="donut-center">
                      <strong>{pipelineActive.length}</strong>
                      <span>deals</span>
                    </div>
                  </div>
                  <div className="donut-legend">
                    <div className="donut-legend-row">
                      <span className="dl-label"><span className="dl-dot" style={{ background: 'var(--danger)' }} /> Stalled</span>
                      <span className="dl-value">{dueBuckets.danger}</span>
                    </div>
                    <div className="donut-legend-row">
                      <span className="dl-label"><span className="dl-dot" style={{ background: 'var(--warning)' }} /> At risk</span>
                      <span className="dl-value">{dueBuckets.warning}</span>
                    </div>
                    <div className="donut-legend-row">
                      <span className="dl-label"><span className="dl-dot" style={{ background: 'var(--forest)' }} /> On track</span>
                      <span className="dl-value">{dueBuckets.success}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          <Card
            title={hasRole(user, 'DIR') ? 'Overdue & escalations' : 'Needs attention'}
            sub="Ranked by urgency — SLA breaches, variations and pricing approvals."
            style={{ marginTop: 20 }}
          >
            {attention.length === 0 ? (
              <p className="lede">Nothing needs attention right now.</p>
            ) : (
              <div className="attn-list">
                {attention.map((a) => (
                  <button key={a.id} type="button" className="attn-row" onClick={() => navigate(`/opportunities/${a.oppId}`)}>
                    <div className="attn-row-top">
                      <span className="attn-title">
                        <span className="attn-dot" style={{ background: DUE_COLOR[a.tone] }} />
                        {a.title}
                      </span>
                      <Target size={13} style={{ color: 'var(--muted)' }} />
                    </div>
                    <div className="attn-meta">{a.meta}</div>
                    <div className="attn-cta">{a.cta} →</div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="My queue" sub="Items you own, with SLA status." style={{ marginTop: 20 }}>
            {mine.length === 0 ? <p className="lede">Nothing assigned to you in this unit.</p> : (
              <div className="list-stack">
                {mine.slice(0, 5).map((o) => {
                  const due = relativeDue(o.slaDueAt)
                  return (
                    <button key={o.id} className="list-item" onClick={() => navigate(`/opportunities/${o.id}`)}>
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
        </div>
      </div>
    </>
  )
}
