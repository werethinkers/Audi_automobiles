import { useState } from 'react'
import { useInventoryBalances } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import DataTable from '../../components/ui/DataTable'
import {
  CircleStackIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'

const COLUMNS = [
  { key: 'rm_name',     header: 'Material Name', render: v => <span className="font-bold text-[#2c3e50]">{v}</span> },
  { key: 'rm_part_no',  header: 'Part No.',       render: v => v ? <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded">{v}</span> : <span className="text-slate-300">—</span> },
  { key: 'store_name',  header: 'Store',           render: v => <span className="text-slate-600 flex items-center gap-1.5"><BuildingStorefrontIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>{v}</span> },
  { key: 'uom',         header: 'UOM',             render: v => v || '—' },
  {
    key: 'current_qty', header: 'Qty',
    render: (v, row) => {
      const qty = parseFloat(v) || 0
      const min = parseFloat(row.min_stock) || 0
      const isOut = qty === 0
      const isLow = !isOut && min > 0 && qty < min
      return (
        <span className={`font-black text-base ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#2c3e50]'}`}>
          {qty.toLocaleString()} <span className="text-xs font-medium text-slate-400">{row.uom}</span>
        </span>
      )
    }
  },
  {
    key: 'status', header: 'Status',
    render: (_, row) => {
      const qty = parseFloat(row.current_qty) || 0
      const min = parseFloat(row.min_stock) || 0
      if (qty === 0)            return <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded">OUT</span>
      if (min > 0 && qty < min) return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded">LOW</span>
      return <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded">OK</span>
    }
  },
  {
    key: 'health', header: 'Health',
    render: (_, row) => {
      const qty = parseFloat(row.current_qty) || 0
      const min = parseFloat(row.min_stock) || 0
      if (!min) return <span className="text-slate-300 text-xs">—</span>
      const pct = Math.min(100, (qty / min) * 100)
      return (
        <div className="w-24">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 0 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : pct < 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )
    }
  },
]

export default function StockBalance() {
  const [search, setSearch]     = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const { data, isLoading }     = useInventoryBalances()
  const { data: stores }        = useStoreList()

  const enriched = data?.map(b => ({
    ...b,
    rm_name:   b.rm_name || b.rm_id,
    rm_part_no: b.rm_part_no || '',
    store_name: b.store_name || b.store_id,
    uom: b.uom || b.unit_of_measurement || '',
  }))

  const filtered = enriched?.filter(b => {
    const matchSearch = !search ||
      (b.rm_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.rm_part_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.store_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStore = !storeFilter || b.store_id === storeFilter
    return matchSearch && matchStore
  })

  const total   = enriched?.length || 0
  const healthy = enriched?.filter(b => {
    const qty = parseFloat(b.current_qty) || 0
    const min = parseFloat(b.min_stock) || 0
    return qty > 0 && (min === 0 || qty >= min)
  }).length || 0
  const lowStock = enriched?.filter(b => {
    const qty = parseFloat(b.current_qty) || 0
    const min = parseFloat(b.min_stock) || 0
    return min > 0 && qty < min && qty > 0
  }).length || 0
  const outOfStock = enriched?.filter(b => (parseFloat(b.current_qty) || 0) === 0).length || 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Balance"
        subtitle="Real-time inventory levels across all stores"
        breadcrumb={['Inventory', 'Stock Balance']}
        actions={[{ label: '↓ Export', onClick: () => {}, icon: ArrowDownTrayIcon }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items"   value={total}     sub="Tracked across stores"   icon={CircleStackIcon}       color="blue"  />
        <StatCard title="Healthy"       value={healthy}   sub="At or above minimum"     icon={CheckCircleIcon}       color="green" />
        <StatCard title="Low Stock"     value={lowStock}  sub="Below minimum level"     icon={ExclamationTriangleIcon} color="amber" />
        <StatCard title="Out of Stock"  value={outOfStock} sub="Needs urgent restock"   icon={XCircleIcon}           color="red"   />
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 transition-all"
              placeholder="Search material or store..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] cursor-pointer text-slate-700"
            >
              <option value="">All Stores</option>
              {stores?.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
            </select>
          </div>
        </div>
        <DataTable columns={COLUMNS} data={filtered} loading={isLoading} />
      </div>
    </div>
  )
}
