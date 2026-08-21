import { useNavigate } from 'react-router-dom'
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
        {rows.length === 0 ? <Empty title="Nothing outstanding" body="All tracked approvals are granted or marked not required." /> : (
          <table className="table">
            <thead><tr><th>Job</th><th>Approval</th><th>Status</th><th>SLA</th></tr></thead>
            <tbody>
              {rows.map(({ opp, approval }) => (
                <tr key={approval.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                  <td><CustomerCell opp={opp} /></td>
                  <td>{approval.label}</td>
                  <td><Badge tone={approval.status === 'Rejected' ? 'danger' : 'warning'}>{approval.status}</Badge></td>
                  <td><Badge tone={relativeDue(opp.slaDueAt).tone}>{relativeDue(opp.slaDueAt).label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
