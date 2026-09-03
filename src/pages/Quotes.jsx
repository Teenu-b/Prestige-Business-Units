import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader, Stat } from '../components/ui'
import { formatDate, money, pct } from '../lib/format'
import { canSeeCost } from '../lib/permissions'
import { currentProposal, incGst } from '../lib/workflow'

const TONE = {
  draft: 'neutral',
  presented: 'warning',
  pending_director: 'warning',
  issued: 'info',
  accepted: 'success',
  rejected: 'danger',
  're-estimated': 'warning',
}

const LABEL = {
  draft: 'Draft',
  presented: 'Presented',
  pending_director: 'Pending director',
  issued: 'Issued',
  accepted: 'Accepted',
  rejected: 'Rejected',
  're-estimated': 'Re-estimated',
}

export default function Quotes() {
  const { opportunities, user } = useApp()
  const navigate = useNavigate()
  const showCost = canSeeCost(user)

  const rows = opportunities
    .map((o) => ({ opp: o, quote: currentProposal(o) }))
    .filter((r) => r.quote)
    .sort((a, b) => new Date(b.quote.presentedAt || b.quote.issuedAt || 0) - new Date(a.quote.presentedAt || a.quote.issuedAt || 0))

  const totalValue = rows.reduce((s, r) => s + (Number(r.quote.priceEx) || 0), 0)
  const acceptedRows = rows.filter((r) => r.quote.status === 'accepted')
  const acceptedValue = acceptedRows.reduce((s, r) => s + (Number(r.quote.priceEx) || 0), 0)
  const pendingDirector = rows.filter((r) => r.quote.status === 'pending_director').length

  return (
    <>
      <PageHeader title="Quotes" lede="Every current proposal, one row per job. Open a record to negotiate, present or record acceptance." />
      <div className="stats">
        <Stat label="Quoted (ex GST)" value={money(totalValue)} hint={`${rows.length} live quotes`} />
        <Stat label="Accepted" value={money(acceptedValue)} hint={`${acceptedRows.length} accepted`} />
        <Stat label="Awaiting director" value={pendingDirector} hint={pendingDirector ? 'Below-floor pricing' : 'None pending'} />
      </div>
      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty title="No quotes yet" body="Quotes are generated from an accepted estimate on the Proposal stage." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Quote</th>
                <th>Value</th>
                {showCost ? <th>Margin</th> : null}
                <th>Status</th>
                <th>Presented / accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ opp, quote }) => (
                <tr key={quote.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                  <td><CustomerCell opp={opp} /></td>
                  <td>
                    <div className="row-title">{quote.number}</div>
                    <div className="row-meta">v{quote.version}</div>
                  </td>
                  <td>
                    {money(quote.priceEx)} <span className="row-meta">({money(incGst(quote.priceEx))} inc)</span>
                  </td>
                  {showCost ? <td>{pct(quote.margin)}</td> : null}
                  <td><Badge tone={TONE[quote.status] || 'neutral'}>{LABEL[quote.status] || quote.status}</Badge></td>
                  <td>{quote.acceptedAt ? `Accepted ${formatDate(quote.acceptedAt)}` : quote.presentedAt ? `Presented ${formatDate(quote.presentedAt)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
