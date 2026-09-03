import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import StageStepper from '../components/StageStepper'
import LeadForm, { estimatorChoices, formFromOpportunity, payloadFromLeadForm, validateLeadForm } from '../components/LeadForm'
import FileUpload from '../components/FileUpload'
import { Badge, Field, Modal, NumberInput } from '../components/ui'
import {
  APPROVAL_CHECKLIST,
  HANDOVER_SUBSTAGES,
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
  canSetupJob,
  canSignSite,
  hasRole,
} from '../lib/permissions'
import {
  belowFloor,
  calcMargin,
  commissionFor,
  currentProposal,
  currentVariation,
  gateStatus,
  incGst,
  selectedOption,
  stageMeta,
  workStage,
  VARIATION_STEPS,
  variationNextStep,
} from '../lib/workflow'

export default function Opportunity() {
  const { id } = useParams()
  const app = useApp()
  const opp = app.opportunities.find((o) => o.id === id) || app.allOpportunities.find((o) => o.id === id)
  const [tab, setTab] = useState('work')
  const [gateError, setGateError] = useState(null)
  const [viewStage, setViewStage] = useState(workStage(opp?.stage))
  const workRef = useRef(null)

  useEffect(() => {
    setViewStage(workStage(opp?.stage))
  }, [opp?.id])

  const showStage = (stageId) => {
    setTab('work')
    setViewStage(stageId)
    window.setTimeout(() => {
      workRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

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
    else {
      setGateError(null)
      setViewStage(Math.min(10, workStage(opp.stage) + 1))
    }
  }

  return (
    <>
      <Link to="/pipeline" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>Pipeline</Link>
      <div className="opp-hero">
        <div>
          <div className="kicker">{opp.number}</div>
          <h1>{opp.customer?.legalName || opp.number}</h1>
          <div className="meta-row">
            <span>{opp.site?.line1}, {opp.site?.suburb} {opp.site?.state} {opp.site?.postcode}</span>
            <span>{money(option?.priceEx || opp.acceptedValue)}</span>
            {canSeeCost(app.user) && option ? <span>Margin {pct(option.margin)}</span> : null}
            <Badge tone={(LIFECYCLE[opp.lifecycle] || LIFECYCLE.Active).tone}>{(LIFECYCLE[opp.lifecycle] || LIFECYCLE.Active).label}</Badge>
            <Badge tone={due.tone}>{due.label}</Badge>
            {opp.variationPending ? <Badge tone="warning">Variation pending</Badge> : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canAdvance(app.user, opp) && workStage(opp.stage) < 10 && opp.lifecycle === 'Active' ? (
            <button className="btn btn-primary" onClick={advance} disabled={!gate.canAdvance}>
              Advance to {stageMeta(Math.min(10, workStage(opp.stage) + 1)).short}
            </button>
          ) : null}
        </div>
      </div>

      <StageStepper stage={opp.stage} viewStage={viewStage} onSelect={showStage} />

      {workStage(viewStage) !== workStage(opp.stage) ? (
        <div className="alert info" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Viewing {stageMeta(viewStage).label}. Current stage is {stageMeta(opp.stage).label}.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => showStage(workStage(opp.stage))}>Back to current stage</button>
        </div>
      ) : null}

      {gateError ? <div className="alert warning">Still needed: {gateError.join(', ')}</div> : null}
      {opp.variationPending && opp.stage >= 6 ? (
        <VariationGuide
          opp={opp}
          app={app}
          onOpenEstimate={() => showStage(4)}
          onOpenProposal={() => showStage(5)}
          onProgress={(status) => {
            if (status === 'priced') showStage(5)
            if (status === 'presented') showStage(5)
            if (status === 'accepted') showStage(opp.stage)
          }}
        />
      ) : !gate.canAdvance && opp.lifecycle === 'Active' ? (
        <div className="alert info">To leave {stageMeta(opp.stage).label}: {gate.missing.join(' · ')}</div>
      ) : null}

      <div className="tabs">
        <button type="button" className={tab === 'work' ? 'active' : ''} onClick={() => setTab('work')}>Stage work</button>
        <button type="button" className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>Documents</button>
        <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
      </div>

      <div ref={workRef}>
        {tab === 'work' ? <StagePanel opp={opp} app={app} userName={userName} viewStage={viewStage} onIssued={(result) => { if (result?.ok) showStage(5) }} /> : null}
      </div>
      {tab === 'files' ? (
        <div className="card card-pad">
          <FileUpload
            files={opp.documents || []}
            userId={app.user.id}
            stage={opp.stage}
            type="evidence"
            title="Photos and documents"
            hint="Attach evidence to this record. Photos, PDFs and office files, up to 3 MB each. Linked to the current stage."
            onAdd={(records) => app.addDocuments(opp.id, records)}
            onRemove={(docId) => app.removeDocument(opp.id, docId)}
          />
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

function StagePanel({ opp, app, userName, viewStage, onIssued }) {
  const panels = {
    2: LeadPanel,
    3: EngagementPanel,
    4: EstimatePanel,
    5: ProposalPanel,
    6: JobSetupPanel,
    7: ApprovalsPanel,
    8: SitePanel,
    9: HandoverWorksPanel,
    10: ServicePanel,
  }
  const Cmp = panels[viewStage] || LeadPanel
  return (
    <div className="panel">
      <Cmp key={viewStage} opp={opp} app={app} userName={userName} onIssued={onIssued} />
    </div>
  )
}

function LeadPanel({ opp, app }) {
  const estimators = estimatorChoices(app.users, app.unit.id)
  const sales = app.users.filter((u) => (u.roles.includes('BDM') || u.roles.includes('DBD')) && u.unitIds.includes(app.unit.id))
  const [form, setForm] = useState(() => {
    const base = formFromOpportunity(opp)
    if (!base.estimatorId && estimators[0]) base.estimatorId = estimators[0].id
    return base
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((prev) => {
      if (!prev[k]) return prev
      const next = { ...prev }
      delete next[k]
      return next
    })
  }

  const defaultEstimatorId = estimators[0]?.id
  useEffect(() => {
    const next = formFromOpportunity(opp)
    if (!next.estimatorId && defaultEstimatorId) next.estimatorId = defaultEstimatorId
    setForm(next)
  }, [opp.id])

  useEffect(() => {
    if (!form.estimatorId && defaultEstimatorId) setForm((f) => ({ ...f, estimatorId: defaultEstimatorId }))
  }, [defaultEstimatorId, form.estimatorId])

  const [meeting, setMeeting] = useState({ attendees: '', outcome: '', nextStep: '' })
  const hasMeeting = (opp.meetings || []).length > 0
  const hasSitePhoto = (opp.documents || []).some((d) => d.stage === 2 && d.type === 'site_photo')
  const hasSketch = (opp.documents || []).some((d) => d.stage === 2 && d.type === 'drawing')
  const qualificationReady = (hasMeeting && (hasSitePhoto || hasSketch)) || opp.qualification === 'qualified'

  const savePack = () => {
    const nextErrors = validateLeadForm(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      app.saveLeadPack(opp.id, payloadFromLeadForm(form))
      return
    }
    app.saveLeadPack(opp.id, payloadFromLeadForm(form))
    setErrors({})
  }

  const errorList = Object.values(errors)

  return (
    <div className="card card-pad">
      <h2>Lead pack</h2>
      <p className="sub">
        {opp.stage === 2
          ? 'Every lead is not yet an opportunity. Log a client meeting and a site visit below, then mark this lead Qualified to attach it to the pipeline. Nurture and Disqualified stay here.'
          : 'This lead has already moved on. You can still review and update the details.'}
      </p>
      <LeadForm
        form={form}
        set={set}
        errors={errors}
        estimators={estimators}
        sales={sales}
        referrers={app.referrers}
        campaigns={app.campaigns || []}
        user={app.user}
        allowQualified={qualificationReady}
      />
      {errorList.length ? (
        <div className="alert danger" style={{ marginTop: 16 }}>
          Fix {errorList.length} {errorList.length === 1 ? 'field' : 'fields'} before this lead can move to inspection.
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {[...new Set(errorList)].map((msg) => <li key={msg}>{msg}</li>)}
          </ul>
        </div>
      ) : opp.stage === 2 ? (
        <div className="alert info" style={{ marginTop: 16 }}>Required qualification fields must be complete to leave Lead capture.</div>
      ) : null}

      {opp.stage === 2 ? (
        <div className="section" style={{ marginTop: 24 }}>
          <h3>Client meeting & site visit</h3>
          <p className="sub">Qualification is decided on the ground — after a client meeting and a site visit, with photos or sketches to back it up.</p>
          {(opp.meetings || []).map((m) => (
            <div className="list-item" key={m.id}>
              <div>
                <div className="row-title">{m.attendees}</div>
                <div className="row-meta">{m.outcome} · Next: {m.nextStep}</div>
              </div>
            </div>
          ))}
          <div className="form-grid">
            <Field label="Attendees"><input value={meeting.attendees} onChange={(e) => setMeeting({ ...meeting, attendees: e.target.value })} /></Field>
            <Field label="Outcome"><input value={meeting.outcome} onChange={(e) => setMeeting({ ...meeting, outcome: e.target.value })} /></Field>
            <Field label="Next step" className="span-2"><input value={meeting.nextStep} onChange={(e) => setMeeting({ ...meeting, nextStep: e.target.value })} /></Field>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8 }}
            disabled={!meeting.attendees}
            onClick={() => {
              app.updateOpportunity(opp.id, { meetings: [{ id: uid('mtg'), at: new Date().toISOString(), ...meeting }, ...(opp.meetings || [])] }, 'Logged meeting')
              setMeeting({ attendees: '', outcome: '', nextStep: '' })
            }}
          >
            Save meeting
          </button>

          <div style={{ marginTop: 16 }}>
            <FileUpload
              files={(opp.documents || []).filter((d) => d.stage === 2 && d.type === 'site_photo')}
              userId={app.user.id}
              stage={2}
              type="site_photo"
              title="Site photos"
              hint="Photos from the site visit — access, electrical conditions, constraints."
              accept="image/*"
              onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'site_photo', kind: 'photo', stage: 2 })))}
              onRemove={(docId) => app.removeDocument(opp.id, docId)}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <FileUpload
              files={(opp.documents || []).filter((d) => d.stage === 2 && d.type === 'drawing')}
              userId={app.user.id}
              stage={2}
              type="drawing"
              title="Sketches & drawings"
              hint="Hand sketches, plans or design outputs from the site visit."
              onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'drawing', stage: 2 })))}
              onRemove={(docId) => app.removeDocument(opp.id, docId)}
            />
          </div>
          {!qualificationReady ? (
            <div className="alert info" style={{ marginTop: 12 }}>
              {hasMeeting ? 'Attach a site photo or sketch' : 'Log a client meeting'} to unlock the Qualified outcome above.
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <FileUpload
          files={(opp.documents || []).filter((d) => (d.stage === 2 && !['site_photo', 'drawing'].includes(d.type)) || d.type === 'energy_bill')}
          userId={app.user.id}
          stage={2}
          type="lead"
          title="Lead evidence"
          hint="Bills, emails or other intake documents."
          onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: r.kind === 'photo' ? 'photo' : 'lead', stage: 2 })))}
          onRemove={(docId) => app.removeDocument(opp.id, docId)}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={savePack}>
          {opp.stage === 2 ? 'Save and continue to inspection' : 'Save lead details'}
        </button>
      </div>
    </div>
  )
}

