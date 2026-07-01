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
    return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full"><ArrowUpCircleIcon className="w-3.5 h-3.5" /> IN</span>
  if (t.includes('consumption') || t.includes('issue') || t.includes('transfer_out') || t.includes('adjustment_deduct') || t.includes('rejection') || t.includes('out'))
    return <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full"><ArrowDownCircleIcon className="w-3.5 h-3.5" /> OUT</span>
  return <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full"><ArrowsRightLeftIcon className="w-3.5 h-3.5" /> {type || 'Transfer'}</span>
}

const COLUMNS = [
  { key: 'created_at', header: 'Date',
    render: v => v ? (
      <div>
        <div className="text-xs font-bold text-slate-800">{new Date(v).toLocaleDateString('en-GB')}</div>
        <div className="text-xs text-slate-400">{new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    ) : '—'
  },
  { key: 'rm_name', header: 'Material', render: (v, row) => (
    <div>
      <div className="font-bold text-slate-800 text-sm">{v || row.rm_id}</div>
      {row.rm_part_no && <div className="text-xs text-green-600 font-mono mt-0.5">{row.rm_part_no}</div>}
    </div>
  )},
  { key: 'store_name',       header: 'Store',       render: (v, row) => <span className="text-slate-600 text-sm">{v || row.store_id}</span> },
  { key: 'transaction_type', header: 'Type',         render: v => <TxIcon type={v} /> },
  { key: 'qty', header: 'Quantity',
    render: (v, row) => {
      const t = (row.transaction_type || '').toLowerCase()
      const isIn = t.includes('grn') || t.includes('receipt') || t.includes('transfer_in') || t.includes('adjustment_add')
      return (
        <span className={`font-black text-base ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
          {isIn ? '+' : '-'}{Math.abs(parseFloat(v) || 0).toLocaleString()}
          <span className="text-xs font-medium text-slate-400 ml-1">{row.uom}</span>
        </span>
      )
    }
  },
  { key: 'description', header: 'Description', hideOnMobile: true, render: v => <span className="text-slate-500 text-sm">{v || '—'}</span> },
  { key: 'remarks',     header: 'Remarks',     hideOnMobile: true, render: v => <span className="text-slate-400 text-xs italic">{v || '—'}</span> },
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
        title="Consumption Report"
        subtitle="Full audit trail of all inventory movements"
        breadcrumb={[{ label: 'Inventory', href: '/dashboard' }, { label: 'Consumption Report' }]}
        actions={[{ label: '↓ Export', onClick: () => {}, icon: ArrowDownTrayIcon }]}
      />

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
              placeholder="Search material, remarks..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={storeId} onChange={e => setStoreId(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-green-500 cursor-pointer text-slate-700"
            >
              <option value="">All Stores</option>
              {stores?.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
            </select>
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-green-500 text-slate-700 cursor-pointer"
            />
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-green-500 text-slate-700 cursor-pointer"
            />
          </div>
        </div>
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          mobileCard={row => {
            const t = (row.transaction_type || '').toLowerCase()
            const isIn = t.includes('grn') || t.includes('receipt') || t.includes('transfer_in') || t.includes('adjustment_add')
            const qty = Math.abs(parseFloat(row.qty) || 0)
            return (
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[13px] truncate">{row.rm_name || row.rm_id}</p>
                    {row.rm_part_no && <span className="font-mono text-[10px] text-green-600">{row.rm_part_no}</span>}
                  </div>
                  <TxIcon type={row.transaction_type} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className={`font-black text-sm ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isIn ? '+' : '-'}{qty.toLocaleString()} <span className="text-xs font-medium text-slate-400">{row.uom}</span>
                  </span>
                  <span className="text-slate-400">{row.store_name || row.store_id}</span>
                </div>
                {row.created_at && <p className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString('en-GB')} {new Date(row.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
