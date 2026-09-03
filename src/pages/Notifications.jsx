import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, Empty, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'

export default function Notifications() {
  const { notifications, markRead, markAllRead } = useApp()
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <>
      <PageHeader
        title="Inbox"
        lede="Assignments, approvals, stage changes and overdue items for you in this unit."
        actions={unread ? (
          <button className="btn btn-ghost" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark all read
          </button>
        ) : null}
      />
      <Card pad={false}>
        {notifications.length === 0 ? (
          <div className="card-pad">
            <Empty icon={<BellOff size={28} strokeWidth={1.5} />} title="Nothing here" body="You're all caught up — new notices will land in this inbox." />
          </div>
        ) : (
          <div className="card-pad" style={{ paddingTop: 8 }}>
            {notifications.map((n) => (
              <button
                key={n.id}
                className="list-item"
                style={n.read ? undefined : { background: 'rgba(0, 0, 0, 0.04)' }}
                onClick={() => {
                  markRead(n.id)
                  if (n.opportunityId) navigate(`/opportunities/${n.opportunityId}`)
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className={`status-icon ${n.read ? 'pending' : 'current'}`}>
                    <Bell size={16} />
                  </span>
                  <div>
                    <div className="row-title">{n.title}</div>
                    <div className="row-meta">{n.body}</div>
                  </div>
                </div>
                <div className="row-meta">{formatDate(n.at, true)}</div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
