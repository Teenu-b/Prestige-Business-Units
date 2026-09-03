import { useEffect, useState } from 'react'
import { Building2, ClipboardList, MapPin, UserCheck, Zap } from 'lucide-react'
import { Field, SectionHeading } from './ui'
import { INVOLVEMENT_TIERS, JURISDICTIONS, LEAD_SOURCES, LEAD_TYPES, QUALIFICATION } from '../data/constants'
import { hasRole } from '../lib/permissions'

const SECTIONS = [
  { id: 'lf-customer', label: 'Customer', icon: Building2 },
  { id: 'lf-site', label: 'Site', icon: MapPin },
  { id: 'lf-contact', label: 'Decision-maker', icon: UserCheck },
  { id: 'lf-qualification', label: 'Qualification', icon: ClipboardList },
  { id: 'lf-energy', label: 'Energy & source', icon: Zap },
]

function jumpTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function emptyLeadForm(user) {
  return {
    leadType: '',
    legalName: '',
    tradingName: '',
    abn: '',
    email: '',
    phone: '',
    billingAddress: '',
    line1: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    jurisdiction: 'NSW',
    siteContact: '',
    accessNotes: '',
    contactName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    annualKwh: '',
    hasBills: false,
    energyNotes: '',
    documentName: '',
    leadSource: user?.roles?.includes('REF') ? 'referrer' : 'internal',
    referrerId: user?.referrerId || '',
    involvementTier: 'lead_only',
    estimatorId: '',
    salespersonId: '',
    notes: '',
    campaignId: '',
    qualification: 'nurture',
    nextAction: '',
    nextActionDue: '',
    authority: '',
    timing: '',
    opportunityValue: '',
  }
}

export function formFromOpportunity(opp) {
  return {
    leadType: opp.leadType || '',
    legalName: opp.customer?.legalName || '',
    tradingName: opp.customer?.tradingName || '',
    abn: opp.customer?.abn || '',
    email: opp.customer?.email || '',
    phone: opp.customer?.phone || '',
    billingAddress: opp.customer?.billingAddress || '',
    line1: opp.site?.line1 || '',
    suburb: opp.site?.suburb || '',
    state: opp.site?.state || 'NSW',
    postcode: opp.site?.postcode || '',
    jurisdiction: opp.site?.jurisdiction || opp.site?.state || 'NSW',
    siteContact: opp.site?.contact || '',
    accessNotes: opp.site?.accessNotes || '',
    contactName: opp.contact?.name || '',
    contactRole: opp.contact?.role || '',
    contactEmail: opp.contact?.email || '',
    contactPhone: opp.contact?.phone || '',
    annualKwh: opp.energy?.annualKwh || '',
    hasBills: Boolean(opp.energy?.hasBills),
    energyNotes: opp.energy?.notes || '',
    documentName: '',
    leadSource: opp.leadSource || 'internal',
    referrerId: opp.referrerId || '',
    involvementTier: opp.involvementTier || 'lead_only',
    estimatorId: opp.owners?.estimatorId || '',
    salespersonId: opp.owners?.salespersonId || '',
    notes: opp.notes || '',
    campaignId: opp.campaignId || '',
    qualification: opp.qualification || 'nurture',
    nextAction: opp.nextAction || '',
    nextActionDue: (opp.nextActionDue || '').slice(0, 10),
    authority: opp.authority || '',
    timing: opp.timing || '',
    opportunityValue: opp.opportunityValue || '',
  }
}

