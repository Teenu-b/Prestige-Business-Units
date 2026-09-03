import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Home,
  Megaphone,
  Menu,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { initials } from '../lib/format'
import { hasRole, navFor } from '../lib/permissions'
import { ROLES } from '../data/constants'
import ErrorBoundary from './ErrorBoundary'
import { ToastHost } from './ui'
import CommandPalette from './CommandPalette'

const NAV_ICONS = {
  '/': Home,
  '/leads': ClipboardCheck,
  '/pipeline': Briefcase,
  '/marketing': Megaphone,
  '/approvals': FileText,
  '/procurement': ShoppingCart,
  '/quotes': Receipt,
  '/costs': CircleDollarSign,
  '/billing': CircleDollarSign,
  '/referrers': Users,
  '/admin': Settings,
}

export default function Layout() {
  const { user, unit, units, switchUnit, logout, notifications } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const unread = (notifications || []).filter((n) => !n.read).length
  const items = useMemo(() => navFor(user), [user])
  const roleLabel = user.roles.map((r) => ROLES[r]?.name).filter(Boolean).join(' · ')

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">
              Prestige
              {unit?.code ? <span className="brand-tag">{unit.code}</span> : null}
            </div>
            <div className="brand-sub">Lead to service</div>
          </div>
        </div>
        <button type="button" className="sidebar-search" onClick={() => setPaletteOpen(true)}>
          <Search size={15} />
          <span>Search…</span>
          <kbd>⌘K</kbd>
        </button>
        <nav className="nav" onClick={() => setOpen(false)}>
          {items.map((item) => {
            const Icon = NAV_ICONS[item.to] || Home
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                <Icon size={17} />
                {item.label}
              </NavLink>
            )
          })}
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
                <span className="avatar">{initials(user.name)}</span>
                <span>
                  {user.name}
                  <small>{roleLabel}</small>
                </span>
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
            <div key={location.pathname} className="route-fade">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </div>
      <ToastHost />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
