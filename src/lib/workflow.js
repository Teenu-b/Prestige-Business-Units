import {
  APPROVAL_TYPES,
  DEFAULT_MARGIN_FLOOR,
  GST_RATE,
  HANDOVER_SUBSTAGES,
  INVOLVEMENT_TIERS,
  SITE_SUBSTAGES,
  STAGES,
} from '../data/constants'
import { uid } from './format'

export function calcMargin(priceEx, costEx) {
  const price = Number(priceEx)
  const cost = Number(costEx)
  if (!price || price <= 0) return 0
  return ((price - cost) / price) * 100
}

export function belowFloor(margin, floor = DEFAULT_MARGIN_FLOOR) {
  return Number(margin) < Number(floor)
}

export function gstOn(ex) {
  const n = Number(ex) || 0
  return Math.round(n * GST_RATE * 100) / 100
}

export function incGst(ex) {
  const n = Number(ex) || 0
  return Math.round((n + gstOn(n)) * 100) / 100
}

export function selectedOption(opp) {
  const estimate = [...(opp?.estimates || [])].sort((a, b) => b.version - a.version)[0]
  if (!estimate) return null
  const options = estimate.options || []
  return options.find((o) => o.selected) || options[0] || null
}

export function currentProposal(opp) {
  return [...(opp.proposals || [])].sort((a, b) => b.version - a.version)[0] || null
}

export function workStage(stage) {
  const n = Number(stage) || 2
  return n < 2 ? 2 : n
}

export function stageMeta(stage) {
  const id = workStage(stage)
  return STAGES.find((s) => s.id === id) || STAGES[0]
}

export function isSalesPhase(stage) {
  const id = workStage(stage)
  return id >= 2 && id <= 5
}

export function isTerminal(lifecycle) {
  return ['Lost', 'Cancelled', 'ClosedDelivered'].includes(lifecycle)
}

function filled(value) {
  return String(value || '').trim().length > 0
}

export function missingLeadFields(opp) {
  const missing = []
  if (!filled(opp.customer?.legalName)) missing.push('Business name')
  if (!filled(opp.site?.line1) || !filled(opp.site?.suburb)) missing.push('Site street and suburb')
  if (!filled(opp.contact?.name) || !filled(opp.contact?.email)) missing.push('Decision-maker contact')
  if (!filled(opp.energy?.annualKwh) && !opp.energy?.hasBills) missing.push('Energy usage or bills')
  if (!opp.leadSource) missing.push('Lead source')
  if (opp.leadSource === 'referrer' && !opp.referrerId) missing.push('Referrer')
  if (!opp.qualification) missing.push('Qualification outcome')
  if (!filled(opp.nextAction)) missing.push('Next action')
  if (!opp.nextActionDue) missing.push('Next-action due date')
  if (!opp.owners?.leadId && !opp.owners?.salespersonId) missing.push('Primary owner')
  return missing
}

export function gateStatus(opp) {
  const missing = []
  if (isTerminal(opp.lifecycle) && opp.lifecycle !== 'Reopened') {
    return { canAdvance: false, missing: ['Opportunity is not active'], reason: opp.lifecycle }
  }
  if (opp.variationPending && opp.stage >= 6) {
    return {
      canAdvance: false,
      missing: ['A variation is pending acceptance'],
      variation: true,
    }
  }

  switch (workStage(opp.stage)) {
    case 2: {
      const fields = missingLeadFields(opp)
      if (fields.length) missing.push(...fields)
      if (opp.qualification !== 'qualified') missing.push('Lead must be Qualified to progress (or mark Lost / Nurture)')
      if (!opp.owners?.estimatorId) missing.push('Assigned estimator')
      break
    }
    case 3: {
      const insp = opp.inspection || {}
      const docs = opp.documents || []
      const hasPhotos = insp.photos || docs.some((d) => d.kind === 'photo' || d.type === 'photo' || d.type === 'site_photo')
      const hasDrawings = insp.drawings || docs.some((d) => d.type === 'drawing' || d.type === 'survey')
      if (!hasPhotos) missing.push('Site photos')
      if (!hasDrawings) missing.push('Drawings / survey')
      if (!insp.measurements) missing.push('Measurements')
      if (!filled(insp.constraints)) missing.push('Site constraints / hazards')
      if (!(opp.meetings || []).length) missing.push('At least one contact / meeting record')
      break
    }
    case 4: {
      if (opp.estimateReturn?.open) missing.push(`Estimator returned missing items: ${opp.estimateReturn.items}`)
      const est = [...(opp.estimates || [])].sort((a, b) => b.version - a.version)[0]
      if (!est || !est.options?.length) missing.push('Itemised estimate')
      else if (!est.options.some((o) => o.priceEx && o.costEx != null)) missing.push('Cost, sell price and target margin by item')
      if (!est?.issued) missing.push('Estimator completion checklist — pack issued to BDM/Sales')
      break
    }
    case 5: {
      const p = currentProposal(opp)
      if (!p) missing.push('Controlled proposal generated')
      if (!p?.presentedAt) missing.push('Proposal presented to customer')
      if (!p?.acceptedAt) missing.push('Signed customer acceptance')
      if (p && belowFloor(p.margin, opp.marginFloor) && p.directorApproval?.status !== 'approved') {
        missing.push('Director approval for below-floor pricing')
      }
      break
    }
    case 6: {
      const job = opp.jobBaseline || {}
      if (!job.budgetConfirmed) missing.push('Approved budget / cost baseline')
      if (!job.costCategories) missing.push('Cost categories created')
      if (!filled(job.keyDates)) missing.push('Key delivery dates')
      if (!opp.owners?.deliveryId) missing.push('Delivery owner assigned')
      break
    }
    case 7: {
      const pending = (opp.approvals || []).filter(
        (a) => a.required && !['Approved', 'Not Required'].includes(a.status),
      )
      if (pending.length) missing.push(`${pending.length} mandatory approval${pending.length > 1 ? 's' : ''} outstanding`)
      const pos = opp.purchaseOrders || []
      if (!pos.length) missing.push('Procurement list with at least one commitment')
      if (pos.some((po) => !po.eta)) missing.push('Delivery dates on all commitments')
      break
    }
    case 8: {
      const subs = opp.siteWorks?.substages || []
      const open = SITE_SUBSTAGES.filter((s) => {
        const rec = subs.find((x) => x.key === s.key)
        return rec?.status !== 'signed_off'
      })
      if (!opp.siteWorks?.installWindowStart) missing.push('Installation window booked')
      if (open.length) missing.push(`${open.length} delivery checklist item${open.length > 1 ? 's' : ''} not signed off`)
      break
    }
    case 9: {
      const subs = opp.siteWorks?.handover || []
      const open = HANDOVER_SUBSTAGES.filter((s) => {
        const rec = subs.find((x) => x.key === s.key)
        return rec?.status !== 'signed_off'
      })
      if (open.length) missing.push(`${open.length} test/handover item${open.length > 1 ? 's' : ''} not signed off`)
      if (!opp.operationalComplete) missing.push('Operational completion confirmed')
      break
    }
    case 10: {
      const svc = opp.service || {}
      if (!svc.reviewRequested) missing.push('Review / feedback requested')
      break
    }
    default:
      break
  }
  return { canAdvance: missing.length === 0, missing }
}

