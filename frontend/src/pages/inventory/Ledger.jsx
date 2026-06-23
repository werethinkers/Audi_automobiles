import { useState } from 'react'
import { useLedgerList } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import {
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

function TxIcon({ type }) {
  const t = (type || '').toLowerCase()
  if (t.includes('grn') || t.includes('receipt') || t.includes('transfer_in') || t.includes('adjustment_add'))
    return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded"><ArrowUpCircleIcon className="w-3.5 h-3.5" /> IN</span>
  if (t.includes('consumption') || t.includes('issue') || t.includes('transfer_out') || t.includes('adjustment_deduct') || t.includes('rejection') || t.includes('out'))
    return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded"><ArrowDownCircleIcon className="w-3.5 h-3.5" /> OUT</span>
  return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded"><ArrowsRightLeftIcon className="w-3.5 h-3.5" /> {type || 'Transfer'}</span>
}

const COLUMNS = [
  { key: 'created_at', header: 'Date',
    render: v => v ? (
      <div>
        <div className="text-xs font-bold text-[#2c3e50]">{new Date(v).toLocaleDateString('en-GB')}</div>
        <div className="text-xs text-slate-400">{new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    ) : '—'
  },
  { key: 'rm_name', header: 'Material', render: (v, row) => (
    <div>
      <div className="font-bold text-[#2c3e50] text-sm">{v || row.rm_id}</div>
      {row.rm_part_no && <div className="text-xs text-[#3498db] font-mono">{row.rm_part_no}</div>}
    </div>
  )},
  { key: 'store_name',       header: 'Store',       render: (v, row) => <span className="text-slate-600 text-sm">{v || row.store_id}</span> },
  { key: 'transaction_type', header: 'Type',         render: v => <TxIcon type={v} /> },
  { key: 'qty', header: 'Quantity',
    render: (v, row) => {
      const t = (row.transaction_type || '').toLowerCase()
      const isIn = t.includes('grn') || t.includes('receipt') || t.includes('transfer_in') || t.includes('adjustment_add')
      return (
        <span className={`font-black text-base ${isIn ? 'text-green-600' : 'text-red-600'}`}>
          {isIn ? '+' : '-'}{Math.abs(parseFloat(v) || 0).toLocaleString()}
          <span className="text-xs font-medium text-slate-400 ml-1">{row.uom}</span>
        </span>
      )
    }
  },
  { key: 'description', header: 'Description', render: v => <span className="text-slate-500 text-sm">{v || '—'}</span> },
  { key: 'remarks',     header: 'Remarks',     render: v => <span className="text-slate-400 text-xs italic">{v || '—'}</span> },
]

export default function Ledger() {
  const [search, setSearch]     = useState('')
  const [storeId, setStoreId]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const { data, isLoading }     = useLedgerList({ store_id: storeId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined })
  const { data: stores }        = useStoreList()

  const filtered = data?.filter(row => {
    if (!search) return true
    const q = search.toLowerCase()
    return (row.rm_name || '').toLowerCase().includes(q) ||
           (row.rm_part_no || '').toLowerCase().includes(q) ||
           (row.remarks || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Ledger"
        subtitle="Full audit trail of all inventory movements"
        breadcrumb={[{ label: 'Inventory', href: '/dashboard' }, { label: 'Stock Ledger' }]}
        actions={[{ label: '↓ Export', onClick: () => {}, icon: ArrowDownTrayIcon }]}
      />

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 transition-all"
              placeholder="Search material, remarks..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={storeId} onChange={e => setStoreId(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] cursor-pointer text-slate-700"
            >
              <option value="">All Stores</option>
              {stores?.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
            </select>
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] text-slate-700"
            />
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] text-slate-700"
            />
          </div>
        </div>
        <DataTable columns={COLUMNS} data={filtered} loading={isLoading} />
      </div>
    </div>
  )
}
