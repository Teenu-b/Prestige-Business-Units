export const ROLES = {
  LG: { code: 'LG', name: 'Lead Generator' },
  EST: { code: 'EST', name: 'Estimator' },
  SLS: { code: 'SLS', name: 'Salesperson' },
  SS: { code: 'SS', name: 'Sales Supervisor' },
  DIR: { code: 'DIR', name: 'Director' },
  BOP: { code: 'BOP', name: 'Business Operations' },
  SOM: { code: 'SOM', name: 'Site Operations Manager' },
  CC: { code: 'CC', name: 'Compliance & Contracts' },
  ACC: { code: 'ACC', name: 'Accounts' },
  ADM: { code: 'ADM', name: 'System Administrator' },
  REF: { code: 'REF', name: 'Referrer' },
}

export const STAGES = [
  { id: 1, key: 'lead', label: 'Lead', short: 'Lead' },
  { id: 2, key: 'estimate', label: 'Estimation', short: 'Estimate' },
  { id: 3, key: 'proposal', label: 'Proposal', short: 'Proposal' },
  { id: 4, key: 'closure', label: 'Sales closure', short: 'Closure' },
  { id: 5, key: 'approvals', label: 'Approvals', short: 'Approvals' },
  { id: 6, key: 'procurement', label: 'Procurement', short: 'Procurement' },
  { id: 7, key: 'site', label: 'Site works', short: 'Site Works' },
  { id: 8, key: 'billing', label: 'Billing', short: 'Billing' },
  { id: 9, key: 'handover', label: 'Handover', short: 'Close' },
]

export const LIFECYCLE = {
  Active: { label: 'Active', tone: 'success' },
  OnHold: { label: 'On hold', tone: 'warning' },
  Lost: { label: 'Lost', tone: 'neutral' },
  Cancelled: { label: 'Cancelled', tone: 'danger' },
  ClosedDelivered: { label: 'Closed / delivered', tone: 'info' },
  Reopened: { label: 'Reopened', tone: 'info' },
}

export const APPROVAL_TYPES = [
  { key: 'council', label: 'Council / DA' },
  { key: 'dnsp', label: 'DNSP grid connection' },
  { key: 'strata', label: 'Facility / strata' },
  { key: 'rebate', label: 'Rebate pre-approval' },
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
  { key: '7a', label: 'Pre-work site check', hint: 'Access, conditions and readiness for enabling works.' },
  { key: '7b', label: 'Civil / enabling works', hint: 'Footings, trenching, mounting and cabling infrastructure.' },
  { key: '7c', label: 'Site readiness', hint: 'Confirm the site can receive and install equipment.' },
  { key: '7d', label: 'Installation', hint: 'Install BESS, solar, EV chargers and associated equipment.' },
  { key: '7e', label: 'Commissioning', hint: 'Energise, test, customer sign-off and certificate.' },
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
]

export const LEAD_SOURCES = [
  { key: 'internal', label: 'Internal outreach' },
  { key: 'referrer', label: 'External referrer' },
  { key: 'repeat', label: 'Existing customer' },
  { key: 'inbound', label: 'Inbound enquiry' },
]

export const JURISDICTIONS = ['NSW', 'ACT', 'VIC', 'QLD']

export const BILLING_MILESTONES = [
  { key: 'deposit', label: 'Acceptance deposit', percent: 20, event: 'Customer acceptance' },
  { key: 'delivery', label: 'Material delivery', percent: 40, event: 'Physical delivery to site' },
  { key: 'final', label: 'Commissioning', percent: 40, event: 'Commissioning sign-off' },
]

export const DEMO_PASSWORD = 'Prestige1'
export const STORAGE_KEY = 'prestige-phase1-v1'
export const GST_RATE = 0.1
export const DEFAULT_MARGIN_FLOOR = 18
export const DEFAULT_SLA_DAYS = {
  1: 3,
  2: 5,
  3: 7,
  4: 10,
  5: 15,
  6: 10,
  7: 20,
  8: 7,
  9: 5,
  approval: 15,
}
