import { isSalesPhase } from './workflow'

export function hasRole(user, ...codes) {
  if (!user) return false
  return codes.some((c) => user.roles.includes(c))
}

export function canAccessUnit(user, unitId) {
  if (!user) return false
  if (hasRole(user, 'ADM', 'DIR')) return user.unitIds.includes(unitId) || hasRole(user, 'ADM')
  return user.unitIds.includes(unitId)
}

export function canSeeCost(user) {
  return hasRole(user, 'EST', 'SLS', 'SS', 'DIR', 'ADM', 'ACC', 'SOM')
}

export function canSeeFinancials(user) {
  return hasRole(user, 'ACC', 'DIR', 'ADM', 'SS')
}

export function canViewOpportunity(user, opp) {
  if (!user || !opp) return false
  if (hasRole(user, 'DIR', 'ADM')) return true
  if (hasRole(user, 'REF')) return opp.referrerId === user.referrerId
  if (hasRole(user, 'SS') && isSalesPhase(opp.stage)) return true
  if (hasRole(user, 'SOM') && opp.stage >= 5) return true
  const owners = opp.owners || {}
  const mine = [owners.leadId, owners.estimatorId, owners.salespersonId, owners.deliveryId].includes(user.id)
  if (mine) return true
  if (hasRole(user, 'BOP', 'CC', 'ACC') && opp.stage >= 4) return true
  if (hasRole(user, 'LG', 'EST', 'SLS')) return mine || hasRole(user, 'SS')
  return false
}

export function navFor(user) {
  if (hasRole(user, 'REF')) {
    return [
      { to: '/', label: 'Home' },
      { to: '/pipeline', label: 'My leads' },
    ]
  }

  const items = [
    { to: '/', label: 'Home' },
    { to: '/pipeline', label: 'Pipeline' },
  ]

  if (hasRole(user, 'BOP', 'SOM', 'CC', 'DIR', 'ADM', 'SS')) {
    items.push({ to: '/approvals', label: 'Approvals' })
  }
  if (hasRole(user, 'BOP', 'SOM', 'ACC', 'DIR', 'ADM')) {
    items.push({ to: '/procurement', label: 'Materials' })
  }
  if (hasRole(user, 'ACC', 'DIR', 'ADM', 'SOM')) {
    items.push({ to: '/billing', label: 'Billing' })
  }
  if (!hasRole(user, 'REF')) {
    items.push({ to: '/referrers', label: 'Referrers' })
  }
  if (hasRole(user, 'ADM', 'DIR')) {
    items.push({ to: '/admin', label: 'Admin' })
  }
  return items
}

export function canCreateLead(user) {
  return hasRole(user, 'LG', 'SLS', 'SS', 'DIR', 'ADM', 'REF')
}

export function canEditEstimate(user) {
  return hasRole(user, 'EST', 'SS', 'DIR', 'ADM')
}

export function canIssueProposal(user) {
  return hasRole(user, 'SLS', 'SS', 'DIR', 'ADM')
}

export function canApprovePricing(user) {
  return hasRole(user, 'DIR')
}

export function canManageApprovals(user) {
  return hasRole(user, 'BOP', 'CC', 'SOM', 'DIR', 'ADM')
}

export function canManageProcurement(user) {
  return hasRole(user, 'BOP', 'SOM', 'DIR', 'ADM')
}

export function canSignSite(user) {
  return hasRole(user, 'SOM', 'CC', 'DIR', 'ADM')
}

export function canManageBilling(user) {
  return hasRole(user, 'ACC', 'DIR', 'ADM')
}

export function canAdmin(user) {
  return hasRole(user, 'ADM')
}

export function canAdvance(user, opp) {
  if (!user || !opp) return false
  if (hasRole(user, 'DIR', 'ADM', 'SS')) return true
  const map = {
    1: ['LG', 'SLS', 'SS'],
    2: ['EST', 'SS'],
    3: ['SLS', 'SS'],
    4: ['SLS', 'SS'],
    5: ['BOP', 'SOM', 'CC'],
    6: ['BOP', 'SOM'],
    7: ['SOM', 'CC'],
    8: ['ACC', 'SOM'],
    9: ['DIR', 'SOM'],
  }
  return hasRole(user, ...(map[opp.stage] || []))
}
