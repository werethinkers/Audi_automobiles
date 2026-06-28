import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorList, useDeleteVendor } from '../../api/vendor'
import { toast } from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const COLUMNS = [
  { key: 'name',           header: 'Vendor Name',   render: v => <span className="font-bold text-slate-800">{v}</span> },
  { key: 'contact_person', header: 'Contact Person', render: v => v || <span className="text-slate-300">—</span> },
  { key: 'phone',          header: 'Phone',          render: v => v || <span className="text-slate-300">—</span> },
  { key: 'email',          header: 'Email',          render: v => v || <span className="text-slate-300">—</span> },
  { key: 'is_active',      header: 'Status',
    render: v => <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v ? 'Active' : 'Inactive'}</span> },
]

export default function VendorList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { data, isLoading } = useVendorList({ is_active: null })
  const deleteMutation = useDeleteVendor()

  const filtered = data?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.contact_person && v.contact_person.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.vendor_id)
      toast.success(`Vendor "${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete vendor')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Master"
        subtitle="Manage all supplier profiles and contact details"
        breadcrumb={[{ label: 'Masters', href: '/dashboard' }, { label: 'Vendors' }]}
        actions={[{ label: '+ Add Vendor', onClick: () => navigate('/vendors/new'), primary: true }]}
      />

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              placeholder="Search name, contact..."
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
          onRowClick={row => navigate(`/vendors/${row.vendor_id}`)}
          onEdit={row => navigate(`/vendors/${row.vendor_id}`)}
          onDelete={row => setDeleteTarget(row)}
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Vendor"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? They will be marked as inactive but their data will be preserved.`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
