import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRmList } from '../../api/rm'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import {
  CubeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const COLUMNS = [
  {
    key: 'icon', header: '',
    render: (_, row) => (
      <div className="w-7 h-7 rounded bg-[#3498db]/10 flex items-center justify-center">
        <CubeIcon className="w-3.5 h-3.5 text-[#3498db]" />
      </div>
    )
  },
  { key: 'name', header: 'Material Name', render: v => <span className="font-bold text-[#2c3e50]">{v}</span> },
  { key: 'part_no', header: 'Part No.', render: v => v ? <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded">{v}</span> : <span className="text-slate-300">—</span> },
  { key: 'unit_of_measurement', header: 'UOM', render: v => <span className="font-semibold text-slate-600">{v || '—'}</span> },
  { key: 'minimum_stock', header: 'Min Safety Stock', render: v => v ? <span className="font-mono text-sm font-bold text-slate-600">{v}</span> : <span className="text-slate-300">—</span> },
  { key: 'lead_time_days', header: 'Lead Time', render: v => v ? <span className="text-slate-600">{v} days</span> : <span className="text-slate-300">—</span> },
  {
    key: 'is_active', header: 'Status',
    render: v => (
      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
        {v ? '● Active' : '● Inactive'}
      </span>
    )
  },
]

export default function RmList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { data, isLoading } = useRmList({ is_active: null })

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raw Material Master"
        subtitle="Manage all raw materials, part numbers and safety stock levels"
        breadcrumb={['Masters', 'Raw Materials']}
        actions={[{ label: '+ Add Material', onClick: () => navigate('/rm-master/new'), primary: true }]}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Materials"    value={total}           sub="All registered items"    icon={CubeIcon}           color="blue"  />
        <StatCard title="Active"             value={active}          sub="Currently listed"        icon={CheckCircleIcon}    color="green" />
        <StatCard title="Inactive"           value={inactive}        sub="Deactivated items"       icon={ExclamationTriangleIcon} color="amber" />
        <StatCard title="With Safety Stock"  value={withSafetyStock} sub="Have min-stock set"     icon={ShieldCheckIcon}    color="purple"/>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 transition-all"
              placeholder="Search by name or part no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded overflow-hidden border border-slate-200 bg-white">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 text-xs font-bold capitalize cursor-pointer transition-colors ${
                  statusFilter === f ? 'bg-[#3498db] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          onRowClick={row => navigate(`/rm-master/${row.rm_id}`)}
        />
      </div>
    </div>
  )
}
