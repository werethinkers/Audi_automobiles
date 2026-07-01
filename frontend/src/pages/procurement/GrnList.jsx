import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGrnList, usePoList } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

function GrnStatusBadge({ status }) {
  const map = {
    PENDING_QA: { label: 'Pending QA',  cls: 'bg-amber-50 text-amber-700' },
    COMPLETED:  { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700' },
    REJECTED:   { label: 'Rejected',    cls: 'bg-red-50 text-red-700'     },
  }
  const info = map[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>
}

export default function GrnList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: grns,    isLoading } = useGrnList()
  const { data: pos }                = usePoList()
  const { data: vendors }            = useVendorList()

  const getPoNumber  = id => pos?.find(p => p.po_id === id)?.po_number || '—'
  const getVendor    = id => vendors?.find(v => v.vendor_id === id)?.name || '—'

  const total     = grns?.length || 0
  const pending   = grns?.filter(g => g.grn_status === 'PENDING_QA').length || 0
  const completed = grns?.filter(g => g.grn_status === 'COMPLETED').length || 0
  const rejected  = grns?.filter(g => g.grn_status === 'REJECTED').length || 0

  const filtered = grns?.filter(g => {
    const q = search.toLowerCase()
    return !q ||
      g.grn_number?.toLowerCase().includes(q) ||
      getPoNumber(g.po_id).toLowerCase().includes(q) ||
      getVendor(g.vendor_id).toLowerCase().includes(q)
  })

  const COLUMNS = [
    { key: 'grn_number',     header: 'GRN Number',    render: v => <span className="font-mono font-bold text-blue-600">{v}</span> },
    { key: 'po_id',          header: 'PO Number',     render: v => <span className="font-semibold text-slate-800">{getPoNumber(v)}</span> },
    { key: 'vendor_id',      header: 'Vendor',        render: v => getVendor(v) },
    { key: 'received_date',  header: 'Received Date', hideOnMobile: true, render: v => v ? new Date(v).toLocaleDateString('en-GB') : '—' },
    { key: 'vehicle_number', header: 'Vehicle No.',   hideOnMobile: true, render: v => v || <span className="text-slate-300">—</span> },
    { key: 'grn_status',     header: 'Status',        render: v => <GrnStatusBadge status={v} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Goods Received Notes"
        subtitle="Log and track all incoming material receipts"
        breadcrumb={[{ label: 'Procurement', href: '/dashboard' }, { label: 'GRN Log' }]}
        actions={[{ label: '+ Log GRN', onClick: () => navigate('/grn/new'), primary: true }]}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total GRNs"  value={total}     sub="All receipts"       icon={ClipboardDocumentCheckIcon} color="blue"  />
        <StatCard title="Pending QA"  value={pending}   sub="Awaiting QA check"  icon={ClockIcon}                  color="amber" />
        <StatCard title="Completed"   value={completed} sub="Cleared & stocked"  icon={CheckCircleIcon}            color="green" />
        <StatCard title="Rejected"    value={rejected}  sub="Failed QA"          icon={XCircleIcon}                color="red"   />
      </div>
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              placeholder="Search GRN, PO, vendor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium ml-auto hidden sm:block">
            {filtered?.length ?? 0} result{filtered?.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          onRowClick={row => navigate(`/grn/${row.grn_id}`)}
          onEdit={row => navigate(`/grn/${row.grn_id}`)}
          mobileCard={row => (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-blue-600 font-mono text-[13px]">{row.grn_number}</p>
                <GrnStatusBadge status={row.grn_status} />
              </div>
              <p className="text-xs text-slate-600 font-semibold">{getVendor(row.vendor_id)}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>PO: <b className="text-slate-700">{getPoNumber(row.po_id)}</b></span>
                {row.received_date && <span>{new Date(row.received_date).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