function EngagementPanel({ opp, app }) {
  const insp = opp.inspection || {}
  const [meeting, setMeeting] = useState({ attendees: '', outcome: '', nextStep: '' })
  const toggle = (key) => app.updateOpportunity(opp.id, { inspection: { ...insp, [key]: !insp[key] } }, 'Updated site pack')
  return (
    <div className="card card-pad">
      <h2>Engagement & site inspection</h2>
      <p className="sub">Record meetings, then complete the site pack. Inspection is not complete until photos, drawings, measurements and constraints are captured. Site Ops input can be requested here.</p>
      <h3>Meetings</h3>
      {(opp.meetings || []).map((m) => (
        <div className="list-item" key={m.id}>
          <div>
            <div className="row-title">{m.attendees}</div>
            <div className="row-meta">{m.outcome} · Next: {m.nextStep}</div>
          </div>
        </div>
      ))}
      <div className="form-grid">
        <Field label="Attendees"><input value={meeting.attendees} onChange={(e) => setMeeting({ ...meeting, attendees: e.target.value })} /></Field>
        <Field label="Outcome"><input value={meeting.outcome} onChange={(e) => setMeeting({ ...meeting, outcome: e.target.value })} /></Field>
        <Field label="Next step" className="span-2"><input value={meeting.nextStep} onChange={(e) => setMeeting({ ...meeting, nextStep: e.target.value })} /></Field>
      </div>
      <button
        className="btn btn-ghost"
        style={{ marginTop: 8 }}
        disabled={!meeting.attendees}
        onClick={() => {
          app.updateOpportunity(opp.id, { meetings: [{ id: uid('mtg'), at: new Date().toISOString(), ...meeting }, ...(opp.meetings || [])] }, 'Logged meeting')
          setMeeting({ attendees: '', outcome: '', nextStep: '' })
        }}
      >
        Save meeting
      </button>
      <h3 style={{ marginTop: 24 }}>Site inspection pack</h3>
      <p className="sub">Upload site photos and drawings. Checklists complete automatically when files are attached.</p>
      <FileUpload
        files={(opp.documents || []).filter((d) => d.stage === 3 || d.type === 'site_photo' || d.type === 'drawing')}
        userId={app.user.id}
        stage={3}
        type="site_photo"
        title="Site photos"
        hint="Mandatory photos of access, electrical conditions and constraints."
        accept="image/*"
        onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'site_photo', kind: 'photo', stage: 3 })))}
        onRemove={(docId) => app.removeDocument(opp.id, docId)}
      />
      <FileUpload
        files={(opp.documents || []).filter((d) => d.type === 'drawing' || d.type === 'survey')}
        userId={app.user.id}
        stage={3}
        type="drawing"
        title="Drawings / survey"
        hint="Plans, sketches, design outputs or survey PDFs."
        onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'drawing', stage: 3 })))}
        onRemove={(docId) => app.removeDocument(opp.id, docId)}
      />
      <label className="check"><input type="checkbox" checked={!!insp.measurements} onChange={() => toggle('measurements')} /> Measurements recorded</label>
      <Field label="Hazards / constraints">
        <textarea rows={3} defaultValue={insp.constraints} onBlur={(e) => app.updateOpportunity(opp.id, { inspection: { ...insp, constraints: e.target.value } }, 'Updated constraints')} />
      </Field>
    </div>
  )
}

