import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBomList } from '../../api/bom'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import {
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

const COLUMNS = [
  {
    key: 'icon', header: '',
    render: () => (
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
        <DocumentDuplicateIcon className="w-4 h-4 text-indigo-600" />
      </div>
    )
  },
  { key: 'product_name', header: 'Product / Vehicle Model', render: v => <span className="font-semibold text-slate-700">{v || '—'}</span> },
  { key: 'product_code', header: 'Product Code', hideOnMobile: true, render: v => v ? <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v}</span> : <span className="text-slate-300">—</span> },
  {
    key: 'component_count', header: 'Components',
    render: v => (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
        <CogIcon className="w-3 h-3" />
        {v}
      </span>
    )
  },
  { key: 'description', header: 'Description', hideOnMobile: true, render: v => <span className="text-slate-400 text-xs truncate max-w-[180px] block">{v || '—'}</span> },
  {
    key: 'is_active', header: 'Status',
    render: v => (
      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    )
  },
]

export default function BomList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useBomList()

  const filtered = data?.filter(item => {
    const matchSearch = !search ||
      item.bom_number.toLowerCase().includes(search.toLowerCase()) ||
      (item.product_name && item.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (item.product_code && item.product_code.toLowerCase().includes(search.toLowerCase()))
    
    const matchStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? item.is_active : !item.is_active)
      
    return matchSearch && matchStatus
  })

  const total = data?.length || 0
  const active = data?.filter(r => r.is_active).length || 0
  const inactive = total - active
  const totalComponents = data?.reduce((sum, r) => sum + (r.component_count || 0), 0) || 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bill of Materials"
        subtitle="Manage product recipes and material requirements"
        breadcrumb={[{ label: 'Engineering', href: '/dashboard' }, { label: 'Bill of Materials' }]}
        actions={[{ label: '+ Create BOM', onClick: () => navigate('/bom/new'), primary: true }]}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Loaded BOMs" value={total} sub="Total registered" icon={DocumentDuplicateIcon} color="blue" />
        <StatCard title="Active" value={active} sub="Currently active" icon={CheckCircleIcon} color="green" />
        <StatCard title="Inactive" value={inactive} sub="Archived / Inactive" icon={ExclamationTriangleIcon} color="amber" />
        <StatCard title="Components" value={totalComponents} sub="Total components" icon={CogIcon} color="purple" />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              placeholder="Search by BOM No or Product..."
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
                  statusFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
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
          onRowClick={row => navigate(`/bom/${row.bom_id}`)}
          onEdit={row => navigate(`/bom/${row.bom_id}`)}
          mobileCard={row => (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-800 text-[13px] leading-tight truncate">{row.product_name || '—'}</p>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>{row.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <CogIcon className="w-3 h-3" />{row.component_count} parts
                </span>
                {row.product_code && (
                  <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {row.product_code}
                  </span>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
