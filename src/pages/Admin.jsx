import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, Field, PageHeader } from '../components/ui'
import { ROLES } from '../data/constants'
import { canAdmin, hasRole } from '../lib/permissions'

export default function Admin() {
  const { users, unit, saveUser, saveUnit, resetDemo, user } = useApp()
  const [tab, setTab] = useState('users')
  const admin = canAdmin(user)
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    roles: ['LG'],
    unitIds: [unit.id],
    title: '',
  })

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
      <PageHeader title="Administration" lede="Users, roles, and the parameters this business unit runs on — margin floor, SLA days, billing split and commission tiers." />
      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>Unit settings</button>
      </div>

      {tab === 'users' ? (
        <div className="card card-pad">
          {users.filter((u) => u.unitIds.includes(unit.id) || u.roles.includes('ADM') || u.roles.includes('DIR')).map((u) => (
            <div className="list-item" key={u.id}>
              <div>
                <div className="row-title">{u.name}</div>
                <div className="row-meta">{u.email} · {u.title}</div>
              </div>
              <div>{u.roles.map((r) => <Badge key={r} tone="neutral">{ROLES[r]?.name || r}</Badge>)}</div>
            </div>
          ))}
          {admin ? (
            <div style={{ marginTop: 24 }}>
              <h2>Add user</h2>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field label="Email"><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
                <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
                <Field label="Roles">
                  <select value={draft.roles[0]} onChange={(e) => setDraft({ ...draft, roles: [e.target.value] })}>
                    {Object.values(ROLES).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </Field>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!draft.name} onClick={() => { saveUser(draft); setDraft({ name: '', email: '', roles: ['LG'], unitIds: [unit.id], title: '' }) }}>Save user</button>
            </div>
          ) : null}
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
            <Field label="Lead SLA (days)"><input type="number" defaultValue={unit.slaDays[1]} disabled={!admin} onBlur={(e) => admin && saveUnit({ ...unit, slaDays: { ...unit.slaDays, 1: Number(e.target.value) } })} /></Field>
          </div>
          <p className="lede" style={{ marginTop: 16 }}>Commission tiers and remaining SLA values can be extended here without a code change in a later build. Billing percentages must total 100%.</p>
          {admin ? <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={resetDemo}>Reset demo data</button> : null}
        </div>
      )}
    </>
  )
}