export function payloadFromLeadForm(form) {
  return {
    leadType: form.leadType,
    customer: {
      legalName: form.legalName.trim(),
      tradingName: form.tradingName.trim(),
      abn: form.abn.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      billingAddress: form.billingAddress.trim(),
    },
    site: {
      line1: form.line1.trim(),
      suburb: form.suburb.trim(),
      state: form.state,
      postcode: form.postcode.trim(),
      jurisdiction: form.jurisdiction || form.state,
      contact: form.siteContact.trim(),
      accessNotes: form.accessNotes.trim(),
    },
    contact: {
      name: form.contactName.trim(),
      role: form.contactRole.trim(),
      email: form.contactEmail.trim(),
      phone: form.contactPhone.trim(),
    },
    energy: {
      annualKwh: form.annualKwh ? Number(form.annualKwh) || form.annualKwh : '',
      hasBills: form.hasBills,
      notes: form.energyNotes.trim(),
    },
    leadSource: form.leadSource,
    referrerId: form.leadSource === 'referrer' ? form.referrerId : null,
    involvementTier: form.leadSource === 'referrer' ? form.involvementTier : null,
    estimatorId: form.estimatorId,
    salespersonId: form.salespersonId,
    documentName: form.documentName.trim(),
    notes: form.notes.trim(),
    campaignId: form.campaignId,
    qualification: form.qualification,
    nextAction: form.nextAction.trim(),
    nextActionDue: form.nextActionDue,
    authority: form.authority.trim(),
    timing: form.timing.trim(),
    opportunityValue: form.opportunityValue,
  }
}

export function estimatorChoices(users, unitId) {
  const list = users.filter((u) => u.roles.includes('EST'))
  if (list.length) return list
  return users.filter((u) => (
    u.roles.some((r) => r === 'BDM' || r === 'DIR' || r === 'ADM')
    && (!unitId || u.unitIds.includes(unitId))
  ))
}

