import { useEffect, useState, useRef } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Squares2X2Icon,
  CubeIcon,
  UserGroupIcon,
  HomeModernIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CircleStackIcon,
  ArrowPathIcon,
  InboxArrowDownIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronDownIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

// ── Nav configuration ──────────────────────────────────────────────────────────
const NAV = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: Squares2X2Icon,
  },
  {
    label: 'Masters',
    icon: CubeIcon,
    children: [
      { label: 'Raw Materials',   path: '/rm-master',  icon: CubeIcon },
      { label: 'Vendors',         path: '/vendors',    icon: TruckIcon },
      { label: 'Stores',          path: '/stores',     icon: HomeModernIcon },
    ],
  },
  {
    label: 'Procurement',
    icon: DocumentTextIcon,
    children: [
      { label: 'Purchase Orders', path: '/purchase-orders', icon: DocumentTextIcon },
      { label: 'GRN Log',         path: '/grn',             icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    label: 'Inventory',
    icon: CircleStackIcon,
    children: [
      { label: 'Stock Balance',  path: '/stock-balance', icon: CircleStackIcon },
      { label: 'Stock Ledger',   path: '/ledger',        icon: ArrowPathIcon },
      { label: 'Issue Material', path: '/consumption',   icon: InboxArrowDownIcon },
    ],
  },
  {
    label: 'Config',
    icon: WrenchScrewdriverIcon,
    children: [
      { label: 'Custom Fields', path: '/custom-fields', icon: WrenchScrewdriverIcon },
    ],
  },
]

// ── Dropdown nav item ──────────────────────────────────────────────────────────
function NavDropdown({ item, location }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const Icon = item.icon

  const isChildActive = item.children?.some(c => location.pathname.startsWith(c.path))

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all cursor-pointer select-none h-full
          ${isChildActive
            ? 'bg-[#3498db] text-white border-b-2 border-[#5dade2]'
            : 'text-slate-300 hover:bg-[#34495e] hover:text-white'
          }
        `}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {item.label}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 min-w-[200px] bg-white border border-slate-200 shadow-xl rounded-b-lg overflow-hidden">
          {item.children.map(child => {
            const CIcon = child.icon
            const isActive = location.pathname.startsWith(child.path)
            return (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-[#3498db]/10 text-[#3498db] font-semibold border-l-2 border-[#3498db]'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#3498db]'
                  }
                `}
              >
                <CIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export default function Layout() {
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-[#eef2f7] font-sans flex flex-col">

      {/* ── 1. Thin Top Welcome Bar ──────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 py-1 px-6 flex items-center justify-end gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <BellIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>Welcome, <span className="font-bold text-slate-700">Admin Manager!</span></span>
        </div>
        <span className="text-slate-300">|</span>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-[#3498db] hover:text-[#2980b9] transition-colors cursor-pointer flex items-center gap-1"
        >
          <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {/* ── 2. Main Header ───────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2c3e50] to-[#3498db] flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xl leading-none">A</span>
            </div>
          </Link>

          {/* Center: Title */}
          <Link to="/dashboard" className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-2xl font-bold text-[#2c3e50] tracking-tight whitespace-nowrap font-display">
              Audi Automobiles
            </h1>
          </Link>

          {/* Right: Brand */}
          <div className="flex flex-col items-end">
            <div className="text-right">
              <span className="text-lg font-black text-[#2c3e50] tracking-tight">astute</span>
              <span className="text-lg font-black text-[#f39c12] tracking-tight"> BRIDGE</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">ERP Platform</div>
          </div>
        </div>
      </header>

      {/* ── 3. Navigation Bar ────────────────────────────────────── */}
      <nav className="bg-[#2c3e50] shadow-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto flex items-stretch">
          {NAV.map(item => {
            if (item.children) {
              return <NavDropdown key={item.label} item={item} location={location} />
            }
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer
                  ${isActive
                    ? 'bg-[#3498db] text-white border-b-2 border-[#5dade2]'
                    : 'text-slate-300 hover:bg-[#34495e] hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            )
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Admin badge */}
          <div className="flex items-center px-4">
            <span className="flex items-center gap-1.5 bg-[#f39c12] text-white text-xs font-bold px-3 py-1.5 rounded">
              <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
              Admin
            </span>
          </div>
        </div>
      </nav>

      {/* ── 4. Page Content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6">
        <Outlet />
      </main>

      {/* ── 5. Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center">
        <p className="text-xs text-slate-400">
          Version 1.0.0 &nbsp;·&nbsp; Copyright © 2025–2026{' '}
          <span className="text-[#3498db] font-semibold">Audi Automobiles</span>. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
