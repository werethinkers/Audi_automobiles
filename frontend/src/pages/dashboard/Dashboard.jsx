import { useRmList } from '../../api/rm'
import { usePoList } from '../../api/procurement'
import { useInventoryBalances } from '../../api/inventory'
import Badge from '../../components/ui/Badge'
import { CubeIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
 
export default function Dashboard() {
  const { data: rms, isLoading: rmLoading } = useRmList({ is_active: true })
  const { data: pos, isLoading: poLoading } = usePoList()
  const { data: balances, isLoading: balLoading } = useInventoryBalances()
 
  if (rmLoading || poLoading || balLoading) {
    return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>
  }
 
  // Calculate stats
  const totalRms = rms?.length || 0
  const pendingPos = pos?.filter(po => po.line_status !== 'COMPLETED' && po.line_status !== 'CANCELLED')?.length || 0
  
  // Find low stock items
  const lowStockItems = []
  if (rms && balances) {
    rms.forEach(rm => {
      // Get sum of current_qty across all stores for this RM
      const rmBalances = balances.filter(b => b.rm_id === rm.rm_id)
      const totalQty = rmBalances.reduce((sum, b) => sum + (b.current_qty || 0), 0)
      const minStock = rm.minimum_stock || 0
      
      if (minStock > 0 && totalQty < minStock) {
        lowStockItems.push({
          rm_id: rm.rm_id,
          name: rm.name,
          part_no: rm.part_no,
          minStock,
          currentStock: totalQty,
          unit: rm.unit_of_measurement
        })
      }
    })
  }
 
  const stats = [
    { label: 'Total Raw Materials', value: totalRms, icon: CubeIcon, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Pending Purchase Orders', value: pendingPos, icon: DocumentTextIcon, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Low Stock Alerts', value: lowStockItems.length, icon: ExclamationTriangleIcon, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-5">
              <div className={`p-4 rounded-lg border ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-bold font-display text-slate-800 mt-1">{stat.value}</h3>
              </div>
            </div>
          )
        })}
      </div>
 
      {/* Low Stock Alerts */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            Low Stock Alerts
          </h2>
          <Badge variant={lowStockItems.length > 0 ? 'red' : 'green'}>
            {lowStockItems.length} Items Below Minimum
          </Badge>
        </div>
 
        {lowStockItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400">All materials are currently above safety stock thresholds.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/80">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Part No.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {lowStockItems.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.part_no || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.minStock} {item.unit}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.currentStock} {item.unit}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant="red">Reorder Required</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
