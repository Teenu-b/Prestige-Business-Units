import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Menu, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { initials } from '../lib/format'
import { hasRole, navFor } from '../lib/permissions'
import { ROLES } from '../data/constants'
import ErrorBoundary from './ErrorBoundary'

export default function Layout() {
  const { user, unit, units, switchUnit, logout, notifications } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const unread = (notifications || []).filter((n) => !n.read).length
  const items = useMemo(() => navFor(user), [user])
  const roleLabel = user.roles.map((r) => ROLES[r]?.name).filter(Boolean).join(' · ')

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">Prestige</div>
            <div className="brand-sub">Lead to service</div>
          </div>
        </div>
        <nav className="nav" onClick={() => setOpen(false)}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {unit?.name}
          <div>North Rocks, Sydney</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="icon-btn mobile-toggle" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="unit-switch">
              <span>Working in</span>
              <select value={unit?.id || ''} onChange={(e) => switchUnit(e.target.value)}>
                {units.map((u) => (
                  <option key={u.id} value={u.id} disabled={u.status !== 'active' && u.id !== 'prs'}>
                    {u.name}{u.status !== 'active' ? ' (later)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 ? <span className="dot" /> : null}
            </button>
            <div className="menu">
              <button className="who" onClick={() => setMenu((v) => !v)}>
                <span>
                  {user.name}
                  <small>{roleLabel}</small>
                </span>
                <span className="avatar">{initials(user.name)}</span>
              </button>
              {menu ? (
                <div className="menu-pop">
                  {hasRole(user, 'ADM', 'DIR') ? (
                    <button onClick={() => { setMenu(false); navigate('/admin') }}>Settings</button>
                  ) : null}
                  <button onClick={() => { setMenu(false); logout(); navigate('/login') }}>Sign out</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
