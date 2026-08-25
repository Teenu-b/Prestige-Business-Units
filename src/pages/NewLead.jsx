import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BackLink, PageHeader } from '../components/ui'
import LeadForm, { emptyLeadForm, estimatorChoices, payloadFromLeadForm, validateLeadForm } from '../components/LeadForm'

export default function NewLead() {
  const { createLead, users, referrers, unit, user, campaigns } = useApp()
  const navigate = useNavigate()
  const estimators = estimatorChoices(users, unit.id)
  const sales = users.filter((u) => (u.roles.includes('BDM') || u.roles.includes('DBD')) && u.unitIds.includes(unit.id))
  const [form, setForm] = useState(() => {
    const base = emptyLeadForm(user)
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
    if (!form.estimatorId && defaultEstimatorId) setForm((f) => ({ ...f, estimatorId: defaultEstimatorId }))
  }, [defaultEstimatorId, form.estimatorId])

  const submit = (e) => {
    e.preventDefault()
    const nextErrors = validateLeadForm(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    const opp = createLead(payloadFromLeadForm(form))
    navigate(`/opportunities/${opp.id}`)
  }

  const errorList = Object.values(errors)

  return (
    <>
      <BackLink />
      <PageHeader
        title="New lead"
        lede="Qualify the lead. A complete Qualified record moves to inspection, then estimation."
      />

      <form onSubmit={submit} className="card card-pad" noValidate>
        <LeadForm
          form={form}
          set={set}
          errors={errors}
          estimators={estimators}
          sales={sales}
          referrers={referrers}
          campaigns={campaigns || []}
          user={user}
        />
        {errorList.length ? (
          <div className="alert danger">
            Fix {errorList.length} {errorList.length === 1 ? 'field' : 'fields'} before saving.
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {[...new Set(errorList)].map((msg) => <li key={msg}>{msg}</li>)}
            </ul>
          </div>
        ) : null}
        <button className="btn btn-primary" type="submit">Save lead</button>
      </form>
    </>
  )
}
