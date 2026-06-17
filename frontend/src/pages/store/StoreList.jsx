import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStoreList } from '../../api/store'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
 
const COLUMNS = [
  { key: 'store_name', header: 'Store Name', render: v => <span className="font-semibold text-slate-800">{v}</span> },
  { key: 'location',   header: 'Location',   render: v => v || '-' },
  { key: 'is_active',  header: 'Status',
    render: v => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
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
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Store Master"
        breadcrumb={['Masters', 'Stores']}
        actions={[{ label: '+ Add Store', onClick: () => navigate('/stores/new'), primary: true }]}
      />
      
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 items-center bg-slate-50/20">
          <input
            className="flex-1 max-w-md border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            placeholder="Search name, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          onRowClick={row => navigate(`/stores/${row.store_id}`)}
        />
      </div>
    </div>
  )
}
