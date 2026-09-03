import { useNavigate } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader } from '../components/ui'
import { relativeDue } from '../lib/format'

export default function Approvals() {
  const { opportunities } = useApp()
  const navigate = useNavigate()
  const rows = opportunities.flatMap((o) =>
    (o.approvals || [])
      .filter((a) => !['Approved', 'Not Required'].includes(a.status))
      .map((a) => ({ opp: o, approval: a })),
  )

  return (
    <>
      <PageHeader title="Approvals" lede="Outstanding council, DNSP, strata and rebate items across live jobs. Open a record to update status." />
      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty icon={<CheckSquare size={28} strokeWidth={1.5} />} title="Nothing outstanding" body="All tracked approvals are granted or marked not required." />
        ) : (
          <div className="table-wrap">
            <table className="table stack">
              <thead><tr><th>Job</th><th>Approval</th><th>Status</th><th>SLA</th></tr></thead>
              <tbody>
                {rows.map(({ opp, approval }) => (
                  <tr key={approval.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                    <td data-label="Job"><CustomerCell opp={opp} /></td>
                    <td data-label="Approval">{approval.label}</td>
                    <td data-label="Status"><Badge tone={approval.status === 'Rejected' ? 'danger' : 'warning'}>{approval.status}</Badge></td>
                    <td data-label="SLA"><Badge tone={relativeDue(opp.slaDueAt).tone}>{relativeDue(opp.slaDueAt).label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
