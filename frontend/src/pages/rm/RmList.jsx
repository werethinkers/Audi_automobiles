import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRmList, useDeleteRm } from '../../api/rm'
import { toast } from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import ConfirmModal from '../../components/ui/ConfirmModal'
import {
  CubeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

import BulkUploadModal from '../../components/ui/BulkUploadModal'

const COLUMNS = [
  {
    key: 'icon', header: '',
    render: (_, row) => (
      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
        <CubeIcon className="w-4 h-4 text-green-600" />
      </div>
    )
  },
  { key: 'part_no', header: 'Part No.', render: v => v ? <span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{v}</span> : <span className="text-slate-300">—</span> },
  { key: 'name', header: 'Material Name', render: v => <span className="font-bold text-slate-800">{v}</span> },
  { key: 'unit_of_measurement', header: 'UOM', render: v => <span className="font-semibold text-slate-600">{v || '—'}</span> },
  { key: 'minimum_stock', header: 'Min Safety Stock', hideOnMobile: true, render: v => v ? <span className="font-mono text-sm font-bold text-slate-600">{v}</span> : <span className="text-slate-300">—</span> },
  {
    key: 'is_active', header: 'Status',
    render: v => (
      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    )
  },
]

export default function RmList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const { data, isLoading } = useRmList({ is_active: null })
  const deleteMutation = useDeleteRm()

  const filtered = data?.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.part_no?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active)
    return matchSearch && matchStatus
  })

  const total    = data?.length || 0
  const active   = data?.filter(r => r.is_active).length || 0
  const inactive = total - active
  const withSafetyStock = data?.filter(r => r.minimum_stock > 0).length || 0

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.rm_id)
      toast.success(`"${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete material')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raw Material Master"
        subtitle="Manage all raw materials, part numbers and safety stock levels"
        breadcrumb={[{ label: 'Masters', href: '/dashboard' }, { label: 'Raw Materials' }]}
        actions={[
          { label: '+ Add Material', onClick: () => navigate('/rm-master/new'), primary: true },
          { label: 'Bulk Upload', onClick: () => setShowUploadModal(true) }
        ]}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Materials"    value={total}           sub="All registered items"    icon={CubeIcon}           color="blue"  />
        <StatCard title="Active"             value={active}          sub="Currently listed"        icon={CheckCircleIcon}    color="green" />
        <StatCard title="Inactive"           value={inactive}        sub="Deactivated items"       icon={ExclamationTriangleIcon} color="amber" />
        <StatCard title="With Safety Stock"  value={withSafetyStock} sub="Have min-stock set"     icon={ShieldCheckIcon}    color="purple"/>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all"
              placeholder="Search by name or part no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 text-xs font-bold capitalize cursor-pointer transition-colors ${
                  statusFilter === f ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium ml-auto hidden sm:block">
            {filtered?.length ?? 0} result{filtered?.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          onRowClick={row => navigate(`/rm-master/${row.rm_id}`)}
          onEdit={row => navigate(`/rm-master/${row.rm_id}`)}
          onDelete={row => setDeleteTarget(row)}
          mobileCard={row => (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[13px] truncate">{row.name}</p>
                  {row.part_no && (
                    <span className="text-[10px] font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{row.part_no}</span>
                  )}
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>{row.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>UOM: <b className="text-slate-700">{row.unit_of_measurement || '—'}</b></span>
                {row.minimum_stock > 0 && <span>Min Stock: <b className="text-slate-700">{row.minimum_stock}</b></span>}
              </div>
            </div>
          )}
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Raw Material"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? It will be marked as inactive but all inventory data will be preserved.`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <BulkUploadModal
      open={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      />
      
    </div>
  )
}
