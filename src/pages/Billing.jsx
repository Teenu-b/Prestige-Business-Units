import { useNavigate } from 'react-router-dom'
import { CircleDollarSign, Gift, Receipt, Wallet } from 'lucide-react'
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
        <Stat icon={<Receipt size={17} />} label="Requested (ex GST)" value={money(bills.reduce((s, x) => s + x.b.amountEx, 0))} hint={`${bills.length} milestone requests`} style={{ '--i': 0 }} />
        <Stat icon={<CircleDollarSign size={17} />} label="Paid" value={money(paid)} style={{ '--i': 1 }} />
        <Stat icon={<Wallet size={17} />} label="Open" value={money(unpaid)} style={{ '--i': 2 }} />
        <Stat icon={<Gift size={17} />} label="Rebates in flight" value={opportunities.flatMap((o) => o.rebates || []).filter((r) => r.status !== 'Paid').length} style={{ '--i': 3 }} />
      </div>
      <div className="card card-pad">
        {bills.length === 0 ? <Empty title="No billing requests yet" body="They appear automatically on acceptance, material delivery and commissioning." /> : (
          <div className="table-wrap">
            <table className="table stack">
              <thead><tr><th>Job</th><th>Milestone</th><th>Amount</th><th>Invoice</th><th>Status</th></tr></thead>
              <tbody>
                {bills.map(({ opp, b }) => (
                  <tr key={b.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                    <td data-label="Job"><CustomerCell opp={opp} /></td>
                    <td data-label="Milestone">{b.percent}% · {b.event}</td>
                    <td data-label="Amount">{money(b.amountEx)}</td>
                    <td data-label="Invoice">{b.invoiceNumber || '—'}</td>
                    <td data-label="Status"><Badge tone={TONE[b.paymentStatus] || TONE[b.status] || 'neutral'}>{b.paymentStatus === 'paid' ? 'Paid' : b.invoiceNumber ? 'Invoiced' : b.status}</Badge></td>
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
