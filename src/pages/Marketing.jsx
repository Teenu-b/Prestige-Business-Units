import { useMemo, useState } from 'react'
import { CheckCircle2, Megaphone, Sparkles, Target, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, Empty, Field, PageHeader, Stat, Tabs } from '../components/ui'
import { canApproveCampaign, canManageCampaigns } from '../lib/permissions'
import { money } from '../lib/format'
import { selectedOption } from '../lib/workflow'
import { toast } from '../lib/toast'

const METRICS = [
  { key: 'leads', label: 'Leads' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'won', label: 'Won jobs' },
  { key: 'value', label: 'Pipeline value' },
]

function oppValue(o) {
  return Number(selectedOption(o)?.priceEx || o.acceptedValue || 0)
}

function isWon(o) {
  return o.stage >= 6 || (o.proposals || []).some((p) => p.status === 'accepted' || p.acceptedAt)
}

function campaignStats(campaigns, opportunities) {
  return (campaigns || []).map((c) => {
    const rows = (opportunities || []).filter((o) => o.campaignId === c.id)
    const qualified = rows.filter((o) => o.qualification === 'qualified' || o.stage >= 3)
    const won = rows.filter(isWon)
    const value = rows.reduce((sum, o) => sum + oppValue(o), 0)
    const leads = rows.length
    const spend = Number(c.actualSpend) || 0
    return {
      ...c,
      leads,
      qualified: qualified.length,
      won: won.length,
      value,
      costPerLead: leads ? spend / leads : 0,
    }
  })
}

function CampaignChart({ rows, metric }) {
  const max = Math.max(...rows.map((r) => Number(r[metric]) || 0), 1)
  const high = rows.reduce((best, r) => ((Number(r[metric]) || 0) > (Number(best[metric]) || 0) ? r : best), rows[0])
  return (
    <div className="chart" role="img" aria-label={`Campaign ${metric} comparison`}>
      {rows.map((r) => {
        const n = Number(r[metric]) || 0
        const pct = Math.round((n / max) * 100)
        const top = high?.id === r.id && n > 0
        return (
          <div className={`chart-row ${top ? 'high' : ''}`} key={r.id}>
            <div className="chart-label">
              <strong>{r.name}</strong>
              <span>{r.channel}</span>
            </div>
            <div className="chart-track">
              <div className="chart-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="chart-value">
              {metric === 'value' || metric === 'costPerLead' ? money(n) : n}
              {top ? <em> Highest</em> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Marketing() {
  const { campaigns, saveCampaign, approveCampaign, user, unit, allOpportunities } = useApp()
  const can = canManageCampaigns(user)
  const [metric, setMetric] = useState('leads')
  const [draft, setDraft] = useState({
    name: '',
    channel: '',
    audience: '',
    objective: '',
    budget: '',
    actualSpend: '',
  })

  const rows = useMemo(
    () => campaignStats(campaigns, allOpportunities).sort((a, b) => (b[metric] || 0) - (a[metric] || 0)),
    [campaigns, allOpportunities, metric],
  )
  const leader = rows[0]
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0)
  const totalWon = rows.reduce((s, r) => s + r.won, 0)
  const totalSpend = rows.reduce((s, r) => s + (Number(r.actualSpend) || 0), 0)

  return (
    <>
      <PageHeader
        title="Marketing planning & approval"
        lede="Campaign briefs must be approved before they become lead sources. The chart shows which campaign is producing the most leads, qualified opportunities or won jobs in this unit."
      />

      <div className="stats">
        <Stat icon={<Megaphone size={17} />} label="Campaigns" value={rows.length} hint="In this business unit" style={{ '--i': 0 }} />
        <Stat icon={<Target size={17} />} label="Linked leads" value={totalLeads} hint="Opportunities with a campaign" style={{ '--i': 1 }} />
        <Stat icon={<CheckCircle2 size={17} />} label="Won from campaigns" value={totalWon} hint="Accepted / in delivery" style={{ '--i': 2 }} />
        <Stat icon={<Wallet size={17} />} label="Recorded spend" value={money(totalSpend)} hint="Actual marketing expenditure" style={{ '--i': 3 }} />
      </div>

      <Card title="Campaign performance" icon={<Sparkles size={16} />} style={{ marginBottom: 16 }}>
        <p className="sub">
          {leader && (leader[metric] || 0) > 0
            ? `${leader.name} is currently highest on ${METRICS.find((m) => m.key === metric)?.label.toLowerCase()}.`
            : 'Link leads to a campaign to see performance.'}
        </p>
        <Tabs value={metric} onChange={setMetric} items={METRICS} />
        {rows.length === 0 ? (
          <Empty title="No campaigns in this unit yet" body="Add a campaign brief below to start tracking performance." />
        ) : (
          <CampaignChart rows={rows} metric={metric} />
        )}
      </Card>

      {(campaigns || []).map((c) => {
        const stat = rows.find((r) => r.id === c.id)
        return (
          <div className="card card-pad" key={c.id} style={{ marginBottom: 12 }}>
            <div className="row-title">{c.name}{stat && leader?.id === c.id && (leader[metric] || 0) > 0 ? ' · highest' : ''}</div>
            <div className="row-meta">
              {c.channel} · Budget {money(c.budget)} · Spend {money(c.actualSpend)} · {c.status}
              {stat ? ` · ${stat.leads} leads · ${stat.qualified} qualified · ${stat.won} won · ${money(stat.value)} pipeline` : ''}
              {stat?.leads ? ` · ${money(stat.costPerLead)} per lead` : ''}
            </div>
            <p className="lede">{c.objective}</p>
            {c.status !== 'approved' && canApproveCampaign(user) ? (
              <button className="btn btn-primary btn-sm" onClick={() => { approveCampaign(c.id); toast(`${c.name} approved`) }}>Approve campaign</button>
            ) : null}
          </div>
        )
      })}
      {can ? (
        <div className="card card-pad">
          <h2>New campaign brief</h2>
          <div className="form-grid">
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Channel"><input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} /></Field>
            <Field label="Target audience" className="span-2"><input value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} /></Field>
            <Field label="Objective" className="span-2"><input value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} /></Field>
            <Field label="Budget"><input type="number" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} /></Field>
            <Field label="Actual spend"><input type="number" value={draft.actualSpend} onChange={(e) => setDraft({ ...draft, actualSpend: e.target.value })} /></Field>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            disabled={!draft.name}
            onClick={() => {
              saveCampaign({
                ...draft,
                budget: Number(draft.budget) || 0,
                actualSpend: Number(draft.actualSpend) || 0,
                ownerId: user.id,
                businessUnitId: unit.id,
                status: 'draft',
              })
              setDraft({ name: '', channel: '', audience: '', objective: '', budget: '', actualSpend: '' })
              toast('Campaign brief saved')
            }}
          >
            Save brief
          </button>
        </div>
      ) : null}
    </>
  )
}
