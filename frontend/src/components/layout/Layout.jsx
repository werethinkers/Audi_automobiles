import { useEffect } from 'react'
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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
 
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
  { path: '/rm-master', label: 'Raw Materials', icon: CubeIcon },
  { path: '/vendors', label: 'Vendors', icon: UserGroupIcon },
  { path: '/stores', label: 'Stores', icon: HomeModernIcon },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: DocumentTextIcon },
  { path: '/grn', label: 'GRN Log', icon: ClipboardDocumentCheckIcon },
  { path: '/stock-balance', label: 'Stock Balance', icon: CircleStackIcon },
  { path: '/ledger', label: 'Stock Ledger', icon: ArrowPathIcon },
  { path: '/consumption', label: 'Issue Material', icon: InboxArrowDownIcon },
  { path: '/custom-fields', label: 'Custom Fields', icon: WrenchScrewdriverIcon },
]
 
export default function Layout() {
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
 
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])
 
  if (!isAuthenticated) return null
 
  // Get active menu label
  const activeItem = menuItems.find(item => location.pathname.startsWith(item.path))
  const pageTitle = activeItem ? activeItem.label : 'ERP Platform'
 
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
            <Link to="/dashboard" className="flex flex-col">
              <span className="text-lg font-bold font-display text-white tracking-wider">ERP SYSTEM</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">RM & Inventory</span>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="mt-6 px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
 
        {/* Logout Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>
 
      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-bold font-display text-slate-800">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrator</span>
          </div>
        </header>
        
        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
