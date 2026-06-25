import { useNavigate } from 'react-router-dom'
import { useRmList } from '../../api/rm'
import { usePoList } from '../../api/procurement'
import { useInventoryBalances } from '../../api/inventory'
import {
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
  InboxArrowDownIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

// ─── Gradient KPI Card ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, gradient, iconBg, textColor, borderColor }) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border ${borderColor}`}
      style={{ background: gradient }}>
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -right-2 w-16 h-16 rounded-full opacity-10 bg-white" />

      <div className="relative flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-4xl font-black leading-none ${textColor}`}>{value ?? '—'}</span>
      </div>
      <div className="relative mt-4">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${textColor} opacity-70`}>{label}</p>
        {sub && <p className={`text-xs mt-0.5 ${textColor} opacity-60`}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ label, icon: Icon, path, gradient, iconBg, navigate }) {
  return (
    <button
      onClick={() => navigate(path)}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left
        bg-white border border-slate-200/80 hover:shadow-md hover:border-slate-300 
        hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
    >
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-white" />
      </div>
      <span className="text-slate-700 text-sm font-semibold flex-1">{label}</span>
      <ArrowRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  )
}

// ─── Alert Table Card ──────────────────────────────────────────────────────────
function AlertCard({ title, count, accentCls, children }) {
  const isEmpty = count === 0
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <ShieldExclamationIcon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${accentCls}`} />
          <span className="text-sm font-bold text-slate-700">{title}</span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full
          ${isEmpty ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { data: rms,      isLoading: rmLoading  } = useRmList({ is_active: true })
  const { data: pos,      isLoading: poLoading  } = usePoList()
  const { data: balances, isLoading: balLoading } = useInventoryBalances()

  const isLoading = rmLoading || poLoading || balLoading

  const totalRms   = rms?.length || 0
  const pendingPos = pos?.filter(p => p.line_status !== 'COMPLETED' && p.line_status !== 'CANCELLED')?.length || 0

  const lowStockItems = []
  if (rms && balances) {
    rms.forEach(rm => {
      const totalQty = balances
        .filter(b => b.rm_id === rm.rm_id)
        .reduce((s, b) => s + (parseFloat(b.current_qty) || 0), 0)
      const min = rm.minimum_stock || 0
      if (min > 0 && totalQty < min) {
        lowStockItems.push({ ...rm, currentStock: totalQty })
      }
    })
  }

  const outOfStockItems = balances?.filter(b => (parseFloat(b.current_qty) || 0) === 0) || []
  const healthyCount    = (balances?.length || 0) - lowStockItems.length - outOfStockItems.length

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1a4d7c 50%, #0f5fa3 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-blue-400/10" />
        <div className="relative px-8 py-7 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-xs font-semibold tracking-wide uppercase">All Systems Operational</span>
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">Good day, Admin 👋</h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">{today}</p>
          </div>
          <div className="hidden sm:flex gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 text-center">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Total Materials</p>
              <p className="text-white text-3xl font-black mt-0.5">{isLoading ? '—' : totalRms}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 text-center">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Open POs</p>
              <p className="text-white text-3xl font-black mt-0.5">{isLoading ? '—' : pendingPos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 h-32 animate-pulse bg-slate-200/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Materials"
            value={totalRms}
            sub="Active in catalog"
            icon={CubeIcon}
            gradient="linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
            iconBg="bg-green-700"
            textColor="text-white"
            borderColor="border-green-600/20"
          />
          <KpiCard
            label="Open Purchase Orders"
            value={pendingPos}
            sub="Awaiting fulfilment"
            icon={DocumentTextIcon}
            gradient="linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
            iconBg="bg-blue-700"
            textColor="text-white"
            borderColor="border-blue-600/20"
          />
          <KpiCard
            label="Low Stock Alerts"
            value={lowStockItems.length}
            sub="Below safety stock"
            icon={ExclamationTriangleIcon}
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            iconBg="bg-amber-700"
            textColor="text-white"
            borderColor="border-amber-500/20"
          />
          <KpiCard
            label="Healthy Stock"
            value={healthyCount}
            sub="At or above minimum"
            icon={CheckCircleIcon}
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
            iconBg="bg-emerald-800"
            textColor="text-white"
            borderColor="border-emerald-600/20"
          />
        </div>
      )}

      {/* ── Main Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Alert Tables (2/3 width) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">⚠ Stock Alerts</h3>
            <button onClick={() => navigate('/stock-balance')}
              className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 cursor-pointer hover:underline transition-colors">
              View Inventory <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center shadow-sm animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-40 mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Low Stock */}
              <AlertCard title="Low Stock Alerts" count={lowStockItems.length} accentCls="text-amber-500">
                {lowStockItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-sm text-slate-600 font-semibold">All materials above safety stock</p>
                    <p className="text-xs text-slate-400 mt-1">Your inventory is healthy ✓</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-amber-50/60">
                          <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Material</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Part No.</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Min</th>
                          <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lowStockItems.slice(0, 6).map((item, i) => (
                          <tr key={i} onClick={() => navigate(`/rm-master/${item.rm_id}`)}
                            className="hover:bg-amber-50/40 cursor-pointer transition-colors">
                            <td className="px-5 py-3 text-sm font-semibold text-slate-700 max-w-[180px] truncate">{item.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.part_no || '—'}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">
                              {item.currentStock} <span className="text-xs text-slate-400 font-normal">{item.unit_of_measurement}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 text-right">{item.minimum_stock}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">Low</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lowStockItems.length > 6 && (
                      <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                        <button onClick={() => navigate('/stock-balance')}
                          className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer">
                          +{lowStockItems.length - 6} more <ArrowRightIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </AlertCard>

              {/* Out of Stock */}
              <AlertCard title="Out of Stock" count={outOfStockItems.length} accentCls="text-red-500">
                {outOfStockItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-sm text-slate-600 font-semibold">No items out of stock</p>
                    <p className="text-xs text-slate-400 mt-1">All tracked items have stock ✓</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-red-50/50">
                          <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Material</th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Store</th>
                          <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {outOfStockItems.slice(0, 6).map((b, i) => (
                          <tr key={i} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-5 py-3 text-sm font-semibold text-slate-700 truncate max-w-[220px]">
                              {rms?.find(r => r.rm_id === b.rm_id)?.name || b.rm_id}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[140px]">{b.store_id}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">Out</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AlertCard>
            </div>
          )}
        </div>

        {/* Right: Quick Actions + Summary (1/3 width) */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">⚡ Quick Actions</h3>
            <div className="space-y-2.5">
              <QuickAction label="Add Raw Material"    icon={CubeIcon}                   path="/rm-master/new"       iconBg="bg-gradient-to-br from-green-500 to-green-700"  navigate={navigate} />
              <QuickAction label="New Purchase Order"  icon={DocumentTextIcon}           path="/purchase-orders/new" iconBg="bg-gradient-to-br from-blue-500 to-blue-700"    navigate={navigate} />
              <QuickAction label="Record GRN"          icon={ClipboardDocumentCheckIcon} path="/grn/new"             iconBg="bg-gradient-to-br from-blue-400 to-blue-600"    navigate={navigate} />
              <QuickAction label="Confirm Consumption" icon={InboxArrowDownIcon}         path="/consumption"         iconBg="bg-gradient-to-br from-green-400 to-green-600"  navigate={navigate} />
            </div>
          </div>

          {/* Inventory Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">📊 Inventory Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Materials', val: totalRms,           icon: CubeIcon,        iconBg: 'bg-green-100',  iconColor: 'text-green-600', barColor: 'bg-green-500' },
                { label: 'Open POs',        val: pendingPos,         icon: TruckIcon,       iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',  barColor: 'bg-blue-500' },
                { label: 'Tracked Items',   val: balances?.length||0,icon: CircleStackIcon, iconBg: 'bg-slate-100',  iconColor: 'text-slate-600', barColor: 'bg-slate-400' },
                { label: 'Low Stock',       val: lowStockItems.length,icon: ExclamationTriangleIcon, iconBg: 'bg-red-50', iconColor: 'text-red-500', barColor: 'bg-red-400' },
              ].map(({ label, val, icon: Icon, iconBg, iconColor, barColor }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 font-semibold truncate">{label}</span>
                      <span className="text-xs font-black text-slate-800 ml-2">{isLoading ? '—' : val}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
