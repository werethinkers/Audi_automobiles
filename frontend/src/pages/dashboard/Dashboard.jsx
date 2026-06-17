import { useNavigate } from 'react-router-dom'
import { useRmList } from '../../api/rm'
import { usePoList } from '../../api/procurement'
import { useInventoryBalances } from '../../api/inventory'
import Badge from '../../components/ui/Badge'
import {
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'

// ── Stat card matching reference site style ────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }) {
  const borderMap = {
    blue:   'border-l-[#3498db]',
    amber:  'border-l-amber-500',
    green:  'border-l-green-500',
    red:    'border-l-red-500',
    purple: 'border-l-purple-500',
  }
  const bgMap = {
    blue:   'bg-[#3498db]/10 text-[#3498db]',
    amber:  'bg-amber-100 text-amber-600',
    green:  'bg-green-100 text-green-600',
    red:    'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div className={`bg-white rounded border border-slate-200 border-l-4 ${borderMap[color]} shadow-sm p-5 flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-lg ${bgMap[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-[#2c3e50] mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Section header exactly like reference site ─────────────────────────────────
function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 text-[#2c3e50] mb-4">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</span>
    </div>
  )
}

// ── Panel card with dark header (like MAIN STORE / FLOOR INVENTORY) ────────────
function PanelCard({ title, badge, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
      <div className="bg-[#2c3e50] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldExclamationIcon className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
        </div>
        {badge && (
          <span className="bg-[#3498db] text-white text-xs font-bold px-2.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

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

  const outOfStock   = balances?.filter(b => (parseFloat(b.current_qty) || 0) === 0).length || 0
  const healthyCount = (balances?.length || 0) - lowStockItems.length - outOfStock

  return (
    <div className="space-y-6">

      {/* Page title — like "EXECUTIVE OVERVIEW" */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black uppercase text-[#2c3e50] tracking-wide">Executive Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">Raw Material & Inventory Performance Metrics</p>
        </div>
      </div>

      {/* ── KPI Funnel Row ───────────────────────────────────── */}
      <SectionTitle icon={CircleStackIcon} title="Inventory Summary" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Materials"    value={isLoading ? '—' : totalRms}             sub="Active registered items"    icon={CubeIcon}                color="blue"   />
        <KpiCard label="Pending Orders"     value={isLoading ? '—' : pendingPos}            sub="Open purchase orders"       icon={DocumentTextIcon}        color="purple" />
        <KpiCard label="Low Stock Alerts"   value={isLoading ? '—' : lowStockItems.length}  sub="Below safety stock level"   icon={ExclamationTriangleIcon} color="amber"  />
        <KpiCard label="Healthy Stock"      value={isLoading ? '—' : healthyCount}          sub="At or above minimum"        icon={CheckCircleIcon}         color="green"  />
      </div>

      {/* ── Low Stock Panel + Out-of-Stock Panel ──────────── */}
      <SectionTitle icon={ExclamationTriangleIcon} title="Stock Alerts" />

      {isLoading ? (
        <div className="bg-white rounded border border-slate-200 p-8 text-center text-slate-400 text-sm animate-pulse">
          Loading dashboard data...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Low stock table */}
          <PanelCard
            title="Low Stock Alerts"
            badge={`${lowStockItems.length} Items`}
          >
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">All materials above safety stock</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">MATERIAL</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PART</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">STOCK</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">MIN</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.slice(0, 8).map((item, i) => (
                    <tr
                      key={i}
                      onClick={() => navigate(`/rm-master/${item.rm_id}`)}
                      className="hover:bg-[#3498db]/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#2c3e50] max-w-[160px] truncate">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-[#3498db] font-mono">{item.part_no || '—'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{item.currentStock} <span className="text-xs text-slate-400">{item.unit_of_measurement}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">{item.minimum_stock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">LOW</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {lowStockItems.length > 8 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button onClick={() => navigate('/stock-balance')} className="text-xs text-[#3498db] font-semibold flex items-center gap-1 hover:underline">
                  View All <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </PanelCard>

          {/* Out-of-stock table */}
          <PanelCard
            title="Out of Stock"
            badge={`${outOfStock} Items`}
          >
            {outOfStock === 0 ? (
              <div className="p-8 text-center">
                <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No items out of stock</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">MATERIAL</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">STORE</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balances
                    ?.filter(b => (parseFloat(b.current_qty) || 0) === 0)
                    .slice(0, 8)
                    .map((b, i) => (
                      <tr key={i} className="hover:bg-[#3498db]/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-[#2c3e50] truncate max-w-[180px]">
                          {rms?.find(r => r.rm_id === b.rm_id)?.name || b.rm_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[120px]">{b.store_id}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded">OUT</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </PanelCard>
        </div>
      )}

      {/* Quick Actions */}
      <SectionTitle icon={DocumentTextIcon} title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Add Material',    path: '/rm-master/new',      color: 'bg-[#3498db]' },
          { label: 'New Purchase Order', path: '/purchase-orders/new', color: 'bg-[#2c3e50]' },
          { label: 'Record GRN',      path: '/grn/new',            color: 'bg-green-600'   },
          { label: 'Issue Material',  path: '/consumption',        color: 'bg-amber-500'   },
        ].map(a => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className={`${a.color} text-white text-sm font-bold py-3 px-4 rounded shadow-sm hover:opacity-90 transition-opacity cursor-pointer`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
