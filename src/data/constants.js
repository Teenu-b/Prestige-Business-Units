export const ROLES = {
  DIR: { code: 'DIR', name: 'Director' },
  DBD: { code: 'DBD', name: 'Director – Business Development / Sales' },
  BDM: { code: 'BDM', name: 'Business Development / Sales Manager' },
  BOP: { code: 'BOP', name: 'Business Operations Manager' },
  SOM: { code: 'SOM', name: 'Site Operations Manager' },
  EST: { code: 'EST', name: 'Estimator' },
  ACC: { code: 'ACC', name: 'Accounts' },
  ADM: { code: 'ADM', name: 'System Administrator' },
  REF: { code: 'REF', name: 'Referrer' },
}

export const STAGES = [
  { id: 2, key: 'lead', label: 'Lead capture & qualification', short: 'Lead', owner: 'BDM' },
  { id: 3, key: 'engagement', label: 'Customer engagement & site inspection', short: 'Inspection', owner: 'BDM' },
  { id: 4, key: 'estimate', label: 'Estimation & validation', short: 'Estimate', owner: 'EST' },
  { id: 5, key: 'proposal', label: 'Proposal, negotiation & acceptance', short: 'Proposal', owner: 'BDM' },
  { id: 6, key: 'job', label: 'Job setup & cost baseline', short: 'Job setup', owner: 'BOP' },
  { id: 7, key: 'procure', label: 'Approvals & procurement', short: 'Procure', owner: 'BOP' },
  { id: 8, key: 'site', label: 'Site planning & delivery', short: 'Delivery', owner: 'SOM' },
  { id: 9, key: 'handover', label: 'Test, commission & handover', short: 'Handover', owner: 'SOM' },
  { id: 10, key: 'service', label: 'Post-work service, reviews & referrals', short: 'Service', owner: 'BDM' },
]

export const LIFECYCLE = {
  Active: { label: 'Active', tone: 'success' },
  OnHold: { label: 'On hold', tone: 'warning' },
  Lost: { label: 'Lost', tone: 'neutral' },
  Cancelled: { label: 'Cancelled', tone: 'danger' },
  ClosedDelivered: { label: 'Complete', tone: 'info' },
  Reopened: { label: 'Reopened', tone: 'info' },
}

export const QUALIFICATION = [
  { key: 'qualified', label: 'Qualified' },
  { key: 'nurture', label: 'Nurture' },
  { key: 'disqualified', label: 'Disqualified' },
]

export const COST_TYPES = [
  { key: 'material', label: 'Material' },
  { key: 'labour', label: 'Labour' },
  { key: 'subcontract', label: 'Subcontract' },
  { key: 'allowance', label: 'Allowance / contingency' },
]

export const APPROVAL_TYPES = [
  { key: 'council', label: 'Council / DA' },
  { key: 'dnsp', label: 'DNSP grid connection' },
  { key: 'strata', label: 'Facility / strata' },
  { key: 'rebate', label: 'Rebate pre-approval' },
  { key: 'technical', label: 'Technical / compliance' },
]

export const APPROVAL_STATUSES = [
  'Not Started',
  'Submitted',
  'Pending',
  'Approved',
  'Rejected',
  'Not Required',
  'Expired',
]

export const SITE_SUBSTAGES = [
  { key: '8a', label: 'Pre-start & site readiness', hint: 'Access, permits, SWMS, people, tools and customer notice.' },
  { key: '8b', label: 'Materials & third parties', hint: 'Materials on site; transport, scaffolding and subcontractors coordinated.' },
  { key: '8c', label: 'Installation', hint: 'Daily progress, quality, safety and completion of installation.' },
]

export const HANDOVER_SUBSTAGES = [
  { key: '9a', label: 'Testing', hint: 'Test results and defects recorded.' },
  { key: '9b', label: 'Commissioning', hint: 'Energise, commission and certificate evidence.' },
  { key: '9c', label: 'Customer handover', hint: 'Manuals, warranties, as-builts, training and sign-off.' },
]

export const INVOLVEMENT_TIERS = [
  { key: 'lead_only', label: 'Lead only', rate: 0.02 },
  { key: 'lead_sales_support', label: 'Lead + sales support', rate: 0.04 },
  { key: 'lead_full_sales', label: 'Lead + full sales ownership', rate: 0.06 },
]

export const PRODUCT_RANGES = [
  'Integrated EV-charging + BESS platform',
  'Specialist C&I storage (on-grid / hybrid)',
  'Inverter-led / utility-grade supply',
  'Electrical & solar services',
]

export const LEAD_SOURCES = [
  { key: 'campaign', label: 'Approved campaign' },
  { key: 'internal', label: 'Internal outreach' },
  { key: 'referrer', label: 'External referrer' },
  { key: 'repeat', label: 'Existing customer / referral' },
  { key: 'inbound', label: 'Inbound enquiry' },
]

export const JURISDICTIONS = ['NSW', 'ACT', 'VIC', 'QLD']

export const BILLING_MILESTONES = [
  { key: 'deposit', label: 'Acceptance deposit', percent: 20, event: 'Customer acceptance' },
  { key: 'delivery', label: 'Material delivery', percent: 40, event: 'Physical delivery to site' },
  { key: 'final', label: 'Commissioning', percent: 40, event: 'Commissioning sign-off' },
]

export const DEMO_PASSWORD = 'Prestige1'
export const STORAGE_KEY = 'prestige-bpm-v12'
export const GST_RATE = 0.1
export const DEFAULT_MARGIN_FLOOR = 18
export const DEFAULT_SLA_DAYS = {
  1: 5,
  2: 3,
  3: 7,
  4: 5,
  5: 10,
  6: 5,
  7: 15,
  8: 20,
  9: 7,
  10: 10,
  approval: 15,
}
