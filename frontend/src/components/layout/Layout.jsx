import { useEffect, useState, useRef } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Squares2X2Icon,
  CubeIcon,
  HomeModernIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CircleStackIcon,
  ArrowPathIcon,
  InboxArrowDownIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  TruckIcon,
  BuildingOffice2Icon,
  BellIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

// ─── Color map per section ─────────────────────────────────────────────────────
// Each group gets its own accent color for active state
const SECTION_COLORS = {
  null:        { active: 'bg-slate-100 text-slate-800',   indicator: 'bg-slate-700',  icon: 'text-slate-700',   hover: 'hover:bg-slate-50 hover:text-slate-800' },
  Procurement: { active: 'bg-blue-50 text-blue-700',      indicator: 'bg-blue-600',   icon: 'text-blue-600',    hover: 'hover:bg-blue-50/60 hover:text-blue-700' },
  Inventory:   { active: 'bg-green-50 text-green-700',    indicator: 'bg-green-600',  icon: 'text-green-600',   hover: 'hover:bg-green-50/60 hover:text-green-700' },
  Engineering: { active: 'bg-orange-50 text-orange-700',  indicator: 'bg-orange-500', icon: 'text-orange-500',  hover: 'hover:bg-orange-50/60 hover:text-orange-700' },
  Locations:   { active: 'bg-purple-50 text-purple-700',  indicator: 'bg-purple-600', icon: 'text-purple-600',  hover: 'hover:bg-purple-50/60 hover:text-purple-700' },
}

// ─── Nav Config ────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    group: null,
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: Squares2X2Icon },
    ],
  },
  {
    group: 'Procurement',
    items: [
      { label: 'Vendors',         path: '/vendors',         icon: TruckIcon },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: DocumentTextIcon },
      { label: 'GRN Log',         path: '/grn',             icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Raw Materials',       path: '/rm-master',     icon: CubeIcon },
      { label: 'Stores',              path: '/stores',        icon: HomeModernIcon },
      { label: 'Inventory Report',    path: '/stock-balance', icon: CircleStackIcon },
      { label: 'Consumption Report',  path: '/ledger',        icon: ArrowPathIcon },
      { label: 'Confirm Consumption', path: '/consumption',   icon: InboxArrowDownIcon },
    ],
  },
  {
    group: 'Engineering',
    items: [
      { label: 'Bill of Materials', path: '/bom', icon: DocumentTextIcon },
    ],
  },
  {
    group: 'Locations',
    items: [
      { label: 'Stations', path: '/stations', icon: BuildingOffice2Icon },
    ],
  },
]

// ─── Sidebar NavItem ───────────────────────────────────────────────────────────
function SideNavItem({ item, groupName, collapsed, onClick }) {
  const location = useLocation()
  const isActive = location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))
  const Icon = item.icon
  const colors = SECTION_COLORS[groupName] || SECTION_COLORS[null]

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
        transition-all duration-150 cursor-pointer group relative
        ${isActive ? colors.active : `text-slate-500 ${colors.hover}`}
      `}
    >
      {/* Active left indicator */}
      {isActive && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 ${colors.indicator} rounded-r-full`} />
      )}
      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors
        ${isActive ? colors.icon : 'text-slate-400 group-hover:text-current'}`}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout() {
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (!isAuthenticated) return null

  const handleLogout = () => { logout(); navigate('/login') }

  // Current page label
  const currentPage = NAV_GROUPS
    .flatMap(g => g.items)
    .find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))

  const sidebarWidth = collapsed ? 'w-[64px]' : 'w-[240px]'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#eef1f6' }}>

      {/* ══════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════ */}
      <aside
        className={`
          ${sidebarWidth} flex-shrink-0 flex flex-col
          border-r border-slate-200/80
          transition-all duration-300 ease-in-out
          fixed md:relative inset-y-0 left-0 z-40
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)' }}
      >
        {/* ── Brand / Logo ──────────────────────────────────── */}
        <div className={`h-16 flex items-center border-b border-slate-100 flex-shrink-0
          ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}
        >
          {/* Client logo — Audi Automobiles */}
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-black text-[13px] tracking-tighter" style={{ fontFamily: 'serif' }}>AA</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-slate-900 text-[13px] font-bold leading-tight truncate">Audi Automobiles</p>
              <p className="text-slate-400 text-[10px] font-medium tracking-[0.08em] uppercase truncate">Manufacturing ERP</p>
            </div>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {/* Group label */}
              {group.group && !collapsed && (
                <p className={`text-[10px] font-bold uppercase tracking-widest px-3 mb-1 mt-4
                  ${group.group === 'Procurement' ? 'text-blue-400' :
                    group.group === 'Inventory'   ? 'text-green-500' :
                    group.group === 'Engineering' ? 'text-orange-400' :
                    group.group === 'Locations'   ? 'text-purple-400' : 'text-slate-400'
                  }`}
                >
                  {group.group}
                </p>
              )}
              {group.group && collapsed && gi > 0 && (
                <div className="my-3 mx-3 border-t border-slate-100" />
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <SideNavItem key={item.path} item={item} groupName={group.group} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Vendor Branding ───────────────────────────────── */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Powered by</p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[13px] font-black text-slate-700 leading-none">astute</span>
              <span className="text-[13px] font-black leading-none" style={{ color: '#f59e0b' }}>BRIDGE</span>
            </div>
          </div>
        )}

        {/* ── User Footer ───────────────────────────────────── */}
        <div className={`border-t border-slate-100 flex-shrink-0
          ${collapsed ? 'p-2' : 'p-3'}`}
        >
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-full h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">AM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-700 truncate leading-none">Admin Manager</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
              >
                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top Header Bar ──────────────────────────────────── */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200/80 shadow-sm flex items-center gap-4 px-5">

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <Bars3Icon className="w-4 h-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            {mobileOpen ? <XMarkIcon className="w-4 h-4" /> : <Bars3Icon className="w-4 h-4" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <span className="text-slate-400 text-xs hidden sm:block">Audi Automobiles ERP</span>
            {currentPage && (
              <>
                <ChevronRightIcon className="w-3 h-3 text-slate-300 hidden sm:block flex-shrink-0" />
                <span className="text-slate-700 font-semibold text-sm truncate">{currentPage.label}</span>
              </>
            )}
          </div>

          {/* Right: Notifications + User */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer">
              <BellIcon className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">AM</span>
              </div>
              <span className="text-[12px] font-semibold text-slate-700 hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* ── Page Content ───────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="flex-shrink-0 bg-white border-t border-slate-100 px-6 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            © 2025–2026 <span className="font-semibold text-slate-500">Audi Automobiles</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Powered by <span className="font-bold text-slate-600">astute</span><span className="font-bold" style={{ color: '#f59e0b' }}>BRIDGE</span>
            <span className="text-slate-300 mx-1">·</span>v1.0.0
          </p>
        </footer>
      </div>
    </div>
  )
}
