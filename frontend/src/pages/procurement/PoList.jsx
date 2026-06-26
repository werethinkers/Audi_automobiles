import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePoList, useUpdatePoStatus } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import api from '../../api/client'
import { useQuery } from '@tanstack/react-query'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { toast } from 'react-hot-toast'
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

function StatusBadge({ statusCode }) {
  const map = {
    DRAFT:              { label: 'Draft',             cls: 'bg-slate-100 text-slate-600' },
    PENDING_APPROVAL:   { label: 'Pending Approval',  cls: 'bg-amber-50 text-amber-700' },
    BLOCKED:            { label: 'Blocked',           cls: 'bg-red-50 text-red-700'     },
    RELEASED:           { label: 'Released',          cls: 'bg-blue-50 text-blue-700' },
    ACKNOWLEDGED:       { label: 'Acknowledged',      cls: 'bg-indigo-50 text-indigo-700' },
    IN_TRANSIT:         { label: 'In Transit',        cls: 'bg-cyan-50 text-cyan-700' },
    PARTIALLY_RECEIVED: { label: 'Partial GRN',       cls: 'bg-purple-50 text-purple-700' },
    COMPLETED:          { label: 'Completed',         cls: 'bg-emerald-50 text-emerald-700' },
  }
  const info = map[statusCode] || { label: statusCode || '—', cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>
}

export default function PoList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: pos,     isLoading: poLoading } = usePoList()
  const { data: vendors }  = useVendorList()
  const { data: statuses } = useQuery({ queryKey: ['po_statuses'], queryFn: () => api.get('/procurement/po-statuses').then(r => r.data) })
  const statusMutation = useUpdatePoStatus()

  const getVendor  = id => vendors?.find(v => v.vendor_id === id)?.name || '—'
  const getStatus  = id => statuses?.find(s => s.id === id)
  const handleStatusChange = async (e, poId) => {
    e.stopPropagation()
    try { await statusMutation.mutateAsync({ id: poId, status_id: e.target.value }); toast.success('PO status updated!') }
    catch { toast.error('Failed to update status') }
  }

  const filtered = pos?.filter(p => {
    const q = search.toLowerCase()
    return !q || (p.po_number || '').toLowerCase().includes(q) || getVendor(p.vendor_id).toLowerCase().includes(q)
  })

  const total    = pos?.length || 0
  const pending  = pos?.filter(p => { const s = getStatus(p.status_id); return s?.code === 'PENDING_APPROVAL' }).length || 0
  const released = pos?.filter(p => { 
    const s = getStatus(p.status_id); 
    return s?.code === 'RELEASED' || s?.code === 'ACKNOWLEDGED' || s?.code === 'IN_TRANSIT' || s?.code === 'PARTIALLY_RECEIVED' 
  }).length || 0
  const done     = pos?.filter(p => { const s = getStatus(p.status_id); return s?.code === 'COMPLETED' }).length || 0

  const COLUMNS = [
    { key: 'po_number',    header: 'PO Number',
      render: v => <span className="font-mono font-bold text-blue-600">{v}</span>
    },
    { key: 'vendor_id',    header: 'Vendor',
      render: v => <span className="font-semibold text-slate-800">{getVendor(v)}</span>
    },
    { key: 'order_date',   header: 'Order Date',
      render: v => v ? <span className="text-slate-600">{new Date(v).toLocaleDateString('en-GB')}</span> : '—'
    },
    { key: 'total_amount', header: 'Total Amount',
      render: v => <span className="font-bold text-slate-800">₹{parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { key: 'status_id', header: 'Status',
      render: v => { const s = getStatus(v); return <StatusBadge statusCode={s?.code} /> }
    },
    { key: 'actions_status', header: 'Change Status',
      render: (_, row) => (
        <select
          onClick={e => e.stopPropagation()}
          onChange={e => handleStatusChange(e, row.po_id)}
          value={row.status_id || ''}
          className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 bg-white cursor-pointer hover:border-blue-300 transition-colors"
        >
          <option value="">Update...</option>
          {statuses?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage and track all purchase orders"
        breadcrumb={[{ label: 'Procurement', href: '/dashboard' }, { label: 'Purchase Orders' }]}
        actions={[{ label: '+ Create PO', onClick: () => navigate('/purchase-orders/new'), primary: true }]}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total POs"   value={total}    sub="All orders"          icon={DocumentTextIcon}        color="blue"   />
        <StatCard title="Pending"     value={pending}  sub="Awaiting approval"   icon={ClockIcon}               color="amber"  />
        <StatCard title="Active"      value={released} sub="Released / Partial"  icon={ExclamationTriangleIcon} color="purple" />
        <StatCard title="Completed"   value={done}     sub="Fully received"      icon={CheckCircleIcon}         color="green"  />
      </div>
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white"
              placeholder="Search PO number or vendor..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium ml-auto hidden sm:block">
            {filtered?.length ?? 0} result{filtered?.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={poLoading}
          onRowClick={row => navigate(`/purchase-orders/${row.po_id}`)}
          onEdit={row => navigate(`/purchase-orders/${row.po_id}`)}
        />
      </div>
    </div>
  )
}
