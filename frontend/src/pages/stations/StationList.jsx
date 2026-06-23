import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStationList, useDeleteStation } from '../../api/station'
import { toast } from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { MagnifyingGlassIcon, SignalIcon } from '@heroicons/react/24/outline'

const COLUMNS = [
  {
    key: 'station_name',
    header: 'Station Name',
    render: v => <span className="font-bold text-[#2c3e50]">{v}</span>,
  },
  {
    key: 'station_code',
    header: 'Station Code',
    render: v => (
      v ? (
        <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded">
          {v}
        </span>
      ) : <span className="text-slate-300">—</span>
    ),
  },
  {
    key: 'station_description',
    header: 'Description',
    render: v => v ? <span className="text-slate-600 max-w-xs truncate block">{v}</span> : <span className="text-slate-300">—</span>,
  },
  {
    key: 'is_active',
    header: 'Status',
    render: v => (
      <span
        className={`text-xs font-bold px-2.5 py-0.5 rounded ${
          v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {v ? '● Active' : '● Inactive'}
      </span>
    ),
  },
]

export default function StationList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useStationList({ is_active: null })
  const deleteMutation = useDeleteStation()

  const filtered = data?.filter(
    s =>
      s.station_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.station_code?.toLowerCase().includes(search.toLowerCase()) ||
      s.station_description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.station_id)
      toast.success(`Station "${deleteTarget.station_name}" deactivated`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to deactivate station')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production Stations"
        subtitle="Manage production stations and their codes"
        breadcrumb={[{ label: 'Masters', href: '/dashboard' }, { label: 'Stations' }]}
        actions={[
          {
            label: '+ Add Station',
            onClick: () => navigate('/stations/new'),
            primary: true,
          },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-lg text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 transition-all"
              placeholder="Search station name, code..."
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
          data={filtered || []}
          loading={isLoading}
          onRowClick={row => navigate(`/stations/${row.station_id}`)}
          onEdit={row => navigate(`/stations/${row.station_id}`)}
          onDelete={row => setDeleteTarget(row)}
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Station"
        message={`Are you sure you want to deactivate "${deleteTarget?.station_name}"? It will be marked as inactive.`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}