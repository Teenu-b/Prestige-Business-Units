import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CircleDollarSign, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, CustomerCell, Empty, PageHeader, Stat } from '../components/ui'
import { money, pct } from '../lib/format'
import { canSeeCost } from '../lib/permissions'
import { belowFloor, selectedOption } from '../lib/workflow'

export default function Costs() {
  const { opportunities, user } = useApp()
  const navigate = useNavigate()

  if (!canSeeCost(user)) {
    return (
      <>
        <PageHeader title="Costs" lede="Cost and margin are hidden from your role." />
        <div className="card card-pad">
          <p className="lede">Sign in as an estimator, BDM, business operations, accounts or director to see costing.</p>
        </div>
      </>
    )
  }

  const rows = opportunities
    .map((o) => {
      const latest = [...(o.estimates || [])].sort((a, b) => b.version - a.version)[0]
      const option = selectedOption(o)
      return latest && option ? { opp: o, latest, option } : null
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.opp.updatedAt) - new Date(a.opp.updatedAt))

  const totalCost = rows.reduce((s, r) => s + (Number(r.option.costEx) || 0), 0)
  const totalPrice = rows.reduce((s, r) => s + (Number(r.option.priceEx) || 0), 0)
  const belowFloorCount = rows.filter((r) => belowFloor(r.option.margin, r.opp.marginFloor)).length

  return (
    <>
      <PageHeader title="Costs" lede="Cost, price and margin from the current estimate on every live job." />
      <div className="stats">
        <Stat icon={<CircleDollarSign size={17} />} label="Total cost (ex GST)" value={money(totalCost)} hint={`${rows.length} priced jobs`} style={{ '--i': 0 }} />
        <Stat icon={<TrendingUp size={17} />} label="Total price (ex GST)" value={money(totalPrice)} style={{ '--i': 1 }} />
        <Stat icon={<AlertTriangle size={17} />} label="Below margin floor" value={belowFloorCount} hint={belowFloorCount ? 'Needs director approval to issue' : 'All within authority'} style={{ '--i': 2 }} />
      </div>
      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty title="No estimates yet" body="Cost and price appear once an estimator saves a solution option." />
        ) : (
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Option</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ opp, latest, option }) => {
                  const low = belowFloor(option.margin, opp.marginFloor)
                  return (
                    <tr key={opp.id} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                      <td data-label="Job"><CustomerCell opp={opp} /></td>
                      <td data-label="Option">
                        <div className="row-title">{option.name || 'Option'}</div>
                        <div className="row-meta">{option.product || option.brand}</div>
                      </td>
                      <td data-label="Cost">{money(option.costEx)}</td>
                      <td data-label="Price">{money(option.priceEx)}</td>
                      <td data-label="Margin"><Badge tone={low ? 'danger' : 'success'}>{pct(option.margin)}</Badge></td>
                      <td data-label="Status"><Badge tone={latest.issued ? 'info' : 'neutral'}>{latest.issued ? 'Issued' : 'Draft'}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
