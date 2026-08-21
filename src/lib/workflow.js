import {
  APPROVAL_TYPES,
  DEFAULT_MARGIN_FLOOR,
  GST_RATE,
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
  const estimate = [...(opp.estimates || [])].sort((a, b) => b.version - a.version)[0]
  if (!estimate) return null
  return estimate.options.find((o) => o.selected) || estimate.options[0] || null
}

export function currentProposal(opp) {
  return [...(opp.proposals || [])].sort((a, b) => b.version - a.version)[0] || null
}

export function stageMeta(stage) {
  return STAGES.find((s) => s.id === stage) || STAGES[0]
}

export function isSalesPhase(stage) {
  return stage >= 1 && stage <= 4
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
  return missing
}

export function gateStatus(opp) {
  const missing = []
  if (isTerminal(opp.lifecycle) && opp.lifecycle !== 'Reopened') {
    return { canAdvance: false, missing: ['Opportunity is not active'], reason: opp.lifecycle }
  }
  if (opp.variationPending && opp.stage >= 5) {
    return {
      canAdvance: false,
      missing: ['A variation is pending acceptance'],
      variation: true,
    }
  }

  switch (opp.stage) {
    case 1: {
      const fields = missingLeadFields(opp)
      if (fields.length) missing.push(...fields)
      if (!opp.owners?.estimatorId) missing.push('Assigned estimator')
      break
    }
    case 2: {
      const est = [...(opp.estimates || [])].sort((a, b) => b.version - a.version)[0]
      if (!est || !est.options?.length) missing.push('At least one solution option')
      else if (!est.options.some((o) => o.priceEx && o.costEx != null)) missing.push('Cost and price on an option')
      if (!est?.issued) missing.push('Estimation pack issued to sales')
      break
    }
    case 3: {
      const p = currentProposal(opp)
      if (!p) missing.push('Proposal generated')
      if (!p?.presentedAt) missing.push('Proposal presented to customer')
      if (!opp.feedback) missing.push('Customer feedback captured')
      break
    }
    case 4: {
      const p = currentProposal(opp)
      if (!p?.acceptedAt) missing.push('Signed customer acceptance')
      if (p && belowFloor(p.margin, opp.marginFloor) && p.directorApproval?.status !== 'approved') {
        missing.push('Director approval for below-floor pricing')
      }
      break
    }
    case 5: {
      const pending = (opp.approvals || []).filter(
        (a) => a.required && !['Approved', 'Not Required'].includes(a.status),
      )
      if (pending.length) missing.push(`${pending.length} mandatory approval${pending.length > 1 ? 's' : ''} outstanding`)
      break
    }
    case 6: {
      const pos = opp.purchaseOrders || []
      if (!pos.length) missing.push('At least one purchase order')
      if (pos.some((po) => !po.eta)) missing.push('Delivery dates on all POs')
      break
    }
    case 7: {
      const subs = opp.siteWorks?.substages || []
      const open = SITE_SUBSTAGES.filter((s) => {
        const rec = subs.find((x) => x.key === s.key)
        return rec?.status !== 'signed_off'
      })
      if (!opp.siteWorks?.installWindowStart) missing.push('Installation window booked')
      if (open.length) missing.push(`${open.length} site sub-stage${open.length > 1 ? 's' : ''} not signed off`)
      break
    }
    case 8: {
      const bills = opp.billingRequests || []
      if (!bills.length) missing.push('Milestone billing requests')
      if ((opp.rebates || []).some((r) => r.status === 'Not lodged')) missing.push('Rebate lodgements')
      break
    }
    case 9: {
      if (!opp.closure?.warrantyContact) missing.push('Warranty contact')
      if (!opp.closure?.checklistComplete) missing.push('Closure checklist')
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

export function defaultSubstages() {
  return SITE_SUBSTAGES.map((s) => ({
    key: s.key,
    label: s.label,
    status: 'not_started',
    checklist: [
      { id: uid('ck'), label: 'Completed on site', done: false },
      { id: uid('ck'), label: 'Photos attached', done: false },
    ],
    photos: [],
    defects: '',
    signedOffAt: null,
    signedOffBy: null,
  }))
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
    status: opp.stage >= 9 ? 'calculated' : 'pending',
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
    key: 're-estimate',
    title: '1. Re-estimate',
    detail: 'Estimator updates cost and price for the new scope, then issues the revised pack to sales.',
    owner: 'Estimator',
  },
  {
    key: 'presented',
    title: '2. Present to customer',
    detail: 'Sales opens Proposal, shows the revised price, and marks it presented.',
    owner: 'Sales',
  },
  {
    key: 'accepted',
    title: '3. Record acceptance',
    detail: 'When the customer accepts the variation, Approvals can continue.',
    owner: 'Sales',
  },
]

export function currentVariation(opp) {
  return (opp.variations || [])[0] || null
}

export function variationNextStep(opp) {
  const v = currentVariation(opp)
  if (!opp.variationPending || !v) return null
  if (v.status === 're-estimate') return VARIATION_STEPS[0]
  if (v.status === 'presented') return VARIATION_STEPS[2]
  if (v.status === 'priced') return VARIATION_STEPS[1]
  return VARIATION_STEPS[0]
}