function EstimatePanel({ opp, app, onIssued }) {
  const latest = [...(opp.estimates || [])].sort((a, b) => b.version - a.version)[0]
  const [options, setOptions] = useState(latest?.options?.length ? latest.options : [blankOption(true)])
  const [error, setError] = useState('')
  const [quote, setQuote] = useState({ supplier: '', url: '', note: '' })
  const canEdit = canEditEstimate(app.user)
  const showCost = canSeeCost(app.user)
  const canVerify = hasRole(app.user, 'BOP', 'DIR', 'ADM')
  const notes = opp.estimateNotes || { procurementNeeds: '', missingInfo: '', riskMapping: '' }
  const variationReprice = opp.variationPending && (opp.variations || [])[0]?.status === 're-estimate'

  const update = (i, k, v) => {
    setError('')
    setOptions((opts) => opts.map((o, idx) => {
      if (idx !== i) return k === 'selected' ? { ...o, selected: false } : o
      const next = { ...o, [k]: k === 'selected' ? true : v }
      if (k === 'priceEx' || k === 'costEx') next.margin = calcMargin(next.priceEx, next.costEx)
      return next
    }))
  }

  const issue = () => {
    if (!app.saveAndIssueEstimate) {
      setError('Issue to sales is not available. Refresh the page and try again.')
      return
    }
    const result = app.saveAndIssueEstimate(opp.id, options)
    if (!result?.ok) {
      setError(result?.error || 'Enter a price greater than 0 on at least one option.')
      return
    }
    setError('')
    onIssued?.(result)
  }

  return (
    <div className="card card-pad">
      <h2>Solution options</h2>
      <p className="sub">
        {variationReprice
          ? 'Update cost and price for the variation, then issue the revised pack to sales.'
          : 'Enter quantity, cost, sell price and target margin, then issue to BDM/Sales. Incomplete packs should be returned with missing items listed.'}
      </p>
      {error ? <div className="alert danger">{error}</div> : null}
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
            <Field label="Capacity kW"><NumberInput value={opt.capacityKw} disabled={!canEdit} onChange={(v) => update(i, 'capacityKw', v)} /></Field>
            <Field label="Storage kWh"><NumberInput value={opt.capacityKwh} disabled={!canEdit} onChange={(v) => update(i, 'capacityKwh', v)} /></Field>
            {showCost ? (
              <Field label="Cost (ex GST)"><NumberInput value={opt.costEx} disabled={!canEdit} onChange={(v) => update(i, 'costEx', v)} /></Field>
            ) : null}
            <Field label="Price (ex GST)"><NumberInput value={opt.priceEx} disabled={!canEdit} onChange={(v) => update(i, 'priceEx', v)} /></Field>
            {showCost ? <Field label="Target margin %"><input value={pct(opt.margin)} readOnly /></Field> : null}
            <Field label="Annual saving"><NumberInput value={opt.annualSaving} disabled={!canEdit} onChange={(v) => update(i, 'annualSaving', v)} /></Field>
            <Field label="Payback (years)"><NumberInput step="0.1" value={opt.paybackYears} disabled={!canEdit} onChange={(v) => update(i, 'paybackYears', v)} /></Field>
          </div>
        </div>
      ))}
      {canEdit ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" type="button" onClick={() => setOptions((o) => [...o, blankOption(false)])}>Add option</button>
          <button className="btn btn-ghost" type="button" onClick={() => app.saveEstimate(opp.id, options)}>Save pack</button>
          <button className="btn btn-primary" type="button" onClick={issue}>
            {variationReprice ? 'Issue revised estimate to sales' : 'Issue to sales'}
          </button>
        </div>
      ) : <p className="lede">Cost and margin are hidden from your role. Sign in as the estimator to issue this pack.</p>}

      <div className="section" style={{ marginTop: 24 }}>
        <h3>External supplier quotes</h3>
        <p className="sub">Links, references and files from external suppliers used to build this estimate.</p>
        {(opp.externalQuotes || []).map((q) => (
          <div className="list-item" key={q.id}>
            <div>
              <div className="row-title">{q.supplier || 'Supplier'}</div>
              <div className="row-meta">{q.url ? <a href={q.url} target="_blank" rel="noreferrer">{q.url}</a> : 'No link'} {q.note ? `· ${q.note}` : ''}</div>
            </div>
            {canEdit ? <button className="btn btn-ghost btn-sm" onClick={() => app.removeExternalQuote(opp.id, q.id)}>Remove</button> : null}
          </div>
        ))}
        {canEdit ? (
          <div className="form-grid" style={{ marginTop: 8 }}>
            <Field label="Supplier"><input value={quote.supplier} onChange={(e) => setQuote({ ...quote, supplier: e.target.value })} /></Field>
            <Field label="URL / link"><input value={quote.url} onChange={(e) => setQuote({ ...quote, url: e.target.value })} placeholder="https://" /></Field>
            <Field label="Note" className="span-2"><input value={quote.note} onChange={(e) => setQuote({ ...quote, note: e.target.value })} /></Field>
            <div className="span-2">
              <button
                className="btn btn-ghost"
                disabled={!quote.supplier}
                onClick={() => { app.addExternalQuote(opp.id, quote); setQuote({ supplier: '', url: '', note: '' }) }}
              >
                Add supplier quote
              </button>
            </div>
          </div>
        ) : null}
        <FileUpload
          compact
          files={(opp.documents || []).filter((d) => d.stage === 4 && d.type === 'supplier_quote')}
          userId={app.user.id}
          stage={4}
          type="supplier_quote"
          title="Supplier quote attachments"
          onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'supplier_quote', stage: 4 })))}
          onRemove={(docId) => app.removeDocument(opp.id, docId)}
        />
      </div>

      <div className="section" style={{ marginTop: 24 }}>
        <h3>Estimation subtasks</h3>
        <div className="form-grid">
          <Field label="Procurement needs" className="span-2">
            <textarea rows={2} defaultValue={notes.procurementNeeds} disabled={!canEdit} onBlur={(e) => app.updateOpportunity(opp.id, { estimateNotes: { ...notes, procurementNeeds: e.target.value } }, 'Updated procurement needs')} />
          </Field>
          <Field label="Missing information" className="span-2">
            <textarea rows={2} defaultValue={notes.missingInfo} disabled={!canEdit} onBlur={(e) => app.updateOpportunity(opp.id, { estimateNotes: { ...notes, missingInfo: e.target.value } }, 'Updated missing info')} />
          </Field>
          <Field label="Risk mapping" className="span-2">
            <textarea rows={2} defaultValue={notes.riskMapping} disabled={!canEdit} onBlur={(e) => app.updateOpportunity(opp.id, { estimateNotes: { ...notes, riskMapping: e.target.value } }, 'Updated risk mapping')} />
          </Field>
        </div>
      </div>

      <div className="section" style={{ marginTop: 24 }}>
        <h3>Verification</h3>
        {latest?.verifiedAt ? (
          <p className="lede">Verified — no changes since sign-off.</p>
        ) : canVerify ? (
          <button className="btn btn-ghost" onClick={() => app.verifyEstimate(opp.id)} disabled={!latest}>Mark estimate verified</button>
        ) : (
          <p className="lede">Business Operations or a Director verifies this pack before it is trusted downstream.</p>
        )}
      </div>
    </div>
  )
}

