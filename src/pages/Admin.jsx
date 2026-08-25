import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, Field, Modal, PageHeader } from '../components/ui'
import { ROLES } from '../data/constants'
import { canAdmin, hasRole } from '../lib/permissions'

function emptyDraft(unitId) {
  return {
    name: '',
    email: '',
    title: '',
    password: '',
    roles: ['BDM'],
    unitIds: [unitId],
  }
}

function fromUser(person) {
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    title: person.title || '',
    password: '',
    roles: [...(person.roles || [])],
    unitIds: [...(person.unitIds || [])],
    referrerId: person.referrerId || null,
  }
}

export default function Admin() {
  const { users, units, unit, saveUser, deleteUser, saveUnit, resetDemo, user } = useApp()
  const [tab, setTab] = useState('users')
  const admin = canAdmin(user)
  const [draft, setDraft] = useState(() => emptyDraft(unit.id))
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [error, setError] = useState('')

  const listed = users.filter((u) => u.unitIds.includes(unit.id) || u.roles.includes('ADM') || u.roles.includes('DIR'))
  const editing = Boolean(draft.id)

  const openAdd = () => {
    setError('')
    setDraft(emptyDraft(unit.id))
    setFormOpen(true)
  }

  const openEdit = (person) => {
    setError('')
    setDraft(fromUser(person))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setError('')
    setDraft(emptyDraft(unit.id))
  }

  const toggleRole = (code) => {
    setDraft((prev) => {
      const on = prev.roles.includes(code)
      const roles = on ? prev.roles.filter((r) => r !== code) : [...prev.roles, code]
      return { ...prev, roles: roles.length ? roles : prev.roles }
    })
  }

  const toggleUnit = (id) => {
    setDraft((prev) => {
      const on = prev.unitIds.includes(id)
      const unitIds = on ? prev.unitIds.filter((x) => x !== id) : [...prev.unitIds, id]
      return { ...prev, unitIds: unitIds.length ? unitIds : prev.unitIds }
    })
  }

  const submitUser = () => {
    const name = draft.name.trim()
    const email = draft.email.trim()
    if (!name || !email) {
      setError('Name and email are required.')
      return
    }
    const taken = users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== draft.id)
    if (taken) {
      setError('That email is already in use.')
      return
    }
    if (!draft.roles.length) {
      setError('Choose at least one role.')
      return
    }
    saveUser({
      ...draft,
      name,
      email,
      title: draft.title.trim(),
      password: draft.password.trim(),
    })
    closeForm()
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    if (pendingDelete.id === user.id) return
    const lastAdmin = pendingDelete.roles.includes('ADM') && users.filter((u) => u.roles.includes('ADM')).length === 1
    if (lastAdmin) return
    deleteUser(pendingDelete.id)
    setPendingDelete(null)
  }

  if (!admin && !hasRole(user, 'DIR')) {
    return (
      <div className="card card-pad">
        <h2>Restricted</h2>
        <p className="lede">User and system configuration is available to administrators. Directors have read access.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Administration"
        lede="Users, roles, and the parameters this business unit runs on — margin floor, SLA days, billing split and commission tiers."
        actions={admin && tab === 'users' ? <button className="btn btn-primary" onClick={openAdd}>Add user</button> : null}
      />
      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>Unit settings</button>
      </div>

      {tab === 'users' ? (
        <div className="card card-pad">
          {listed.map((person) => {
            const isSelf = person.id === user.id
            const lastAdmin = person.roles.includes('ADM') && users.filter((u) => u.roles.includes('ADM')).length === 1
            return (
              <div className="list-item" key={person.id}>
                <div>
                  <div className="row-title">{person.name}{isSelf ? ' · you' : ''}</div>
                  <div className="row-meta">{person.email} · {person.title || 'No title'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {person.roles.map((r) => <Badge key={r} tone="neutral">{ROLES[r]?.name || r}</Badge>)}
                  {admin ? (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(person)}>Edit</button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={isSelf || lastAdmin}
                        title={isSelf ? 'You cannot delete your own account' : lastAdmin ? 'Keep at least one administrator' : 'Delete user'}
                        onClick={() => setPendingDelete(person)}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card card-pad">
          <div className="form-grid">
            <Field label="Margin floor (%)">
              <input type="number" defaultValue={unit.marginFloor} disabled={!admin} onBlur={(e) => admin && saveUnit({ ...unit, marginFloor: Number(e.target.value) })} />
            </Field>
            <Field label="Timezone"><input defaultValue={unit.timezone} disabled /></Field>
            <Field label="Deposit %"><input type="number" defaultValue={unit.billing[0].percent} disabled={!admin} onBlur={(e) => admin && saveUnit({ ...unit, billing: unit.billing.map((b, i) => i === 0 ? { ...b, percent: Number(e.target.value) } : b) })} /></Field>
            <Field label="Delivery %"><input type="number" defaultValue={unit.billing[1].percent} disabled={!admin} /></Field>
            <Field label="Final %"><input type="number" defaultValue={unit.billing[2].percent} disabled={!admin} /></Field>
            <Field label="Lead SLA (days)"><input type="number" defaultValue={unit.slaDays[2]} disabled={!admin} onBlur={(e) => admin && saveUnit({ ...unit, slaDays: { ...unit.slaDays, 2: Number(e.target.value) } })} /></Field>
          </div>
          <p className="lede" style={{ marginTop: 16 }}>Commission tiers and remaining SLA values can be extended here without a code change in a later build. Billing percentages must total 100%.</p>
          {admin ? <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={resetDemo}>Reset demo data</button> : null}
        </div>
      )}

      {formOpen ? (
        <Modal
          className="wide"
          title={editing ? 'Edit user' : 'Add user'}
          body={editing ? 'Changes apply in this browser only.' : 'New users sign in with the password you set, or Prestige1 if you leave it blank.'}
          onClose={closeForm}
          actions={
            <>
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={submitUser}>{editing ? 'Save changes' : 'Add user'}</button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Email"><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} autoComplete="off" /></Field>
            <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="Password" hint={editing ? 'Leave blank to keep current' : 'Optional'}>
              <input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />
            </Field>
            <Field label="Roles" className="span-2">
              <div className="choice-grid">
                {Object.values(ROLES).map((role) => (
                  <label key={role.code} className="choice">
                    <input type="checkbox" checked={draft.roles.includes(role.code)} onChange={() => toggleRole(role.code)} />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Business units" className="span-2">
              <div className="choice-grid">
                {units.map((u) => (
                  <label key={u.id} className="choice">
                    <input type="checkbox" checked={draft.unitIds.includes(u.id)} onChange={() => toggleUnit(u.id)} />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
          {error ? <div className="alert danger" style={{ marginTop: 12 }}>{error}</div> : null}
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal
          title="Delete user"
          body={`Remove ${pendingDelete.name} (${pendingDelete.email})? They will no longer be able to sign in on this device.`}
          onClose={() => setPendingDelete(null)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </>
          }
        />
      ) : null}
    </>
  )
}
