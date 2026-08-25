import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Field, Modal, PageHeader } from '../components/ui'
import { INVOLVEMENT_TIERS } from '../data/constants'
import { money, pct } from '../lib/format'
import { canAdmin, hasRole } from '../lib/permissions'
import { commissionFor, selectedOption } from '../lib/workflow'

export default function Referrers() {
  const { referrers, opportunities, saveReferrer, user } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ organisation: '', contact: '', email: '', phone: '', paymentRef: '' })
  const canEdit = canAdmin(user) || hasRole(user, 'BDM', 'DIR', 'DBD')

  return (
    <>
      <PageHeader
        title="Referrers"
        lede="External introducers and the leads they own. Commission is calculated on accepted contract value by involvement tier."
        actions={canEdit ? <button className="btn btn-primary" onClick={() => setOpen(true)}>Register referrer</button> : null}
      />
      <div className="card card-pad">
        {referrers.map((r) => {
          const leads = opportunities.filter((o) => o.referrerId === r.id)
          const earned = leads.reduce((sum, o) => sum + (commissionFor(o)?.amount || 0), 0)
          return (
            <div className="list-item" key={r.id}>
              <div>
                <div className="row-title">{r.organisation}</div>
                <div className="row-meta">{r.contact} · {r.email}</div>
                {hasRole(user, 'ACC', 'DIR', 'ADM') ? <div className="row-meta">{r.paymentRef}</div> : null}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>{leads.length} leads</div>
                {hasRole(user, 'ACC', 'DIR', 'ADM', 'BDM', 'DBD') ? <div className="row-meta">{money(earned)} calculated</div> : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card card-pad" style={{ marginTop: 20 }}>
        <h2>Introduced opportunities</h2>
        <p className="sub">Tier rates: {INVOLVEMENT_TIERS.map((t) => `${t.label} ${pct(t.rate * 100, 0)}`).join(' · ')}</p>
        <table className="table">
          <thead><tr><th>Opportunity</th><th>Referrer</th><th>Tier</th><th>Value</th></tr></thead>
          <tbody>
            {opportunities.filter((o) => o.referrerId).map((o) => {
              const ref = referrers.find((r) => r.id === o.referrerId)
              const tier = INVOLVEMENT_TIERS.find((t) => t.key === o.involvementTier)
              return (
                <tr key={o.id}>
                  <td><Link to={`/opportunities/${o.id}`}><span className="row-title">{o.customer.legalName}</span><div className="row-meta">{o.number}</div></Link></td>
                  <td>{ref?.organisation}</td>
                  <td>{tier?.label || '—'}</td>
                  <td>{money(selectedOption(o)?.priceEx || o.acceptedValue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title="Register referrer" onClose={() => setOpen(false)} actions={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { saveReferrer(form); setOpen(false) }}>Save</button>
          </>
        }>
          <div className="form-grid">
            <Field label="Organisation" className="span-2"><input value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} /></Field>
            <Field label="Contact"><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email" className="span-2"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Payment reference" className="span-2"><input value={form.paymentRef} onChange={(e) => setForm({ ...form, paymentRef: e.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