function blankOption(selected) {
  return { id: uid('opt'), name: '', brand: PRODUCT_RANGES[0], product: '', capacityKw: '', capacityKwh: '', costEx: '', priceEx: '', margin: 0, annualSaving: '', paybackYears: '', selected }
}

function ProposalPanel({ opp, app }) {
  const p = currentProposal(opp)
  const option = selectedOption(opp)
  const [feedback, setFeedback] = useState(opp.feedback || '')
  const [outcomeReason, setOutcomeReason] = useState('')
  const canIssue = canIssueProposal(app.user)
  const variationPresent = opp.variationPending && (opp.variations || [])[0]?.status === 'priced'
  const openOutcome = p && !['accepted', 'rejected', 're-estimated'].includes(p.status)

  return (
    <>
    <div className="card card-pad">
      <h2>Proposal, negotiation & acceptance</h2>
      <p className="sub">
        {variationPresent
          ? 'A revised proposal was created from the variation price. Present it to the customer, then mark it presented.'
          : 'Generate from the selected option, present it, then capture what the customer said.'}
      </p>
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

      {canIssue && openOutcome ? (
        <div style={{ marginTop: 20 }}>
          <h3>Outcome</h3>
          <p className="sub">Track this quote through to Rejected, Re-estimated, or Accepted below.</p>
          <Field label="Reason"><textarea rows={2} value={outcomeReason} onChange={(e) => setOutcomeReason(e.target.value)} /></Field>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => { app.markProposalRejected(opp.id, outcomeReason); setOutcomeReason('') }}>Customer rejected</button>
            <button className="btn btn-ghost" onClick={() => { app.sendBackForReEstimate(opp.id, outcomeReason); setOutcomeReason('') }}>Send back for re-estimate</button>
          </div>
        </div>
      ) : p?.status === 'rejected' ? (
        <div className="alert danger" style={{ marginTop: 16 }}>Rejected by the customer{p.rejectionReason ? `: ${p.rejectionReason}` : ''}.</div>
      ) : p?.status === 're-estimated' ? (
        <div className="alert warning" style={{ marginTop: 16 }}>Sent back for re-estimate — see the Estimation stage.</div>
      ) : null}
    </div>
    <div style={{ height: 16 }} />
    <ClosurePanel opp={opp} app={app} />
    </>
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
      <h2>Negotiation & acceptance</h2>
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
        <FileUpload
          files={(opp.documents || []).filter((d) => d.type === 'acceptance')}
          userId={app.user.id}
          stage={5}
          type="acceptance"
          title="Signed acceptance"
          hint="Upload the signed offer or contract. Then record acceptance."
          onAdd={(records) => {
            app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'acceptance', stage: 5 })))
            setDoc(records[0]?.name || '')
          }}
          onRemove={(docId) => app.removeDocument(opp.id, docId)}
        />
        <Field label="File name (if already stored)"><input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Signed-offer.pdf" /></Field>
        <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={!doc && !(opp.documents || []).some((d) => d.type === 'acceptance')} onClick={() => app.recordAcceptance(opp.id, doc || (opp.documents || []).find((d) => d.type === 'acceptance')?.name || 'Signed-acceptance.pdf')}>Record acceptance</button>
      </div>
    </div>
  )
}

