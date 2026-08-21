import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEY } from '../data/constants'
import { createSeed } from '../data/seed'
import { addDays, nowIso, uid } from '../lib/format'
import { canViewOpportunity, hasRole } from '../lib/permissions'
import {
  belowFloor,
  calcMargin,
  commissionFor,
  currentProposal,
  defaultApprovals,
  defaultSubstages,
  gateStatus,
  gstOn,
  nextNumber,
  selectedOption,
} from '../lib/workflow'

const AppContext = createContext(null)

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return createSeed()
}

export function AppProvider({ children }) {
  const [store, setStore] = useState(loadState)
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('prestige-session') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  useEffect(() => {
    if (session) sessionStorage.setItem('prestige-session', JSON.stringify(session))
    else sessionStorage.removeItem('prestige-session')
  }, [session])

  const user = store.users.find((u) => u.id === session?.userId) || null
  const unit = store.units.find((u) => u.id === session?.unitId) || null

  const patchOpp = (id, updater, auditAction, auditDetail) => {
    setStore((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((o) => {
        if (o.id !== id) return o
        const next = typeof updater === 'function' ? updater(o) : { ...o, ...updater }
        const entry = auditAction
          ? { id: uid('aud'), at: nowIso(), actorId: user?.id, action: auditAction, detail: auditDetail || '' }
          : null
        return {
          ...next,
          updatedAt: nowIso(),
          audit: entry ? [entry, ...(next.audit || o.audit || [])] : next.audit || o.audit,
        }
      }),
    }))
  }

  const notify = (userIds, title, body, opportunityId) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds]
    setStore((prev) => ({
      ...prev,
      notifications: [
        ...ids.filter(Boolean).map((userId) => ({
          id: uid('n'),
          userId,
          title,
          body,
          opportunityId,
          at: nowIso(),
          read: false,
        })),
        ...prev.notifications,
      ],
    }))
  }

  const value = useMemo(() => {
    const unitOpps = store.opportunities.filter((o) => o.businessUnitId === unit?.id)
    const visibleOpps = user ? unitOpps.filter((o) => canViewOpportunity(user, o)) : []

    return {
      store,
      user,
      unit,
      users: store.users,
      units: user ? store.units.filter((u) => user.unitIds.includes(u.id) || user.roles.includes('ADM')) : store.units,
      referrers: store.referrers,
      opportunities: visibleOpps,
      allOpportunities: unitOpps,
      notifications: store.notifications.filter((n) => n.userId === user?.id),

      login(email, password) {
        const found = store.users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        )
        if (!found) return { ok: false, error: 'Check the email and password, then try again.' }
        const firstUnit = found.unitIds[0]
        setSession({ userId: found.id, unitId: firstUnit })
        return { ok: true, user: found }
      },

      logout() {
        setSession(null)
      },

      switchUnit(unitId) {
        if (!user) return
        if (!user.unitIds.includes(unitId) && !user.roles.includes('ADM')) return
        setSession((s) => ({ ...s, unitId }))
      },

      resetDemo() {
        localStorage.removeItem(STORAGE_KEY)
        setStore(createSeed())
      },

      markRead(id) {
        setStore((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }))
      },

      markAllRead() {
        setStore((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n.userId === user?.id ? { ...n, read: true } : n)),
        }))
      },

      createLead(payload) {
        const number = nextNumber(store.opportunities, unit.code)
        const id = uid('opp')
        const createdAt = nowIso()
        const opp = {
          id,
          number,
          businessUnitId: unit.id,
          stage: 1,
          lifecycle: 'Active',
          variationPending: false,
          marginFloor: unit.marginFloor,
          customer: payload.customer,
          site: {
            ...payload.site,
            line1: String(payload.site?.line1 || payload.customer?.billingAddress || '').trim(),
            suburb: String(payload.site?.suburb || '').trim(),
          },
          contact: payload.contact,
          energy: payload.energy,
          leadSource: hasRole(user, 'REF') ? 'referrer' : payload.leadSource,
          referrerId: hasRole(user, 'REF') ? user.referrerId : payload.referrerId || null,
          involvementTier: hasRole(user, 'REF')
            ? payload.involvementTier || 'lead_only'
            : payload.leadSource === 'referrer'
              ? payload.involvementTier
              : payload.involvementTier || null,
          owners: {
            leadId: user.id,
            estimatorId: payload.estimatorId || '',
            salespersonId: payload.salespersonId || '',
            deliveryId: '',
          },
          createdAt,
          updatedAt: createdAt,
          slaStartedAt: createdAt,
          slaDueAt: addDays(createdAt, unit.slaDays[1] || 3),
          estimates: [],
          proposals: [],
          variations: [],
          approvals: [],
          purchaseOrders: [],
          siteWorks: {
            installWindowStart: '',
            installWindowEnd: '',
            electricalContractor: '',
            civilContractor: '',
            substages: defaultSubstages(),
          },
          billingRequests: [],
          rebates: [],
          documents: payload.documentName
            ? [
                {
                  id: uid('doc'),
                  type: 'energy_bill',
                  name: payload.documentName,
                  version: 1,
                  uploadedAt: createdAt,
                  uploaderId: user.id,
                  size: 'uploaded',
                  mirrorStatus: 'pending',
                },
              ]
            : [],
          audit: [{ id: uid('aud'), at: createdAt, actorId: user.id, action: 'Created lead', detail: number }],
          feedback: '',
          notes: payload.notes || '',
          acceptedValue: 0,
          closure: null,
        }
        setStore((prev) => ({ ...prev, opportunities: [opp, ...prev.opportunities] }))
        if (payload.estimatorId) {
          notify(payload.estimatorId, 'Lead assigned', `${number} is waiting for estimation.`, id)
        }
        return opp
      },

      updateOpportunity(id, fields, action, detail) {
        patchOpp(id, fields, action, detail)
      },

      assignEstimator(id, estimatorId) {
        patchOpp(id, (o) => ({ ...o, owners: { ...o.owners, estimatorId } }), 'Assigned estimator', estimatorId)
        const opp = store.opportunities.find((o) => o.id === id)
        notify(estimatorId, 'Lead assigned', `${opp?.number} has been assigned to you.`, id)
      },

      saveEstimate(id, options) {
        patchOpp(
          id,
          (o) => {
            const current = [...(o.estimates || [])].sort((a, b) => b.version - a.version)[0]
            const version = current && !current.issued ? current.version : (current?.version || 0) + 1
            const estimate = {
              id: current && !current.issued ? current.id : uid('est'),
              version,
              issued: false,
              issuedAt: null,
              options: options.map((opt) => ({
                ...opt,
                id: opt.id || uid('opt'),
                margin: calcMargin(opt.priceEx, opt.costEx),
              })),
            }
            const rest = (o.estimates || []).filter((e) => e.id !== estimate.id)
            const selected = estimate.options.find((x) => x.selected) || estimate.options[0]
            return {
              ...o,
              estimates: [...rest, estimate],
              acceptedValue: selected?.priceEx || o.acceptedValue,
            }
          },
          'Updated estimate',
          'Solution options saved',
        )
      },

      issueEstimate(id) {
        patchOpp(
          id,
          (o) => {
            const estimates = o.estimates.map((e, i, arr) => {
              const latest = arr.reduce((a, b) => (a.version > b.version ? a : b))
              return e.id === latest.id ? { ...e, issued: true, issuedAt: nowIso() } : e
            })
            return { ...o, estimates }
          },
          'Issued estimate',
          'Estimation pack sent to sales',
        )
        const opp = store.opportunities.find((o) => o.id === id)
        notify(opp?.owners.salespersonId, 'Estimate ready', `${opp?.number} is ready for proposal.`, id)
      },

      generateProposal(id) {
        patchOpp(
          id,
          (o) => {
            const option = selectedOption(o)
            const version = (o.proposals?.length || 0) + 1
            const proposal = {
              id: uid('prop'),
              number: `${o.number.replace('PRS-26', 'PRS-P')}-v${version}`,
              version,
              estimateVersion: [...o.estimates].sort((a, b) => b.version - a.version)[0]?.version,
              status: 'draft',
              priceEx: option?.priceEx,
              margin: option?.margin,
              issuedAt: null,
              presentedAt: null,
              directorApproval: null,
              acceptedAt: null,
              signedDocName: '',
            }
            return {
              ...o,
              proposals: [...(o.proposals || []), proposal],
              documents: [
                {
                  id: uid('doc'),
                  type: 'proposal',
                  name: `${proposal.number}.pdf`,
                  version,
                  uploadedAt: nowIso(),
                  uploaderId: user.id,
                  size: 'generated',
                  mirrorStatus: 'pending',
                },
                ...(o.documents || []),
              ],
            }
          },
          'Generated proposal',
          'New proposal version created',
        )
      },

      presentProposal(id) {
        patchOpp(
          id,
          (o) => {
            const p = currentProposal(o)
            return {
              ...o,
              proposals: o.proposals.map((x) => (x.id === p.id ? { ...x, presentedAt: nowIso(), status: 'presented' } : x)),
            }
          },
          'Presented proposal',
          'Marked as presented to customer',
        )
      },

      requestDirectorApproval(id, comment) {
        patchOpp(
          id,
          (o) => {
            const p = currentProposal(o)
            return {
              ...o,
              proposals: o.proposals.map((x) =>
                x.id === p.id
                  ? {
                      ...x,
                      status: 'pending_director',
                      directorApproval: { status: 'requested', by: user.id, at: nowIso(), comment },
                    }
                  : x,
              ),
            }
          },
          'Requested director approval',
          comment,
        )
        const directors = store.users.filter((u) => u.roles.includes('DIR') && u.unitIds.includes(unit.id))
        const opp = store.opportunities.find((o) => o.id === id)
        notify(
          directors.map((d) => d.id),
          'Below-floor pricing needs review',
          `${opp?.number} cannot be issued until you approve it.`,
          id,
        )
      },

      decidePricing(id, approved, comment) {
        patchOpp(
          id,
          (o) => {
            const p = currentProposal(o)
            return {
              ...o,
              proposals: o.proposals.map((x) =>
                x.id === p.id
                  ? {
                      ...x,
                      status: approved ? 'approved' : 'rejected',
                      directorApproval: {
                        ...(x.directorApproval || {}),
                        status: approved ? 'approved' : 'rejected',
                        decidedBy: user.id,
                        decidedAt: nowIso(),
                        decisionComment: comment,
                      },
                    }
                  : x,
              ),
            }
          },
          approved ? 'Approved below-floor pricing' : 'Rejected below-floor pricing',
          comment,
        )
      },

      issueOffer(id) {
        const opp = store.opportunities.find((o) => o.id === id)
        const p = currentProposal(opp)
        const option = selectedOption(opp)
        const margin = p?.margin ?? option?.margin
        if (belowFloor(margin, opp.marginFloor) && p?.directorApproval?.status !== 'approved') {
          return { ok: false, error: 'This offer is below the margin floor and needs Director approval first.' }
        }
        patchOpp(
          id,
          (o) => {
            const cur = currentProposal(o)
            return {
              ...o,
              proposals: o.proposals.map((x) =>
                x.id === cur.id ? { ...x, status: 'issued', issuedAt: nowIso() } : x,
              ),
            }
          },
          'Issued offer',
          'Final offer sent to customer',
        )
        return { ok: true }
      },

      recordAcceptance(id, signedDocName) {
        const opp = store.opportunities.find((o) => o.id === id)
        const option = selectedOption(opp)
        const amount = Math.round((option?.priceEx || 0) * 0.2 * 100) / 100
        patchOpp(
          id,
          (o) => {
            const p = currentProposal(o)
            const already = (o.billingRequests || []).some((b) => b.milestone === 'deposit')
            return {
              ...o,
              acceptedValue: option?.priceEx || o.acceptedValue,
              proposals: o.proposals.map((x) =>
                x.id === p.id
                  ? { ...x, status: 'accepted', acceptedAt: nowIso(), signedDocName }
                  : x,
              ),
              approvals: o.approvals?.length ? o.approvals : defaultApprovals(),
              billingRequests: already
                ? o.billingRequests
                : [
                    ...(o.billingRequests || []),
                    {
                      id: uid('bill'),
                      milestone: 'deposit',
                      percent: 20,
                      amountEx: amount,
                      gst: gstOn(amount),
                      status: 'pending',
                      invoiceNumber: '',
                      paymentStatus: 'unpaid',
                      createdAt: nowIso(),
                      event: 'Customer acceptance',
                    },
                  ],
              documents: signedDocName
                ? [
                    {
                      id: uid('doc'),
                      type: 'acceptance',
                      name: signedDocName,
                      version: 1,
                      uploadedAt: nowIso(),
                      uploaderId: user.id,
                      size: 'uploaded',
                      mirrorStatus: 'pending',
                    },
                    ...(o.documents || []),
                  ]
                : o.documents,
            }
          },
          'Recorded acceptance',
          '20% milestone billing request created',
        )
        notify(
          store.users.filter((u) => u.roles.includes('ACC') && u.unitIds.includes(unit.id)).map((u) => u.id),
          'Deposit billing request',
          `${opp.number} has been accepted. A 20% billing request is ready.`,
          id,
        )
      },

      raiseVariation(id, reason) {
        patchOpp(
          id,
          (o) => ({
            ...o,
            variationPending: true,
            variations: [
              {
                id: uid('var'),
                reason,
                status: 're-estimate',
                createdAt: nowIso(),
                createdBy: user.id,
              },
              ...(o.variations || []),
            ],
          }),
          'Raised variation',
          reason,
        )
        const opp = store.opportunities.find((o) => o.id === id)
        notify(opp?.owners.estimatorId, 'Variation needs re-estimate', `${opp?.number}: ${reason}`, id)
      },

      updateApproval(id, approvalId, fields) {
        patchOpp(
          id,
          (o) => ({
            ...o,
            approvals: o.approvals.map((a) => (a.id === approvalId ? { ...a, ...fields } : a)),
          }),
          'Updated approval',
          fields.status ? `${fields.status}` : 'Details saved',
        )
      },

      addPurchaseOrder(id, po) {
        patchOpp(
          id,
          (o) => ({
            ...o,
            purchaseOrders: [
              ...(o.purchaseOrders || []),
              {
                id: uid('po'),
                status: 'sent',
                confirmedAt: null,
                deliveredAt: null,
                deliveryEvidence: '',
                confirmingUserId: '',
                ...po,
              },
            ],
          }),
          'Raised purchase order',
          po.ref,
        )
      },

      updatePurchaseOrder(id, poId, fields) {
        const opp = store.opportunities.find((o) => o.id === id)
        const confirmingDelivery = fields.deliveredAt && !(opp.purchaseOrders || []).find((p) => p.id === poId)?.deliveredAt
        patchOpp(
          id,
          (o) => {
            const purchaseOrders = o.purchaseOrders.map((p) =>
              p.id === poId
                ? {
                    ...p,
                    ...fields,
                    confirmingUserId: fields.deliveredAt ? user.id : p.confirmingUserId,
                  }
                : p,
            )
            const already = (o.billingRequests || []).some((b) => b.milestone === 'delivery')
            const fullDelivery = confirmingDelivery && fields.partial !== true
            let billingRequests = o.billingRequests || []
            if (fullDelivery && !already) {
              const amount = Math.round((o.acceptedValue || 0) * 0.4 * 100) / 100
              billingRequests = [
                ...billingRequests,
                {
                  id: uid('bill'),
                  milestone: 'delivery',
                  percent: 40,
                  amountEx: amount,
                  gst: gstOn(amount),
                  status: 'pending',
                  invoiceNumber: '',
                  paymentStatus: 'unpaid',
                  createdAt: nowIso(),
                  event: 'Physical delivery to site',
                },
              ]
            }
            return { ...o, purchaseOrders, billingRequests }
          },
          confirmingDelivery ? 'Confirmed material delivery' : 'Updated purchase order',
          fields.ref || '',
        )
      },

      updateSiteWorks(id, fields) {
        patchOpp(id, (o) => ({ ...o, siteWorks: { ...o.siteWorks, ...fields } }), 'Updated site works', '')
      },

      signSubstage(id, key, payload) {
        const isCommissioning = key === '7e'
        patchOpp(
          id,
          (o) => {
            const nextSubs = (o.siteWorks.substages || defaultSubstages()).map((s) =>
              s.key === key
                ? {
                    ...s,
                    status: payload.failed ? 'failed' : 'signed_off',
                    defects: payload.defects || '',
                    photos: payload.photos || s.photos,
                    checklist: (s.checklist || []).map((c) => ({ ...c, done: true })),
                    signedOffAt: payload.failed ? null : nowIso(),
                    signedOffBy: payload.failed ? null : user.id,
                  }
                : s,
            )
            let billingRequests = o.billingRequests || []
            const already = billingRequests.some((b) => b.milestone === 'final')
            if (isCommissioning && !payload.failed && !already) {
              const amount = Math.round((o.acceptedValue || 0) * 0.4 * 100) / 100
              billingRequests = [
                ...billingRequests,
                {
                  id: uid('bill'),
                  milestone: 'final',
                  percent: 40,
                  amountEx: amount,
                  gst: gstOn(amount),
                  status: 'pending',
                  invoiceNumber: '',
                  paymentStatus: 'unpaid',
                  createdAt: nowIso(),
                  event: 'Commissioning sign-off',
                },
              ]
            }
            const documents = !payload.failed && isCommissioning
              ? [
                  {
                    id: uid('doc'),
                    type: 'certificate',
                    name: `Commissioning-${o.number}.pdf`,
                    version: 1,
                    uploadedAt: nowIso(),
                    uploaderId: user.id,
                    size: 'generated',
                    mirrorStatus: 'pending',
                  },
                  ...(o.documents || []),
                ]
              : o.documents
            return {
              ...o,
              siteWorks: { ...o.siteWorks, substages: nextSubs },
              billingRequests,
              documents,
            }
          },
          isCommissioning ? 'Commissioning recorded' : 'Site sub-stage updated',
          key,
        )
      },

      updateBilling(id, billId, fields) {
        patchOpp(
          id,
          (o) => ({
            ...o,
            billingRequests: o.billingRequests.map((b) => (b.id === billId ? { ...b, ...fields } : b)),
          }),
          'Updated billing request',
          fields.invoiceNumber || fields.status || '',
        )
      },

      updateRebate(id, rebateId, fields) {
        patchOpp(
          id,
          (o) => ({
            ...o,
            rebates: o.rebates.map((r) => (r.id === rebateId ? { ...r, ...fields } : r)),
          }),
          'Updated rebate',
          fields.status || '',
        )
      },

      addRebate(id, rebate) {
        patchOpp(id, (o) => ({ ...o, rebates: [...(o.rebates || []), { id: uid('rb'), ...rebate }] }), 'Added rebate', rebate.type)
      },

      closeOpportunity(id, closure) {
        const opp = store.opportunities.find((o) => o.id === id)
        const commission = commissionFor(opp, unit.commissionTiers)
        patchOpp(
          id,
          (o) => ({
            ...o,
            stage: 9,
            lifecycle: 'ClosedDelivered',
            closure: { ...closure, checklistComplete: true, closedAt: nowIso() },
            commission,
          }),
          'Closed opportunity',
          'Moved to after-sales register',
        )
      },

      setLifecycle(id, lifecycle, reason) {
        patchOpp(id, { lifecycle, notes: reason }, `Set lifecycle to ${lifecycle}`, reason)
      },

      advanceStage(id) {
        const opp = store.opportunities.find((o) => o.id === id)
        const gate = gateStatus(opp)
        if (!gate.canAdvance) return { ok: false, missing: gate.missing }
        patchOpp(
          id,
          (o) => {
            const nextStage = Math.min(9, o.stage + 1)
            return {
              ...o,
              stage: nextStage,
              slaStartedAt: nowIso(),
              slaDueAt: addDays(nowIso(), unit.slaDays[nextStage] || 7),
              variationPending: nextStage >= 5 ? o.variationPending : o.variationPending,
            }
          },
          'Advanced stage',
          `Moved to stage ${opp.stage + 1}`,
        )
        return { ok: true }
      },

      saveUser(nextUser) {
        setStore((prev) => {
          const exists = prev.users.some((u) => u.id === nextUser.id)
          return {
            ...prev,
            users: exists
              ? prev.users.map((u) => (u.id === nextUser.id ? { ...u, ...nextUser } : u))
              : [...prev.users, { ...nextUser, id: nextUser.id || uid('u'), password: nextUser.password || 'Prestige1' }],
          }
        })
      },

      saveReferrer(next) {
        setStore((prev) => {
          const exists = prev.referrers.some((r) => r.id === next.id)
          return {
            ...prev,
            referrers: exists
              ? prev.referrers.map((r) => (r.id === next.id ? { ...r, ...next } : r))
              : [...prev.referrers, { ...next, id: next.id || uid('ref'), status: 'active' }],
          }
        })
      },

      saveUnit(next) {
        setStore((prev) => ({
          ...prev,
          units: prev.units.map((u) => (u.id === next.id ? { ...u, ...next } : u)),
        }))
      },
    }
  }, [store, user, unit])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
