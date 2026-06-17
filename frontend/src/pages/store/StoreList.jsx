import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStoreList } from '../../api/store'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'
import { HomeModernIcon } from '@heroicons/react/24/outline'

const COLUMNS = [
  { key: 'store_name', header: 'Store Name',
    render: (v, row) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-[#3498db]/10 flex items-center justify-center flex-shrink-0">
          <HomeModernIcon className="w-3.5 h-3.5 text-[#3498db]" />
        </div>
        <span className="font-bold text-[#2c3e50]">{v}</span>
      </div>
    )
  },
  { key: 'location', header: 'Location', render: v => v || <span className="text-slate-300">—</span> },
  { key: 'is_active', header: 'Status',
    render: v => <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v ? '● Active' : '● Inactive'}</span>
  },
]

export default function StoreList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useStoreList({ is_active: null })

  const filtered = data?.filter(s =>
    s.store_name.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Store Master"
        subtitle="Manage all warehouse locations and store definitions"
        breadcrumb={['Masters', 'Stores']}
        actions={[{ label: '+ Add Store', onClick: () => navigate('/stores/new'), primary: true }]}
      />
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex gap-3">
          <input
            className="flex-1 max-w-sm border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 bg-white"
            placeholder="Search name, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DataTable columns={COLUMNS} data={filtered} loading={isLoading} onRowClick={row => navigate(`/stores/${row.store_id}`)} />
      </div>
    </div>
  )
}