function VariationGuide({ opp, app, onOpenEstimate, onOpenProposal, onProgress }) {
  const variation = currentVariation(opp)
  const next = variationNextStep(opp)
  const canPrice = canEditEstimate(app.user)
  const canSales = canIssueProposal(app.user)
  const estimatorName = app.users.find((u) => u.id === opp.owners?.estimatorId)?.name || 'the estimator'
  const salesName = app.users.find((u) => u.id === opp.owners?.salespersonId)?.name || 'sales'

  return (
    <div className="alert warning" style={{ marginBottom: 16 }}>
      <strong>Cannot leave {stageMeta(opp.stage).label} — a variation is pending.</strong>
      <p className="lede" style={{ margin: '8px 0 12px', color: 'inherit' }}>
        Scope changed after acceptance{variation?.reason ? `: “${variation.reason}”` : ''}. Finish these three steps, in order. Delivery is frozen until the customer accepts the new price.
      </p>
      <div className="list-stack">
        {VARIATION_STEPS.map((step) => {
          const status = variation?.status || 're-estimate'
          const done = (step.key === 'identify' && ['identify', 're-estimate', 'priced', 'approve', 'presented', 'accepted'].includes(status) && status !== 'identify')
            || (step.key === 're-estimate' && ['priced', 'approve', 'presented', 'accepted'].includes(status))
            || (step.key === 'approve' && ['approve', 'presented', 'accepted'].includes(status) && status !== 'approve' && status !== 'priced')
            || (step.key === 'approve' && status === 'presented')
            || (step.key === 'presented' && ['presented', 'accepted'].includes(status))
            || (step.key === 'accepted' && status === 'accepted')
          const current = next?.key === step.key
          return (
            <div key={step.key} className="list-item" style={{ borderColor: current ? 'var(--gold)' : undefined }}>
              <div>
                <div className="row-title">{step.title}{current ? ' · do this now' : ''}</div>
                <div className="row-meta">{step.detail} Owner: {step.owner}.</div>
              </div>
              <Badge tone={done ? 'success' : current ? 'warning' : 'neutral'}>{done ? 'Done' : current ? 'Next' : 'Waiting'}</Badge>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {next?.key === 'identify' ? (
          canSignSite(app.user) || canManageApprovals(app.user) ? (
            <button className="btn btn-primary btn-sm" onClick={() => app.progressVariation(opp.id, 're-estimate')}>Mark identified</button>
          ) : <span className="row-meta">Site Ops records the variation cause and evidence.</span>
        ) : null}
        {next?.key === 're-estimate' ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenEstimate()
              }}
            >
              Open estimation
            </button>
            {canPrice ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  app.progressVariation(opp.id, 'priced')
                  onProgress?.('priced')
                }}
              >
                Mark re-estimate complete
              </button>
            ) : <span className="row-meta">Sign in as {estimatorName} to complete the re-estimate.</span>}
          </>
        ) : null}
        {next?.key === 'approve' ? (
          canApprovePricing(app.user) || canIssueProposal(app.user) ? (
            <button className="btn btn-primary btn-sm" onClick={() => app.progressVariation(opp.id, 'presented')}>Record internal / customer approval</button>
          ) : <span className="row-meta">Delegated authority must approve before execution.</span>
        ) : null}
        {next?.key === 'presented' ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenProposal}>
              Open proposal
            </button>
            {canSales ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (currentProposal(opp)) app.presentProposal(opp.id)
                  else app.progressVariation(opp.id, 'presented')
                  onProgress?.('presented')
                }}
              >
                Mark presented to customer
              </button>
            ) : <span className="row-meta">Sign in as {salesName} to present the variation.</span>}
          </>
        ) : null}
        {next?.key === 'accepted' ? (
          canSales ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                app.progressVariation(opp.id, 'accepted')
                onProgress?.('accepted')
              }}
            >
              Record customer acceptance
            </button>
          ) : <span className="row-meta">Sign in as {salesName} to record acceptance.</span>
        ) : null}
      </div>
    </div>
  )
}

