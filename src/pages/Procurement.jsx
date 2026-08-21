import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader } from '../components/ui'
import { formatDate, money } from '../lib/format'

export default function Procurement() {
  const { opportunities } = useApp()
  const navigate = useNavigate()
  const rows = opportunities.flatMap((o) => (o.purchaseOrders || []).map((po) => ({ opp: o, po })))

  return (
    <>
      <PageHeader title="Materials" lede="Purchase orders and delivery dates, so site windows can line up with what is actually arriving." />
      <div className="card card-pad">
        {rows.length === 0 ? <Empty title="No purchase orders" body="POs are raised from an opportunity once approvals are in place." /> : (
          <table className="table">
            <thead><tr><th>Job</th><th>PO</th><th>Amount</th><th>ETA</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(({ opp, po }) => (
                <tr key={po.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                  <td><CustomerCell opp={opp} /></td>
                  <td>
                    <div className="row-title">{po.ref}</div>
                    <div className="row-meta">{po.supplier}</div>
                  </td>
                  <td>{money(po.amount)}</td>
                  <td>{po.eta || '—'}</td>
                  <td><Badge tone={po.status === 'delivered' ? 'success' : po.status === 'confirmed' ? 'info' : 'warning'}>{po.deliveredAt ? `Delivered ${formatDate(po.deliveredAt)}` : po.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
