import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader, Stat } from '../components/ui'
import { money } from '../lib/format'

const TONE = {
  pending: 'warning',
  invoiced: 'info',
  paid: 'success',
  failed: 'danger',
}

export default function Billing() {
  const { opportunities } = useApp()
  const navigate = useNavigate()
  const bills = opportunities.flatMap((o) => (o.billingRequests || []).map((b) => ({ opp: o, b })))
  const unpaid = bills.filter((x) => x.b.paymentStatus !== 'paid').reduce((s, x) => s + x.b.amountEx, 0)
  const paid = bills.filter((x) => x.b.paymentStatus === 'paid').reduce((s, x) => s + x.b.amountEx, 0)

  return (
    <>
      <PageHeader title="Billing" lede="Milestone requests (20 / 40 / 40) and the tax-invoice references recorded from accounting." />
      <div className="stats">
        <Stat label="Requested (ex GST)" value={money(bills.reduce((s, x) => s + x.b.amountEx, 0))} hint={`${bills.length} milestone requests`} />
        <Stat label="Paid" value={money(paid)} />
        <Stat label="Open" value={money(unpaid)} />
        <Stat label="Rebates in flight" value={opportunities.flatMap((o) => o.rebates || []).filter((r) => r.status !== 'Paid').length} />
      </div>
      <div className="card card-pad">
        {bills.length === 0 ? <Empty title="No billing requests yet" body="They appear automatically on acceptance, material delivery and commissioning." /> : (
          <table className="table">
            <thead><tr><th>Job</th><th>Milestone</th><th>Amount</th><th>Invoice</th><th>Status</th></tr></thead>
            <tbody>
              {bills.map(({ opp, b }) => (
                <tr key={b.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                  <td><CustomerCell opp={opp} /></td>
                  <td>{b.percent}% · {b.event}</td>
                  <td>{money(b.amountEx)}</td>
                  <td>{b.invoiceNumber || '—'}</td>
                  <td><Badge tone={TONE[b.paymentStatus] || TONE[b.status] || 'neutral'}>{b.paymentStatus === 'paid' ? 'Paid' : b.invoiceNumber ? 'Invoiced' : b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