function JobSetupPanel({ opp, app }) {
  const job = opp.jobBaseline || {}
  const can = canSetupJob(app.user)
  const delivery = app.users.filter((u) => u.roles.includes('SOM') && u.unitIds.includes(app.unit.id))
  return (
    <div className="card card-pad">
      <h2>Job setup & cost baseline</h2>
      <p className="sub">Business Operations converts the accepted offer to a job: carry forward the quote, lock the budget, set cost categories and assign Site Ops.</p>
      <div className="form-grid">
        <Field label="Approved budget (ex GST)">
          <NumberInput value={job.approvedBudget || opp.acceptedValue || ''} disabled={!can || !!job.budgetLockedAt} onChange={(v) => app.updateOpportunity(opp.id, { jobBaseline: { ...job, approvedBudget: v } }, 'Updated approved budget')} />
        </Field>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={!!job.budgetConfirmed}
          disabled={!can}
          onChange={(e) => app.updateOpportunity(
            opp.id,
            { jobBaseline: { ...job, budgetConfirmed: e.target.checked, approvedBudget: job.approvedBudget || opp.acceptedValue || 0, budgetLockedAt: e.target.checked ? new Date().toISOString() : null } },
            'Updated job baseline',
          )}
        />
        Approved budget / cost baseline locked{job.budgetLockedAt ? ` (${formatDate(job.budgetLockedAt)})` : ''}
      </label>
      <label className="check">
        <input type="checkbox" checked={!!job.costCategories} disabled={!can} onChange={(e) => app.updateOpportunity(opp.id, { jobBaseline: { ...job, costCategories: e.target.checked } }, 'Updated cost categories')} />
        Cost categories created
      </label>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Key dates">
          <input defaultValue={job.keyDates} disabled={!can} onBlur={(e) => app.updateOpportunity(opp.id, { jobBaseline: { ...job, keyDates: e.target.value } }, 'Updated key dates')} />
        </Field>
        <Field label="Delivery owner">
          <select
            value={opp.owners?.deliveryId || ''}
            disabled={!can}
            onChange={(e) => app.updateOpportunity(opp.id, { owners: { ...opp.owners, deliveryId: e.target.value } }, 'Assigned delivery owner')}
          >
            <option value="">Select Site Operations</option>
            {delivery.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      <FileUpload
        files={(opp.documents || []).filter((d) => d.stage === 6 || d.type === 'contract')}
        userId={app.user.id}
        stage={6}
        type="contract"
        title="Contract pack"
        hint="Accepted quote, contract and baseline attachments."
        onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'contract', stage: 6 })))}
        onRemove={(docId) => app.removeDocument(opp.id, docId)}
      />
    </div>
  )
}

function ApprovalsPanel({ opp, app }) {
  const can = canManageApprovals(app.user)
  const [newApproval, setNewApproval] = useState({ label: '', required: true })
  const toggleChecklist = (key) => {
    const current = opp.approvalChecklist || []
    const has = current.some((c) => c.key === key)
    const next = has ? current.map((c) => (c.key === key ? { ...c, done: !c.done } : c)) : [...current, { key, done: true }]
    app.updateOpportunity(opp.id, { approvalChecklist: next }, 'Updated approval checklist', key)
  }
  return (
    <>
    <div className="card card-pad">
      <h2>Approvals & procurement</h2>
      <p className="sub">Each approval is its own record. Delivery cannot start until every mandatory item is Approved or authorised Not Required.</p>

      <h3>Pre-checklist</h3>
      {APPROVAL_CHECKLIST.map((c) => {
        const done = (opp.approvalChecklist || []).find((x) => x.key === c.key)?.done
        return (
          <label className="check" key={c.key}>
            <input type="checkbox" checked={!!done} disabled={!can} onChange={() => toggleChecklist(c.key)} /> {c.label}
          </label>
        )
      })}

      <h3 style={{ marginTop: 20 }}>Approval items</h3>
      {(opp.approvals || []).map((a) => (
        <div className="list-item" key={a.id} style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row-title">{a.label} {a.required ? '' : '(optional)'}</div>
            {can ? (
              <textarea rows={1} className="search" style={{ marginTop: 6, width: '100%' }} defaultValue={a.notes} placeholder="Notes" onBlur={(e) => app.updateApproval(opp.id, a.id, { notes: e.target.value })} />
            ) : (
              <div className="row-meta">{a.notes || 'No note yet'}</div>
            )}
            <FileUpload
              compact
              files={(opp.documents || []).filter((d) => d.label === `approval_${a.id}`)}
              userId={app.user.id}
              stage={7}
              type="approval_doc"
              label={`approval_${a.id}`}
              onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'approval_doc', stage: 7, label: `approval_${a.id}` })))}
              onRemove={(docId) => app.removeDocument(opp.id, docId)}
            />
          </div>
          {can ? (
            <select className="select" style={{ maxWidth: 160 }} value={a.status} onChange={(e) => app.updateApproval(opp.id, a.id, { status: e.target.value, outcomeAt: ['Approved', 'Rejected', 'Not Required'].includes(e.target.value) ? new Date().toISOString() : a.outcomeAt })}>
              {['Not Started', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Not Required', 'Expired'].map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : <Badge tone={a.status === 'Approved' || a.status === 'Not Required' ? 'success' : a.status === 'Rejected' ? 'danger' : 'warning'}>{a.status}</Badge>}
        </div>
      ))}
      {can ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="New approval requirement"><input value={newApproval.label} onChange={(e) => setNewApproval({ ...newApproval, label: e.target.value })} /></Field>
          <Field label="Required">
            <label className="check">
              <input type="checkbox" checked={newApproval.required} onChange={(e) => setNewApproval({ ...newApproval, required: e.target.checked })} /> Mandatory before delivery
            </label>
          </Field>
          <div className="span-2">
            <button
              className="btn btn-ghost"
              disabled={!newApproval.label}
              onClick={() => {
                app.updateOpportunity(
                  opp.id,
                  { approvals: [...(opp.approvals || []), { id: uid('appr'), type: 'custom', label: newApproval.label, required: newApproval.required, status: 'Not Started', ownerRole: 'BOP', submittedAt: null, outcomeAt: null, notes: '', documentName: '' }] },
                  'Added approval requirement',
                  newApproval.label,
                )
                setNewApproval({ label: '', required: true })
              }}
            >
              Add approval requirement
            </button>
          </div>
        </div>
      ) : null}
      {hasRole(app.user, 'BDM', 'DBD', 'DIR', 'EST', 'SOM', 'BOP') ? (
        <div style={{ marginTop: 16 }}>
          <VariationBox opp={opp} app={app} />
        </div>
      ) : null}
    </div>
      <div style={{ height: 16 }} />
      <ProcurementPanel opp={opp} app={app} />
    </>
  )
}

function VariationBox({ opp, app }) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  if (opp.stage < 6) return null
  if (opp.variationPending) {
    return <p className="lede">A variation is already open. Complete the three steps above before raising another.</p>
  }
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

