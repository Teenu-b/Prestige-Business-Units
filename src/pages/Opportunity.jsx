import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import StageStepper from '../components/StageStepper'
import { Badge, Field, Modal } from '../components/ui'
import {
  LIFECYCLE,
  PRODUCT_RANGES,
  SITE_SUBSTAGES,
} from '../data/constants'
import { formatDate, money, pct, relativeDue, uid } from '../lib/format'
import {
  canAdvance,
  canApprovePricing,
  canEditEstimate,
  canIssueProposal,
  canManageApprovals,
  canManageBilling,
  canManageProcurement,
  canSeeCost,
  canSignSite,
  hasRole,
} from '../lib/permissions'
import {
  belowFloor,
  calcMargin,
  commissionFor,
  currentProposal,
  gateStatus,
  incGst,
  missingLeadFields,
  selectedOption,
  stageMeta,
} from '../lib/workflow'

export default function Opportunity() {
  const { id } = useParams()
  const app = useApp()
  const opp = app.opportunities.find((o) => o.id === id) || app.allOpportunities.find((o) => o.id === id)
  const [tab, setTab] = useState('work')
  const [gateError, setGateError] = useState(null)

  if (!opp) {
    return (
      <div className="card card-pad">
        <h2>Opportunity not found</h2>
        <p className="lede">It may belong to another business unit, or you may not have access.</p>
        <Link to="/pipeline" className="btn btn-primary">Back to pipeline</Link>
      </div>
    )
  }

  const option = selectedOption(opp)
  const gate = gateStatus(opp)
  const due = relativeDue(opp.slaDueAt)
  const userName = (id) => app.users.find((u) => u.id === id)?.name || '—'

  const advance = () => {
    const result = app.advanceStage(opp.id)
    if (!result.ok) setGateError(result.missing)
    else setGateError(null)
  }

  return (
    <>
      <Link to="/pipeline" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>Pipeline</Link>
      <div className="opp-hero">
        <div>
          <div className="kicker">{opp.number}</div>
          <h1>{opp.customer.legalName}</h1>
          <div className="meta-row">
            <span>{opp.site.line1}, {opp.site.suburb} {opp.site.state} {opp.site.postcode}</span>
            <span>{money(option?.priceEx || opp.acceptedValue)}</span>
            {canSeeCost(app.user) && option ? <span>Margin {pct(option.margin)}</span> : null}
            <Badge tone={LIFECYCLE[opp.lifecycle].tone}>{LIFECYCLE[opp.lifecycle].label}</Badge>
            <Badge tone={due.tone}>{due.label}</Badge>
            {opp.variationPending ? <Badge tone="warning">Variation pending</Badge> : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canAdvance(app.user, opp) && opp.stage < 9 && opp.lifecycle === 'Active' ? (
            <button className="btn btn-primary" onClick={advance} disabled={!gate.canAdvance}>
              Advance to {stageMeta(Math.min(9, opp.stage + 1)).short}
            </button>
          ) : null}
        </div>
      </div>

      <StageStepper stage={opp.stage} />

      {gateError ? <div className="alert warning">Still needed: {gateError.join(', ')}</div> : null}
      {!gate.canAdvance && opp.lifecycle === 'Active' ? (
        <div className="alert info">To leave {stageMeta(opp.stage).label}: {gate.missing.join(' · ')}</div>
      ) : null}

      <div className="tabs">
        <button className={tab === 'work' ? 'active' : ''} onClick={() => setTab('work')}>Current stage</button>
        <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>Documents</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'work' ? <StagePanel opp={opp} app={app} userName={userName} /> : null}
      {tab === 'files' ? (
        <div className="card card-pad">
          {(opp.documents || []).length === 0 ? <p className="lede">No files yet.</p> : (
            <table className="table">
              <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Mirror</th></tr></thead>
              <tbody>
                {opp.documents.map((d) => (
                  <tr key={d.id} style={{ cursor: 'default' }}>
                    <td>{d.name}</td>
                    <td>{d.type}</td>
                    <td>{formatDate(d.uploadedAt, true)}</td>
                    <td><Badge tone={d.mirrorStatus === 'mirrored' ? 'success' : 'warning'}>{d.mirrorStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
      {tab === 'history' ? (
        <div className="card card-pad">
          {(opp.audit || []).map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <div className="row-title">{a.action}</div>
                <div className="row-meta">{a.detail}</div>
              </div>
              <div className="row-meta">{userName(a.actorId)} · {formatDate(a.at, true)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

function StagePanel({ opp, app, userName }) {
  const panels = {
    1: LeadPanel,
    2: EstimatePanel,
    3: ProposalPanel,
    4: ClosurePanel,
    5: ApprovalsPanel,
    6: ProcurementPanel,
    7: SitePanel,
    8: BillingPanel,
    9: HandoverPanel,
  }
  const Cmp = panels[opp.stage] || LeadPanel
  return (
    <div className="panel">
      <Cmp opp={opp} app={app} userName={userName} />
    </div>
  )
}

function LeadPanel({ opp, app }) {
  const missing = missingLeadFields(opp)
  const estimators = app.users.filter((u) => u.roles.includes('EST') && u.unitIds.includes(app.unit.id))
  const [pack, setPack] = useState({
    contactName: opp.contact?.name || '',
    contactEmail: opp.contact?.email || '',
    line1: opp.site?.line1 || '',
    suburb: opp.site?.suburb || '',
    state: opp.site?.state || 'NSW',
    postcode: opp.site?.postcode || '',
    annualKwh: opp.energy?.annualKwh || '',
    hasBills: Boolean(opp.energy?.hasBills),
    estimatorId: opp.owners?.estimatorId || '',
  })

  const savePack = () => {
    app.updateOpportunity(opp.id, {
      contact: { ...opp.contact, name: pack.contactName, email: pack.contactEmail },
      site: { ...opp.site, line1: pack.line1, suburb: pack.suburb, state: pack.state, postcode: pack.postcode },
      energy: { ...opp.energy, annualKwh: pack.annualKwh ? Number(pack.annualKwh) || pack.annualKwh : '', hasBills: pack.hasBills },
    }, 'Updated lead pack')
    if (pack.estimatorId) app.assignEstimator(opp.id, pack.estimatorId)
  }

  return (
    <div className="card card-pad">
      <h2>Lead pack</h2>
      <p className="sub">Qualification needs site street and suburb, a decision-maker, energy usage or bills, and an estimator.</p>
      <div className="form-grid">
        <Field label="Site street" hint="required to advance"><input value={pack.line1} onChange={(e) => setPack({ ...pack, line1: e.target.value })} /></Field>
        <Field label="Suburb" hint="required to advance"><input value={pack.suburb} onChange={(e) => setPack({ ...pack, suburb: e.target.value })} /></Field>
        <Field label="State"><input value={pack.state} onChange={(e) => setPack({ ...pack, state: e.target.value })} /></Field>
        <Field label="Postcode"><input value={pack.postcode} onChange={(e) => setPack({ ...pack, postcode: e.target.value })} /></Field>
        <Field label="Decision-maker"><input value={pack.contactName} onChange={(e) => setPack({ ...pack, contactName: e.target.value })} /></Field>
        <Field label="Email"><input value={pack.contactEmail} onChange={(e) => setPack({ ...pack, contactEmail: e.target.value })} /></Field>
        <Field label="Annual kWh"><input value={pack.annualKwh} onChange={(e) => setPack({ ...pack, annualKwh: e.target.value })} /></Field>
        <Field label="Bills">
          <label className="check">
            <input type="checkbox" checked={pack.hasBills} onChange={(e) => setPack({ ...pack, hasBills: e.target.checked })} />
            Bills on file
          </label>
        </Field>
        <Field label="Estimator">
          <select value={pack.estimatorId} onChange={(e) => setPack({ ...pack, estimatorId: e.target.value })}>
            <option value="">Unassigned</option>
            {estimators.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      {missing.length ? <div className="alert warning" style={{ marginTop: 16 }}>Missing: {missing.join(', ')}</div> : <div className="alert success" style={{ marginTop: 16 }}>Minimum data is complete.</div>}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={savePack}>Save lead pack</button>
      </div>
    </div>
  )
}

function EstimatePanel({ opp, app }) {
  const latest = [...(opp.estimates || [])].sort((a, b) => b.version - a.version)[0]
  const [options, setOptions] = useState(latest?.options?.length ? latest.options : [blankOption(true)])
  const canEdit = canEditEstimate(app.user)
  const showCost = canSeeCost(app.user)

  const update = (i, k, v) => {
    setOptions((opts) => opts.map((o, idx) => {
      if (idx !== i) return k === 'selected' ? { ...o, selected: false } : o
      const next = { ...o, [k]: k === 'selected' ? true : v }
      if (k === 'priceEx' || k === 'costEx') next.margin = calcMargin(next.priceEx, next.costEx)
      return next
    }))
  }

  return (
    <div className="card card-pad">
      <h2>Solution options</h2>
      <p className="sub">Summary cost, price, margin and payback only. Detailed cost build-up is Phase 2.</p>
      {options.map((opt, i) => (
        <div key={opt.id} className={`option-card ${opt.selected ? 'selected' : ''}`}>
          <label className="check"><input type="radio" checked={opt.selected} onChange={() => update(i, 'selected', true)} disabled={!canEdit} /> Recommended option</label>
          <div className="form-grid">
            <Field label="Name"><input value={opt.name} disabled={!canEdit} onChange={(e) => update(i, 'name', e.target.value)} /></Field>
            <Field label="Product range">
              <select value={opt.brand} disabled={!canEdit} onChange={(e) => update(i, 'brand', e.target.value)}>
                {PRODUCT_RANGES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Capacity kW"><input type="number" value={opt.capacityKw} disabled={!canEdit} onChange={(e) => update(i, 'capacityKw', Number(e.target.value))} /></Field>
            <Field label="Storage kWh"><input type="number" value={opt.capacityKwh} disabled={!canEdit} onChange={(e) => update(i, 'capacityKwh', Number(e.target.value))} /></Field>
            {showCost ? (
              <Field label="Cost (ex GST)"><input type="number" value={opt.costEx} disabled={!canEdit} onChange={(e) => update(i, 'costEx', Number(e.target.value))} /></Field>
            ) : null}
            <Field label="Price (ex GST)"><input type="number" value={opt.priceEx} disabled={!canEdit} onChange={(e) => update(i, 'priceEx', Number(e.target.value))} /></Field>
            {showCost ? <Field label="Margin"><input value={pct(opt.margin)} readOnly /></Field> : null}
            <Field label="Annual saving"><input type="number" value={opt.annualSaving} disabled={!canEdit} onChange={(e) => update(i, 'annualSaving', Number(e.target.value))} /></Field>
            <Field label="Payback (years)"><input type="number" step="0.1" value={opt.paybackYears} disabled={!canEdit} onChange={(e) => update(i, 'paybackYears', Number(e.target.value))} /></Field>
          </div>
        </div>
      ))}
      {canEdit ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" type="button" onClick={() => setOptions((o) => [...o, blankOption(false)])}>Add option</button>
          <button className="btn btn-ghost" type="button" onClick={() => app.saveEstimate(opp.id, options)}>Save pack</button>
          <button className="btn btn-primary" type="button" onClick={() => { app.saveEstimate(opp.id, options); app.issueEstimate(opp.id) }}>Issue to sales</button>
        </div>
      ) : <p className="lede">Cost and margin are hidden from your role.</p>}
    </div>
  )
}

function blankOption(selected) {
  return { id: uid('opt'), name: '', brand: PRODUCT_RANGES[0], product: '', capacityKw: 0, capacityKwh: 0, costEx: 0, priceEx: 0, margin: 0, annualSaving: 0, paybackYears: 0, selected }
}

function ProposalPanel({ opp, app }) {
  const p = currentProposal(opp)
  const option = selectedOption(opp)
  const [feedback, setFeedback] = useState(opp.feedback || '')
  const canIssue = canIssueProposal(app.user)

  return (
    <div className="card card-pad">
      <h2>Proposal & engagement</h2>
      <p className="sub">Generate from the selected option, present it, then capture what the customer said.</p>
      {option ? (
        <p>Selected: <b>{option.name || 'Option'}</b> · {money(option.priceEx)} ex GST · {money(incGst(option.priceEx))} inc GST</p>
      ) : <div className="alert warning">No estimate option selected.</div>}
      {p ? (
        <p className="lede">{p.number} · v{p.version} · {p.status}{p.presentedAt ? ` · presented ${formatDate(p.presentedAt)}` : ''}</p>
      ) : null}
      {canIssue ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 20px' }}>
          <button className="btn btn-ghost" onClick={() => app.generateProposal(opp.id)}>Generate proposal</button>
          <button className="btn btn-ghost" disabled={!p} onClick={() => app.presentProposal(opp.id)}>Mark presented</button>
        </div>
      ) : null}
      <Field label="Customer feedback">
        <textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </Field>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => app.updateOpportunity(opp.id, { feedback }, 'Captured feedback')}>Save feedback</button>
    </div>
  )
}

function ClosurePanel({ opp, app }) {
  const p = currentProposal(opp)
  const option = selectedOption(opp)
  const margin = p?.margin ?? option?.margin
  const floor = opp.marginFloor
  const low = belowFloor(margin, floor)
  const [comment, setComment] = useState('')
  const [doc, setDoc] = useState('')
  const canIssue = canIssueProposal(app.user)
  const canDir = canApprovePricing(app.user)

  return (
    <div className="card card-pad">
      <h2>Sales closure</h2>
      <p className="sub">Offers at or above the {pct(floor, 0)} floor can be issued. Below-floor pricing routes to the Director. Acceptance creates the 20% billing request — not a tax invoice.</p>
      <p>Offer {money(option?.priceEx)} ex GST ({money(incGst(option?.priceEx))} inc) · margin {pct(margin)}</p>
      {low ? <div className="alert warning">Below the {pct(floor, 0)} floor. Director approval is required before issue.</div> : <div className="alert success">Within authority — salesperson may issue.</div>}
      {p?.directorApproval ? (
        <p className="lede">Approval: {p.directorApproval.status}{p.directorApproval.comment ? ` — ${p.directorApproval.comment}` : ''}</p>
      ) : null}
      {canIssue && low && p?.directorApproval?.status !== 'approved' ? (
        <div style={{ margin: '12px 0' }}>
          <Field label="Note for Director"><textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={() => app.requestDirectorApproval(opp.id, comment)}>Request Director approval</button>
        </div>
      ) : null}
      {canDir && p?.directorApproval?.status === 'requested' ? (
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <button className="btn btn-primary" onClick={() => app.decidePricing(opp.id, true, comment)}>Approve</button>
          <button className="btn btn-danger" onClick={() => app.decidePricing(opp.id, false, comment)}>Reject</button>
        </div>
      ) : null}
      {canIssue ? (
        <button className="btn btn-ghost" onClick={() => {
          const r = app.issueOffer(opp.id)
          if (!r.ok) alert(r.error)
        }}>Issue final offer</button>
      ) : null}
      <div style={{ marginTop: 20 }}>
        <Field label="Signed acceptance file name"><input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Signed-offer.pdf" /></Field>
        <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={!doc} onClick={() => app.recordAcceptance(opp.id, doc)}>Record acceptance</button>
      </div>
    </div>
  )
}

function ApprovalsPanel({ opp, app }) {
  const can = canManageApprovals(app.user)
  return (
    <div className="card card-pad">
      <h2>External approvals</h2>
      <p className="sub">Each approval is its own record. Delivery cannot start until every mandatory item is Approved or authorised Not Required.</p>
      {(opp.approvals || []).map((a) => (
        <div className="list-item" key={a.id}>
          <div>
            <div className="row-title">{a.label} {a.required ? '' : '(optional)'}</div>
            <div className="row-meta">{a.notes || 'No note yet'}</div>
          </div>
          {can ? (
            <select className="select" style={{ maxWidth: 160 }} value={a.status} onChange={(e) => app.updateApproval(opp.id, a.id, { status: e.target.value, outcomeAt: ['Approved', 'Rejected', 'Not Required'].includes(e.target.value) ? new Date().toISOString() : a.outcomeAt })}>
              {['Not Started', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Not Required', 'Expired'].map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : <Badge tone={a.status === 'Approved' || a.status === 'Not Required' ? 'success' : a.status === 'Rejected' ? 'danger' : 'warning'}>{a.status}</Badge>}
        </div>
      ))}
      {hasRole(app.user, 'SLS', 'SS', 'DIR', 'EST') ? (
        <div style={{ marginTop: 16 }}>
          <VariationBox opp={opp} app={app} />
        </div>
      ) : null}
    </div>
  )
}

function VariationBox({ opp, app }) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  if (opp.stage < 4) return null
  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>Raise variation</button>
      {open ? (
        <Modal title="Raise a variation" body="Use after acceptance when council or DNSP conditions change the scope." onClose={() => setOpen(false)} actions={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { app.raiseVariation(opp.id, reason); setOpen(false) }}>Raise</button>
          </>
        }>
          <Field label="Reason"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </Modal>
      ) : null}
    </>
  )
}

function ProcurementPanel({ opp, app }) {
  const can = canManageProcurement(app.user)
  const [po, setPo] = useState({ ref: '', supplier: '', items: '', amount: '', eta: '' })
  return (
    <div className="card card-pad">
      <h2>Materials</h2>
      <p className="sub">Raise POs against this opportunity. Confirmed physical delivery creates the 40% billing request once only.</p>
      {(opp.purchaseOrders || []).map((p) => (
        <div className="option-card" key={p.id}>
          <div className="row-title">{p.ref} · {p.supplier}</div>
          <div className="row-meta">{p.items} · {money(p.amount)} · ETA {p.eta || '—'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {can && !p.eta ? <button className="btn btn-sm btn-ghost" onClick={() => app.updatePurchaseOrder(opp.id, p.id, { eta: '2026-09-10', status: 'confirmed', confirmedAt: new Date().toISOString() })}>Confirm ETA</button> : null}
            {can && !p.deliveredAt ? <button className="btn btn-sm btn-primary" onClick={() => app.updatePurchaseOrder(opp.id, p.id, { deliveredAt: new Date().toISOString(), status: 'delivered', deliveryEvidence: 'Site docket' })}>Confirm delivery to site</button> : null}
            {p.deliveredAt ? <Badge tone="success">Delivered {formatDate(p.deliveredAt)}</Badge> : <Badge tone="warning">{p.status}</Badge>}
          </div>
        </div>
      ))}
      {can ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="PO reference"><input value={po.ref} onChange={(e) => setPo({ ...po, ref: e.target.value })} /></Field>
          <Field label="Supplier"><input value={po.supplier} onChange={(e) => setPo({ ...po, supplier: e.target.value })} /></Field>
          <Field label="Items" className="span-2"><input value={po.items} onChange={(e) => setPo({ ...po, items: e.target.value })} /></Field>
          <Field label="Amount ex GST"><input type="number" value={po.amount} onChange={(e) => setPo({ ...po, amount: e.target.value })} /></Field>
          <Field label="ETA"><input type="date" value={po.eta} onChange={(e) => setPo({ ...po, eta: e.target.value })} /></Field>
          <div className="span-2">
            <button className="btn btn-primary" disabled={!po.ref} onClick={() => { app.addPurchaseOrder(opp.id, { ...po, amount: Number(po.amount) || 0 }); setPo({ ref: '', supplier: '', items: '', amount: '', eta: '' }) }}>Raise PO</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SitePanel({ opp, app }) {
  const can = canSignSite(app.user)
  const sw = opp.siteWorks || {}
  return (
    <div className="card card-pad">
      <h2>Site works</h2>
      <p className="sub">Book the window, then sign off each sub-stage. Commissioning creates the final 40% billing request and enables the certificate.</p>
      <div className="form-grid">
        <Field label="Install start"><input type="date" defaultValue={sw.installWindowStart} onBlur={(e) => app.updateSiteWorks(opp.id, { installWindowStart: e.target.value })} /></Field>
        <Field label="Install end"><input type="date" defaultValue={sw.installWindowEnd} onBlur={(e) => app.updateSiteWorks(opp.id, { installWindowEnd: e.target.value })} /></Field>
        <Field label="Electrical contractor"><input defaultValue={sw.electricalContractor} onBlur={(e) => app.updateSiteWorks(opp.id, { electricalContractor: e.target.value })} /></Field>
        <Field label="Civil contractor"><input defaultValue={sw.civilContractor} onBlur={(e) => app.updateSiteWorks(opp.id, { civilContractor: e.target.value })} /></Field>
      </div>
      <div style={{ marginTop: 20 }}>
        {SITE_SUBSTAGES.map((s) => {
          const rec = (sw.substages || []).find((x) => x.key === s.key) || { status: 'not_started' }
          return (
            <div className="substage" key={s.key}>
              <Badge tone={rec.status === 'signed_off' ? 'success' : rec.status === 'failed' ? 'danger' : rec.status === 'in_progress' ? 'warning' : 'neutral'}>{s.key}</Badge>
              <div>
                <div className="row-title">{s.label}</div>
                <div className="row-meta">{s.hint}</div>
              </div>
              {rec.status === 'signed_off' ? <span className="row-meta">Signed {formatDate(rec.signedOffAt)}</span> : can ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => app.signSubstage(opp.id, s.key, { photos: [{ name: `${s.key}.jpg`, at: new Date().toISOString() }] })}>Sign off</button>
                  {s.key === '7e' ? <button className="btn btn-sm btn-danger" onClick={() => app.signSubstage(opp.id, s.key, { failed: true, defects: 'Failed commissioning test' })}>Fail</button> : null}
                </div>
              ) : <span className="row-meta">{rec.status}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BillingPanel({ opp, app }) {
  const can = canManageBilling(app.user)
  const comm = commissionFor(opp, app.unit.commissionTiers)
  return (
    <div className="card card-pad">
      <h2>Billing, rebates & commission</h2>
      <p className="sub">This system creates billing requests. Tax invoice numbers and payment status are recorded from accounting — they are not invented here.</p>
      {(opp.billingRequests || []).map((b) => (
        <div className="list-item" key={b.id}>
          <div>
            <div className="row-title">{b.percent}% · {b.event}</div>
            <div className="row-meta">{money(b.amountEx)} ex · GST {money(b.gst)} · {b.invoiceNumber || 'No tax invoice yet'}</div>
          </div>
          {can ? (
            <input className="search" style={{ maxWidth: 160 }} placeholder="Invoice no." defaultValue={b.invoiceNumber} onBlur={(e) => app.updateBilling(opp.id, b.id, { invoiceNumber: e.target.value, status: e.target.value ? 'invoiced' : b.status })} />
          ) : <Badge tone={b.paymentStatus === 'paid' ? 'success' : 'warning'}>{b.status}</Badge>}
        </div>
      ))}
      <h3 style={{ marginTop: 24 }}>Rebates</h3>
      {(opp.rebates || []).map((r) => (
        <div className="list-item" key={r.id}>
          <div>
            <div className="row-title">{r.type}</div>
            <div className="row-meta">{money(r.value)} · {r.reference || 'No reference'}</div>
          </div>
          {can ? (
            <select className="select" style={{ maxWidth: 140 }} value={r.status} onChange={(e) => app.updateRebate(opp.id, r.id, { status: e.target.value, lodgedAt: e.target.value === 'Lodged' ? new Date().toISOString() : r.lodgedAt })}>
              {['Not lodged', 'Lodged', 'Paid'].map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : <Badge tone="neutral">{r.status}</Badge>}
        </div>
      ))}
      {comm && canSeeCost(app.user) ? (
        <div className="alert info" style={{ marginTop: 16 }}>
          Referrer commission: {pct(comm.rate * 100, 0)} of {money(comm.basis)} = {money(comm.amount)} ({comm.tierLabel}). Payable after delivery, subject to Accounts approval.
        </div>
      ) : null}
    </div>
  )
}

function HandoverPanel({ opp, app }) {
  const [warranty, setWarranty] = useState(opp.closure?.warrantyContact || '')
  const [future, setFuture] = useState(opp.closure?.futureEngagement || '')
  const billsPaid = (opp.billingRequests || []).every((b) => b.paymentStatus === 'paid' || b.invoiceNumber)
  return (
    <div className="card card-pad">
      <h2>Closure & handover</h2>
      <p className="sub">Confirm the job is complete, capture warranty contacts for a future after-sales module, then mark delivered.</p>
      <label className="check"><input type="checkbox" defaultChecked={billsPaid} readOnly /> Billing requests have accounting references</label>
      <label className="check"><input type="checkbox" defaultChecked={(opp.rebates || []).every((r) => r.status !== 'Not lodged')} readOnly /> Rebates lodged or not applicable</label>
      <label className="check"><input type="checkbox" defaultChecked={(opp.documents || []).length > 0} readOnly /> Documents archived</label>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Warranty contact" className="span-2"><input value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="Name, phone, email" /></Field>
        <Field label="Future engagement" className="span-2"><textarea rows={3} value={future} onChange={(e) => setFuture(e.target.value)} placeholder="Maintenance, monitoring, upsell notes" /></Field>
      </div>
      {hasRole(app.user, 'DIR', 'SOM', 'ADM') ? (
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={!warranty} onClick={() => app.closeOpportunity(opp.id, { warrantyContact: warranty, futureEngagement: future })}>
          Mark closed / delivered
        </button>
      ) : <p className="lede">Director or Site Operations closes the record.</p>}
    </div>
  )
}
