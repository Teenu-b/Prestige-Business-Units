import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BackLink, Field, PageHeader } from '../components/ui'
import { INVOLVEMENT_TIERS, JURISDICTIONS, LEAD_SOURCES } from '../data/constants'
import { hasRole } from '../lib/permissions'

const empty = {
  legalName: '', tradingName: '', abn: '', email: '', phone: '', billingAddress: '',
  line1: '', suburb: '', state: 'NSW', postcode: '', jurisdiction: 'NSW', siteContact: '', accessNotes: '',
  contactName: '', contactRole: '', contactEmail: '', contactPhone: '',
  annualKwh: '', hasBills: false, energyNotes: '', documentName: '',
  leadSource: 'internal', referrerId: '', involvementTier: 'lead_only', estimatorId: '', salespersonId: '', notes: '',
}

export default function NewLead() {
  const { createLead, users, referrers, unit, user } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...empty, leadSource: user.roles.includes('REF') ? 'referrer' : 'internal' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const estimators = users.filter((u) => u.roles.includes('EST') && u.unitIds.includes(unit.id))
  const sales = users.filter((u) => (u.roles.includes('SLS') || u.roles.includes('SS')) && u.unitIds.includes(unit.id))

  const submit = (e) => {
    e.preventDefault()
    const opp = createLead({
      customer: {
        legalName: form.legalName,
        tradingName: form.tradingName,
        abn: form.abn,
        email: form.email,
        phone: form.phone,
        billingAddress: form.billingAddress,
      },
      site: {
        line1: form.line1,
        suburb: form.suburb,
        state: form.state,
        postcode: form.postcode,
        jurisdiction: form.jurisdiction,
        contact: form.siteContact,
        accessNotes: form.accessNotes,
      },
      contact: { name: form.contactName, role: form.contactRole, email: form.contactEmail, phone: form.contactPhone },
      energy: { annualKwh: form.annualKwh ? Number(form.annualKwh) : '', hasBills: form.hasBills, notes: form.energyNotes },
      leadSource: form.leadSource,
      referrerId: form.leadSource === 'referrer' ? form.referrerId : null,
      involvementTier: form.leadSource === 'referrer' ? form.involvementTier : null,
      estimatorId: form.estimatorId,
      salespersonId: form.salespersonId,
      documentName: form.documentName,
      notes: form.notes,
    })
    navigate(`/opportunities/${opp.id}`)
  }

  return (
    <>
      <BackLink />
      <PageHeader title="New lead" lede="Capture the essentials. You can still save an incomplete lead — it just cannot move to estimation until the minimum set is filled." />

      <form onSubmit={submit} className="card card-pad">
        <div className="section">
          <h3>Customer</h3>
          <div className="form-grid">
            <Field label="Legal name"><input required value={form.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
            <Field label="Trading name"><input value={form.tradingName} onChange={(e) => set('tradingName', e.target.value)} /></Field>
            <Field label="ABN"><input value={form.abn} onChange={(e) => set('abn', e.target.value)} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email" className="span-2"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Billing address" className="span-2"><input value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} /></Field>
          </div>
        </div>

        <div className="section">
          <h3>Site</h3>
          <div className="form-grid">
            <Field label="Street" hint="needed to leave this stage" className="span-2"><input value={form.line1} onChange={(e) => set('line1', e.target.value)} /></Field>
            <Field label="Suburb" hint="needed to leave this stage"><input value={form.suburb} onChange={(e) => set('suburb', e.target.value)} /></Field>
            <Field label="State">
              <select value={form.state} onChange={(e) => { set('state', e.target.value); set('jurisdiction', e.target.value) }}>
                {JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}
              </select>
            </Field>
            <Field label="Postcode"><input value={form.postcode} onChange={(e) => set('postcode', e.target.value)} /></Field>
            <Field label="Site contact"><input value={form.siteContact} onChange={(e) => set('siteContact', e.target.value)} /></Field>
            <Field label="Access notes" className="span-2"><input value={form.accessNotes} onChange={(e) => set('accessNotes', e.target.value)} /></Field>
          </div>
        </div>

        <div className="section">
          <h3>Decision-maker</h3>
          <div className="form-grid">
            <Field label="Name"><input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
            <Field label="Role"><input value={form.contactRole} onChange={(e) => set('contactRole', e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
            <Field label="Phone"><input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
          </div>
        </div>

        <div className="section">
          <h3>Energy & source</h3>
          <div className="form-grid">
            <Field label="Annual usage (kWh)" hint="or attach bills"><input value={form.annualKwh} onChange={(e) => set('annualKwh', e.target.value)} /></Field>
            <Field label="Electricity bills">
              <label className="check"><input type="checkbox" checked={form.hasBills} onChange={(e) => set('hasBills', e.target.checked)} /> Bills available / uploaded</label>
              {form.hasBills ? <input placeholder="File name" value={form.documentName} onChange={(e) => set('documentName', e.target.value)} /> : null}
            </Field>
            <Field label="Lead source">
              <select value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)} disabled={hasRole(user, 'REF')}>
                {LEAD_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            {form.leadSource === 'referrer' && !hasRole(user, 'REF') ? (
              <>
                <Field label="Referrer">
                  <select value={form.referrerId} onChange={(e) => set('referrerId', e.target.value)}>
                    <option value="">Select</option>
                    {referrers.map((r) => <option key={r.id} value={r.id}>{r.organisation}</option>)}
                  </select>
                </Field>
                <Field label="Involvement tier">
                  <select value={form.involvementTier} onChange={(e) => set('involvementTier', e.target.value)}>
                    {INVOLVEMENT_TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label="Assign estimator">
              <select value={form.estimatorId} onChange={(e) => set('estimatorId', e.target.value)}>
                <option value="">Later</option>
                {estimators.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Salesperson">
              <select value={form.salespersonId} onChange={(e) => set('salespersonId', e.target.value)}>
                <option value="">Later</option>
                {sales.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Notes" className="span-2"><textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </div>

        <button className="btn btn-primary" type="submit">Save lead</button>
      </form>
    </>
  )
}