function SitePanel({ opp, app, userName }) {
  const can = canSignSite(app.user)
  const showCost = canSeeCost(app.user)
  const sw = opp.siteWorks || {}
  const [assignee, setAssignee] = useState({})
  const teamOptions = app.users.filter((u) => u.unitIds.includes(app.unit.id))
  return (
    <div className="card card-pad">
      <h2>Site planning & delivery</h2>
      <p className="sub">Pre-start, materials and installation. Testing and handover are the next block. Variations freeze progression until reconciled.</p>
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
            <div className="substage" key={s.key} style={{ flexWrap: 'wrap' }}>
              <Badge tone={rec.status === 'signed_off' ? 'success' : rec.status === 'failed' ? 'danger' : rec.status === 'in_progress' ? 'warning' : 'neutral'}>{s.key}</Badge>
              <div>
                <div className="row-title">{s.label}</div>
                <div className="row-meta">{s.hint}</div>
                {rec.status === 'failed' ? <div className="row-meta">Defect: {rec.defects || '—'}{rec.assignedTo ? ` · Assigned to ${userName(rec.assignedTo)}` : ''}</div> : null}
                <FileUpload
                  compact
                  files={(opp.documents || []).filter((d) => d.label === s.key)}
                  userId={app.user.id}
                  stage={8}
                  type="site_evidence"
                  label={s.key}
                  accept="image/*,.pdf"
                  onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'site_evidence', stage: 8, label: s.key })))}
                  onRemove={(docId) => app.removeDocument(opp.id, docId)}
                />
              </div>
              {rec.status === 'signed_off' ? <span className="row-meta">Signed {formatDate(rec.signedOffAt)}</span> : can ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => app.signSubstage(opp.id, s.key, { photos: [{ name: `${s.key}.jpg`, at: new Date().toISOString() }] })}>Sign off</button>
                  {s.key === '8c' ? (
                    <>
                      <select className="select" style={{ maxWidth: 140 }} value={assignee[s.key] || ''} onChange={(e) => setAssignee({ ...assignee, [s.key]: e.target.value })}>
                        <option value="">Assign defect to…</option>
                        {teamOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <button className="btn btn-sm btn-danger" onClick={() => app.signSubstage(opp.id, s.key, { failed: true, defects: 'Installation blocked', assignedTo: assignee[s.key] || '' })}>Fail</button>
                    </>
                  ) : null}
                </div>
              ) : <span className="row-meta">{rec.status}</span>}
            </div>
          )
        })}
      </div>
      <div className="section" style={{ marginTop: 20 }}>
        <h3>Compliance & subcontractors</h3>
        <Field label="Insurance & subcontract details">
          <textarea rows={3} defaultValue={sw.insuranceDetails} disabled={!can} onBlur={(e) => app.updateSiteWorks(opp.id, { insuranceDetails: e.target.value })} placeholder="Subcontractor names, insurer, policy numbers, expiry dates" />
        </Field>
        <FileUpload
          compact
          files={(opp.documents || []).filter((d) => d.type === 'insurance')}
          userId={app.user.id}
          stage={8}
          type="insurance"
          title="Insurance certificates"
          onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'insurance', stage: 8 })))}
          onRemove={(docId) => app.removeDocument(opp.id, docId)}
        />
        {showCost ? (
          <Field label="Actual cost to date (ex GST)" hint="against the approved budget from Job Setup">
            <NumberInput value={sw.actualCost} disabled={!can} onChange={(v) => app.updateSiteWorks(opp.id, { actualCost: v })} />
          </Field>
        ) : null}
      </div>
    </div>
  )
}