function blank(value) {
  return !String(value || '').trim()
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export function validateLeadForm(form) {
  const errors = {}
  if (!form.leadType) errors.leadType = 'Classify the lead as Residential or Commercial.'
  if (blank(form.legalName)) errors.legalName = 'Enter the customer legal name.'
  if (String(form.email || '').trim() && !validEmail(form.email)) errors.email = 'Enter a valid customer email.'
  if (blank(form.line1)) errors.line1 = 'Enter the site street.'
  if (blank(form.suburb)) errors.suburb = 'Enter the suburb.'
  if (blank(form.contactName)) errors.contactName = 'Enter the decision-maker name.'
  if (blank(form.contactEmail)) errors.contactEmail = 'Enter the decision-maker email.'
  else if (!validEmail(form.contactEmail)) errors.contactEmail = 'Enter a valid decision-maker email.'
  if (blank(form.annualKwh) && !form.hasBills) {
    errors.annualKwh = 'Enter annual kWh or tick that bills are on file.'
    errors.hasBills = 'Enter annual kWh or tick that bills are on file.'
  }
  if (!form.leadSource) errors.leadSource = 'Select a lead source.'
  if (form.leadSource === 'referrer' && blank(form.referrerId)) errors.referrerId = 'Select the referrer who introduced this lead.'
  if (blank(form.estimatorId)) errors.estimatorId = 'Assign an estimator to leave qualification.'
  if (!form.qualification) errors.qualification = 'Set qualification outcome.'
  if (form.qualification === 'qualified') {
    if (blank(form.nextAction)) errors.nextAction = 'Set the next action.'
    if (blank(form.nextActionDue)) errors.nextActionDue = 'Set a due date.'
  }
  return errors
}

export default function LeadForm({ form, set, errors = {}, estimators, sales, referrers, user, campaigns = [], allowQualified = true }) {
  const err = (key) => errors[key]
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div className="form-nav">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className={active === s.id ? 'active' : ''} onClick={() => { setActive(s.id); jumpTo(s.id) }}>
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>
      <div className="section" id="lf-customer">
        <SectionHeading icon={<Building2 size={13} />} title="Customer" />
        <div className="form-grid">
          <Field label="Lead type" error={err('leadType')} className="span-2">
            <select value={form.leadType} onChange={(e) => set('leadType', e.target.value)}>
              <option value="">Select</option>
              {LEAD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Legal name" error={err('legalName')}><input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="Trading name"><input value={form.tradingName} onChange={(e) => set('tradingName', e.target.value)} /></Field>
          <Field label="ABN"><input value={form.abn} onChange={(e) => set('abn', e.target.value)} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email" className="span-2" error={err('email')}><input value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" /></Field>
          <Field label="Billing address" className="span-2"><input value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} /></Field>
        </div>
      </div>

      <div className="section" id="lf-site">
        <SectionHeading icon={<MapPin size={13} />} title="Site" />
        <div className="form-grid">
          <Field label="Street" className="span-2" error={err('line1')}><input value={form.line1} onChange={(e) => set('line1', e.target.value)} /></Field>
          <Field label="Suburb" error={err('suburb')}><input value={form.suburb} onChange={(e) => set('suburb', e.target.value)} /></Field>
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

      <div className="section" id="lf-contact">
        <SectionHeading icon={<UserCheck size={13} />} title="Decision-maker" />
        <div className="form-grid">
          <Field label="Name" error={err('contactName')}><input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
          <Field label="Role"><input value={form.contactRole} onChange={(e) => set('contactRole', e.target.value)} /></Field>
          <Field label="Email" error={err('contactEmail')}><input value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} autoComplete="off" /></Field>
          <Field label="Phone"><input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
        </div>
      </div>

      <div className="section" id="lf-qualification">
        <SectionHeading icon={<ClipboardList size={13} />} title="Qualification" />
        <div className="form-grid">
          <Field label="Campaign" hint="optional — referrer, inbound or outreach is fine">
            <select value={form.campaignId} onChange={(e) => set('campaignId', e.target.value)}>
              <option value="">None / exception</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field
            label="Qualification"
            error={err('qualification')}
            hint={!allowQualified ? 'log a client meeting and attach a site photo or sketch to unlock Qualified' : undefined}
          >
            <select value={form.qualification} onChange={(e) => set('qualification', e.target.value)}>
              {QUALIFICATION.filter((q) => q.key !== 'qualified' || allowQualified).map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
            </select>
          </Field>
          <Field label="Authority / decision-maker"><input value={form.authority} onChange={(e) => set('authority', e.target.value)} /></Field>
          <Field label="Timing"><input value={form.timing} onChange={(e) => set('timing', e.target.value)} /></Field>
          <Field label="Opportunity value"><input value={form.opportunityValue} onChange={(e) => set('opportunityValue', e.target.value)} /></Field>
          <Field label="Next action" error={err('nextAction')}><input value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
          <Field label="Due date" error={err('nextActionDue')}><input type="date" value={form.nextActionDue} onChange={(e) => set('nextActionDue', e.target.value)} /></Field>
        </div>
      </div>

      <div className="section" id="lf-energy">
        <SectionHeading icon={<Zap size={13} />} title="Energy & source" />
        <div className="form-grid">
          <Field label="Annual usage (kWh)" hint="or tick bills on file" error={err('annualKwh')}>
            <input value={form.annualKwh} onChange={(e) => set('annualKwh', e.target.value)} />
          </Field>
          <Field label="Electricity bills" error={err('hasBills')}>
            <label className="check">
              <input type="checkbox" checked={form.hasBills} onChange={(e) => set('hasBills', e.target.checked)} />
              Bills available / uploaded
            </label>
            {form.hasBills ? <input placeholder="File name" value={form.documentName} onChange={(e) => set('documentName', e.target.value)} /> : null}
          </Field>
          <Field label="Lead source" error={err('leadSource')}>
            <select value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)} disabled={hasRole(user, 'REF')}>
              {LEAD_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          {form.leadSource === 'referrer' && !hasRole(user, 'REF') ? (
            <>
              <Field label="Referrer" error={err('referrerId')}>
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
          <Field label="Assign estimator" hint="required to leave qualification" error={err('estimatorId')} className="span-2">
            <select value={form.estimatorId} onChange={(e) => set('estimatorId', e.target.value)}>
              <option value="">Select estimator</option>
              {estimators.map((u) => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ''}</option>)}
            </select>
            {!estimators.length ? <span className="field-error">No estimator is set up. Add an Estimator in Admin, then return here.</span> : null}
          </Field>
          <Field label="BDM / salesperson">
            <select value={form.salespersonId} onChange={(e) => set('salespersonId', e.target.value)}>
              <option value="">Later</option>
              {sales.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="span-2"><textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>
      </div>
    </>
  )
}