export function defaultApprovals() {
  return APPROVAL_TYPES.map((t) => ({
    id: uid('appr'),
    type: t.key,
    label: t.label,
    required: t.key !== 'rebate',
    status: 'Not Started',
    ownerRole: 'BOP',
    submittedAt: null,
    outcomeAt: null,
    notes: '',
    documentName: '',
  }))
}

function blankSubstage(s) {
  return {
    key: s.key,
    label: s.label,
    status: 'not_started',
    checklist: [
      { id: uid('ck'), label: 'Completed on site', done: false },
      { id: uid('ck'), label: 'Evidence attached', done: false },
    ],
    photos: [],
    defects: '',
    signedOffAt: null,
    signedOffBy: null,
  }
}

export function defaultSubstages() {
  return SITE_SUBSTAGES.map(blankSubstage)
}

export function defaultHandover() {
  return HANDOVER_SUBSTAGES.map(blankSubstage)
}

export function commissionFor(opp, configTiers = INVOLVEMENT_TIERS) {
  if (!opp.referrerId) return null
  const tier = configTiers.find((t) => t.key === opp.involvementTier) || configTiers[0]
  const basis = Number(opp.acceptedValue || selectedOption(opp)?.priceEx || 0)
  const amount = Math.round(basis * tier.rate * 100) / 100
  return {
    basis,
    tier: tier.key,
    tierLabel: tier.label,
    rate: tier.rate,
    amount,
    status: opp.operationalComplete ? 'calculated' : 'pending',
  }
}

export function nextNumber(opportunities, unitCode) {
  const prefix = `${unitCode}-26-`
  const nums = opportunities
    .filter((o) => o.number?.startsWith(prefix))
    .map((o) => Number(o.number.replace(prefix, '')))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export const VARIATION_STEPS = [
  {
    key: 'identify',
    title: '1. Identify',
    detail: 'Record cause, scope impact, urgency, photos and any immediate safety action.',
    owner: 'Site Ops',
  },
  {
    key: 're-estimate',
    title: '2. Assess',
    detail: 'Estimator / Business Ops prices the change, forecast and expected margin.',
    owner: 'Estimator',
  },
  {
    key: 'approve',
    title: '3. Approve',
    detail: 'Internal and customer approval before committing cost, unless emergency authority is recorded.',
    owner: 'Delegated authority',
  },
  {
    key: 'presented',
    title: '4. Execute',
    detail: 'Issue revised instruction; present and deliver against the approved variation reference.',
    owner: 'Site Ops / BDM',
  },
  {
    key: 'accepted',
    title: '5. Reconcile',
    detail: 'Update forecast, billing request and actuals; retain the audit trail.',
    owner: 'Business Ops / Accounts',
  },
]

export function currentVariation(opp) {
  return (opp.variations || [])[0] || null
}

export function variationNextStep(opp) {
  const v = currentVariation(opp)
  if (!opp.variationPending || !v) return null
  const status = v.status || 'identify'
  if (status === 'identify') return VARIATION_STEPS[0]
  if (status === 're-estimate') return VARIATION_STEPS[1]
  if (status === 'priced' || status === 'approve') return VARIATION_STEPS[2]
  if (status === 'presented') return VARIATION_STEPS[3]
  if (status === 'accepted') return VARIATION_STEPS[4]
  return VARIATION_STEPS[0]
}
