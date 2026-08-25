import { isSalesPhase, workStage } from './workflow'

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
  return hasRole(user, 'EST', 'BDM', 'DBD', 'DIR', 'ADM', 'ACC', 'SOM', 'BOP')
}

export function canSeeFinancials(user) {
  return hasRole(user, 'ACC', 'DIR', 'ADM', 'BDM', 'DBD')
}

export function canViewOpportunity(user, opp) {
  if (!user || !opp) return false
  if (hasRole(user, 'DIR', 'ADM', 'DBD')) return true
  if (hasRole(user, 'REF')) return opp.referrerId === user.referrerId
  if (hasRole(user, 'BDM') && isSalesPhase(opp.stage)) return true
  if (hasRole(user, 'SOM') && opp.stage >= 6) return true
  const owners = opp.owners || {}
  const mine = [owners.leadId, owners.estimatorId, owners.salespersonId, owners.deliveryId].includes(user.id)
  if (mine) return true
  if (hasRole(user, 'BOP', 'ACC') && opp.stage >= 5) return true
  if (hasRole(user, 'EST')) return mine
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

  if (hasRole(user, 'BDM', 'DBD', 'DIR', 'ADM')) {
    items.push({ to: '/marketing', label: 'Marketing' })
  }
  if (hasRole(user, 'BOP', 'SOM', 'DIR', 'ADM', 'BDM', 'DBD')) {
    items.push({ to: '/approvals', label: 'Approvals' })
  }
  if (hasRole(user, 'BOP', 'SOM', 'ACC', 'DIR', 'ADM')) {
    items.push({ to: '/procurement', label: 'Procurement' })
  }
  if (hasRole(user, 'EST', 'BDM', 'DBD', 'DIR', 'ADM')) {
    items.push({ to: '/quotes', label: 'Quotes' })
  }
  if (hasRole(user, 'EST', 'BDM', 'DBD', 'DIR', 'ADM', 'BOP', 'ACC')) {
    items.push({ to: '/costs', label: 'Costs' })
  }
  if (hasRole(user, 'ACC', 'DIR', 'ADM', 'SOM', 'BOP')) {
    items.push({ to: '/billing', label: 'Financials' })
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
  return hasRole(user, 'BDM', 'DBD', 'DIR', 'ADM', 'REF')
}

export function canManageCampaigns(user) {
  return hasRole(user, 'BDM', 'DBD', 'DIR', 'ADM')
}

export function canApproveCampaign(user) {
  return hasRole(user, 'DIR', 'DBD', 'ADM')
}

export function canEditEstimate(user) {
  return hasRole(user, 'EST', 'DIR', 'ADM')
}

export function canIssueProposal(user) {
  return hasRole(user, 'BDM', 'DBD', 'DIR', 'ADM')
}

export function canApprovePricing(user) {
  return hasRole(user, 'DIR', 'DBD')
}

export function canManageApprovals(user) {
  return hasRole(user, 'BOP', 'SOM', 'DIR', 'ADM')
}

export function canManageProcurement(user) {
  return hasRole(user, 'BOP', 'SOM', 'DIR', 'ADM')
}

export function canSignSite(user) {
  return hasRole(user, 'SOM', 'DIR', 'ADM')
}

export function canSetupJob(user) {
  return hasRole(user, 'BOP', 'DIR', 'ADM')
}

export function canManageBilling(user) {
  return hasRole(user, 'ACC', 'DIR', 'ADM')
}

export function canAdmin(user) {
  return hasRole(user, 'ADM')
}

export function canAdvance(user, opp) {
  if (!user || !opp) return false
  if (hasRole(user, 'DIR', 'ADM', 'DBD')) return true
  const map = {
    2: ['BDM'],
    3: ['BDM', 'SOM'],
    4: ['EST'],
    5: ['BDM'],
    6: ['BOP'],
    7: ['BOP', 'SOM'],
    8: ['SOM'],
    9: ['SOM'],
    10: ['BDM', 'ACC', 'SOM'],
  }
  return hasRole(user, ...(map[workStage(opp.stage)] || []))
}
