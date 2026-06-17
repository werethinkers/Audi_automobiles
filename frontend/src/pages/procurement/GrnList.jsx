import { useNavigate } from 'react-router-dom'
import { useGrnList, usePoList } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

function GrnStatusBadge({ status }) {
  const map = {
    PENDING_QA: { label: 'Pending QA',  cls: 'bg-amber-100 text-amber-700' },
    COMPLETED:  { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
    REJECTED:   { label: 'Rejected',    cls: 'bg-red-100 text-red-700'     },
  }
  const info = map[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${info.cls}`}>{info.label}</span>
}

export default function GrnList() {
  const navigate = useNavigate()
  const { data: grns,    isLoading } = useGrnList()
  const { data: pos }                = usePoList()
  const { data: vendors }            = useVendorList()

  const getPoNumber  = id => pos?.find(p => p.po_id === id)?.po_number || '—'
  const getVendor    = id => vendors?.find(v => v.vendor_id === id)?.name || '—'

  const total     = grns?.length || 0
  const pending   = grns?.filter(g => g.grn_status === 'PENDING_QA').length || 0
  const completed = grns?.filter(g => g.grn_status === 'COMPLETED').length || 0
  const rejected  = grns?.filter(g => g.grn_status === 'REJECTED').length || 0

  const COLUMNS = [
    { key: 'grn_number',     header: 'GRN Number',    render: v => <span className="font-mono font-bold text-[#3498db]">{v}</span> },
    { key: 'po_id',          header: 'PO Number',     render: v => <span className="font-semibold text-[#2c3e50]">{getPoNumber(v)}</span> },
    { key: 'vendor_id',      header: 'Vendor',        render: v => getVendor(v) },
    { key: 'received_date',  header: 'Received Date', render: v => v ? new Date(v).toLocaleDateString('en-GB') : '—' },
    { key: 'vehicle_number', header: 'Vehicle No.',   render: v => v || <span className="text-slate-300">—</span> },
    { key: 'grn_status',     header: 'Status',        render: v => <GrnStatusBadge status={v} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Goods Received Notes"
        subtitle="Log and track all incoming material receipts"
        breadcrumb={['Procurement', 'GRN Log']}
        actions={[{ label: '+ Log GRN', onClick: () => navigate('/grn/new'), primary: true }]}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total GRNs"  value={total}     sub="All receipts"       icon={ClipboardDocumentCheckIcon} color="blue"  />
        <StatCard title="Pending QA"  value={pending}   sub="Awaiting QA check"  icon={ClockIcon}                  color="amber" />
        <StatCard title="Completed"   value={completed} sub="Cleared & stocked"  icon={CheckCircleIcon}            color="green" />
        <StatCard title="Rejected"    value={rejected}  sub="Failed QA"          icon={XCircleIcon}                color="red"   />
      </div>
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <DataTable columns={COLUMNS} data={grns} loading={isLoading} onRowClick={row => navigate(`/grn/${row.grn_id}`)} />
      </div>
    </div>
  )
}