function HandoverWorksPanel({ opp, app, userName }) {
  const can = canSignSite(app.user)
  const showCost = canSeeCost(app.user)
  const items = opp.siteWorks?.handover?.length ? opp.siteWorks.handover : HANDOVER_SUBSTAGES.map((s) => ({ ...s, status: 'not_started' }))
  const [assignee, setAssignee] = useState({})
  const [cost, setCost] = useState({ description: '', amount: '' })
  const teamOptions = app.users.filter((u) => u.unitIds.includes(app.unit.id))
  return (
    <div className="card card-pad">
      <h2>Test, commission & handover</h2>
      <p className="sub">Operational completion is separate from invoices and payments. Commissioning creates the final billing request.</p>
      {HANDOVER_SUBSTAGES.map((s) => {
        const rec = items.find((x) => x.key === s.key) || { status: 'not_started' }
        return (
            <div className="substage" key={s.key} style={{ flexWrap: 'wrap' }}>
              <Badge tone={rec.status === 'signed_off' ? 'success' : rec.status === 'failed' ? 'danger' : 'neutral'}>{s.key}</Badge>
              <div>
                <div className="row-title">{s.label}</div>
                <div className="row-meta">{s.hint}</div>
                {rec.status === 'failed' ? <div className="row-meta">Defect: {rec.defects || '—'}{rec.assignedTo ? ` · Assigned to ${userName(rec.assignedTo)}` : ''}</div> : null}
                <FileUpload
                  compact
                  files={(opp.documents || []).filter((d) => d.label === s.key)}
                  userId={app.user.id}
                  stage={9}
                  type="handover"
                  label={s.key}
                  onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'handover', stage: 9, label: s.key })))}
                  onRemove={(docId) => app.removeDocument(opp.id, docId)}
                />
              </div>
              {rec.status === 'signed_off' ? <span className="row-meta">Signed {formatDate(rec.signedOffAt)}</span> : can ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-primary" onClick={() => app.signSubstage(opp.id, s.key, { photos: [{ name: `${s.key}.jpg`, at: new Date().toISOString() }] })}>Sign off</button>
                {s.key === '9b' ? (
                  <>
                    <select className="select" style={{ maxWidth: 140 }} value={assignee[s.key] || ''} onChange={(e) => setAssignee({ ...assignee, [s.key]: e.target.value })}>
                      <option value="">Assign defect to…</option>
                      {teamOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button className="btn btn-sm btn-danger" onClick={() => app.signSubstage(opp.id, s.key, { failed: true, defects: 'Failed commissioning test', assignedTo: assignee[s.key] || '' })}>Fail</button>
                  </>
                ) : null}
              </div>
            ) : <span className="row-meta">{rec.status}</span>}
          </div>
        )
      })}
      {opp.operationalComplete ? <div className="alert success" style={{ marginTop: 12 }}>Operationally complete.</div> : null}

      {showCost ? (
        <div className="section" style={{ marginTop: 20 }}>
          <h3>Final cost reconciliation</h3>
          <Field label="Final labor cost (ex GST)">
            <NumberInput value={opp.laborCostFinal} onChange={(v) => app.updateOpportunity(opp.id, { laborCostFinal: v }, 'Updated final labor cost')} />
          </Field>
          <h4 style={{ marginTop: 16 }}>Additional / unplanned costs</h4>
          {(opp.additionalCosts || []).map((c) => (
            <div className="list-item" key={c.id}>
              <div className="row-title">{c.description}</div>
              <div className="row-meta">{money(c.amount)}</div>
            </div>
          ))}
          <div className="form-grid" style={{ marginTop: 8 }}>
            <Field label="Description"><input value={cost.description} onChange={(e) => setCost({ ...cost, description: e.target.value })} /></Field>
            <Field label="Amount"><NumberInput value={cost.amount} onChange={(v) => setCost({ ...cost, amount: v })} /></Field>
            <div className="span-2">
              <button
                className="btn btn-ghost"
                disabled={!cost.description || !cost.amount}
                onClick={() => {
                  app.updateOpportunity(opp.id, { additionalCosts: [...(opp.additionalCosts || []), { id: uid('cost'), description: cost.description, amount: Number(cost.amount) || 0 }] }, 'Added additional cost', cost.description)
                  setCost({ description: '', amount: '' })
                }}
              >
                Add cost
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ServicePanel({ opp, app }) {
  const svc = opp.service || {}
  const [enquiry, setEnquiry] = useState('')
  return (
    <>
      <BillingPanel opp={opp} app={app} />
      <div style={{ height: 16 }} />
      <div className="card card-pad">
        <h2>Post-work service, reviews & referrals</h2>
        <p className="sub">BDM owns the customer relationship. Accounts confirms financial completion separately.</p>
        <label className="check">
          <input type="checkbox" checked={!!svc.reviewRequested} onChange={(e) => app.updateOpportunity(opp.id, { service: { ...svc, reviewRequested: e.target.checked } }, 'Updated service')} />
          Review / feedback requested
        </label>
        <label className="check">
          <input type="checkbox" checked={!!svc.referralCaptured} onChange={(e) => app.updateOpportunity(opp.id, { service: { ...svc, referralCaptured: e.target.checked } }, 'Updated referral')} />
          Referral or repeat opportunity captured
        </label>
        <Field label="Client feedback / review">
          <textarea rows={3} defaultValue={svc.feedbackText} onBlur={(e) => app.updateOpportunity(opp.id, { service: { ...svc, feedbackText: e.target.value } }, 'Captured service feedback')} placeholder="What the customer said, star rating, review link…" />
        </Field>
        <Field label="Service actions">
          <textarea rows={3} defaultValue={svc.actions} onBlur={(e) => app.updateOpportunity(opp.id, { service: { ...svc, actions: e.target.value } }, 'Updated service actions')} />
        </Field>
        <FileUpload
          files={(opp.documents || []).filter((d) => d.stage === 10 || d.type === 'service')}
          userId={app.user.id}
          stage={10}
          type="service"
          title="Service evidence"
          hint="Photos, review screenshots or referral notes."
          onAdd={(records) => app.addDocuments(opp.id, records.map((r) => ({ ...r, type: 'service', stage: 10 })))}
          onRemove={(docId) => app.removeDocument(opp.id, docId)}
        />
        {hasRole(app.user, 'ACC', 'DIR', 'ADM') ? (
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={!!opp.financialComplete} onChange={(e) => app.updateOpportunity(opp.id, { financialComplete: e.target.checked }, 'Financial completion')} />
            Financial completion (billing, payments and actuals reconciled)
          </label>
        ) : (
          <p className="lede" style={{ marginTop: 12 }}>{opp.financialComplete ? 'Financially complete.' : 'Financial completion is with Accounts.'}</p>
        )}

        <h3 style={{ marginTop: 24 }}>Post-work enquiries</h3>
        {(opp.postWorkEnquiries || []).length === 0 ? <p className="lede">No enquiries logged.</p> : null}
        {(opp.postWorkEnquiries || []).map((e) => (
          <div className="list-item" key={e.id}>
            <div>
              <div className="row-title">{e.description}</div>
              <div className="row-meta">{formatDate(e.date)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge tone={e.status === 'Resolved' ? 'success' : 'warning'}>{e.status}</Badge>
              {e.status !== 'Resolved' ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => app.updateOpportunity(opp.id, { postWorkEnquiries: (opp.postWorkEnquiries || []).map((x) => (x.id === e.id ? { ...x, status: 'Resolved' } : x)) }, 'Resolved post-work enquiry', e.description)}
                >
                  Mark resolved
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="search" placeholder="Describe the enquiry or service request" value={enquiry} onChange={(e) => setEnquiry(e.target.value)} />
          <button
            className="btn btn-ghost"
            disabled={!enquiry}
            onClick={() => {
              app.updateOpportunity(opp.id, { postWorkEnquiries: [{ id: uid('enq'), date: new Date().toISOString(), description: enquiry, status: 'Open' }, ...(opp.postWorkEnquiries || [])] }, 'Logged post-work enquiry', enquiry)
              setEnquiry('')
            }}
          >
            Log enquiry
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
      <HandoverPanel opp={opp} app={app} />
    </>
  )
}

function BillingPanel({ opp, app }) {
  const can = canManageBilling(app.user)
  const comm = commissionFor(opp, app.unit.commissionTiers)
  return (
    <div className="card card-pad">
      <h2>Financials (not a separate closure module)</h2>
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
      <h2>Handover notes</h2>
      <p className="sub">Warranty and follow-up stay on the job. There is no separate closure module.</p>
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
