import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'

export default function Notifications() {
  const { notifications, markRead, markAllRead } = useApp()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Inbox"
        lede="Assignments, approvals, stage changes and overdue items for you in this unit."
        actions={notifications.some((n) => !n.read) ? <button className="btn btn-ghost" onClick={markAllRead}>Mark all read</button> : null}
      />
      <div className="card card-pad">
        {notifications.length === 0 ? <p className="lede">No notices.</p> : notifications.map((n) => (
          <button
            key={n.id}
            className="list-item"
            style={{ width: '100%', background: n.read ? 'none' : 'var(--gold-soft)', border: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '12px 10px' }}
            onClick={() => {
              markRead(n.id)
              if (n.opportunityId) navigate(`/opportunities/${n.opportunityId}`)
            }}
          >
            <div>
              <div className="row-title">{n.title}</div>
              <div className="row-meta">{n.body}</div>
            </div>
            <div className="row-meta">{formatDate(n.at, true)}</div>
          </button>
        ))}
      </div>
    </>
  )
}
