import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader } from '../components/ui'
import { QUALIFICATION } from '../data/constants'
import { relativeDue } from '../lib/format'
import { canCreateLead } from '../lib/permissions'
import { workStage } from '../lib/workflow'

export default function Leads() {
  const { opportunities, user } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [qualFilter, setQualFilter] = useState('')

  const rows = useMemo(() => {
    return opportunities
      .filter((o) => workStage(o.stage) === 2)
      .filter((o) => (qualFilter ? o.qualification === qualFilter : true))
      .filter((o) => {
        const hay = `${o.number || ''} ${o.customer?.legalName || ''} ${o.site?.suburb || ''}`.toLowerCase()
        return hay.includes(q.toLowerCase())
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [opportunities, q, qualFilter])

  return (
    <>
      <PageHeader
        title="Leads"
        lede="Not yet in the pipeline. Log a client meeting and attach site photos or sketches on the record, then mark the lead Qualified to attach it to the pipeline."
        actions={canCreateLead(user) ? <Link className="btn btn-primary" to="/leads/new">New lead</Link> : null}
      />

      <div className="toolbar">
        <input className="search" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={qualFilter} onChange={(e) => setQualFilter(e.target.value)}>
          <option value="">All qualification</option>
          {QUALIFICATION.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
        </select>
      </div>

      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty title="No leads waiting" body="Every lead has been qualified or moved out. Capture a new one to get started." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Qualification</th>
                <th>Meeting / site visit</th>
                <th>Next action</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const due = relativeDue(o.slaDueAt)
                const hasMeeting = (o.meetings || []).length > 0
                const hasEvidence = (o.documents || []).some((d) => d.stage === 2 && (d.type === 'site_photo' || d.type === 'drawing'))
                const qual = QUALIFICATION.find((x) => x.key === o.qualification) || QUALIFICATION[1]
                return (
                  <tr key={o.id} onClick={() => navigate(`/opportunities/${o.id}`)}>
                    <td><CustomerCell opp={o} /></td>
                    <td><Badge tone={o.qualification === 'qualified' ? 'success' : o.qualification === 'disqualified' ? 'danger' : 'warning'}>{qual.label}</Badge></td>
                    <td>
                      {hasMeeting && hasEvidence ? (
                        <Badge tone="success">Ready to qualify</Badge>
                      ) : (
                        <Badge tone="neutral">{hasMeeting ? 'Meeting logged' : hasEvidence ? 'Site evidence added' : 'Not started'}</Badge>
                      )}
                    </td>
                    <td>{o.nextAction || '—'}</td>
                    <td><Badge tone={due.tone}>{due.label}</Badge></td>
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
