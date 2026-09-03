import { useNavigate } from 'react-router-dom'
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
        <Stat label="Total cost (ex GST)" value={money(totalCost)} hint={`${rows.length} priced jobs`} />
        <Stat label="Total price (ex GST)" value={money(totalPrice)} />
        <Stat label="Below margin floor" value={belowFloorCount} hint={belowFloorCount ? 'Needs director approval to issue' : 'All within authority'} />
      </div>
      <div className="card card-pad">
        {rows.length === 0 ? (
          <Empty title="No estimates yet" body="Cost and price appear once an estimator saves a solution option." />
        ) : (
          <table className="table">
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
                    <td><CustomerCell opp={opp} /></td>
                    <td>
                      <div className="row-title">{option.name || 'Option'}</div>
                      <div className="row-meta">{option.product || option.brand}</div>
                    </td>
                    <td>{money(option.costEx)}</td>
                    <td>{money(option.priceEx)}</td>
                    <td><Badge tone={low ? 'danger' : 'success'}>{pct(option.margin)}</Badge></td>
                    <td><Badge tone={latest.issued ? 'info' : 'neutral'}>{latest.issued ? 'Issued' : 'Draft'}</Badge></td>
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
