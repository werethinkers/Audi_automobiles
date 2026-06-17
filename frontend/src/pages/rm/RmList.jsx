import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRmList } from '../../api/rm'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
 
const COLUMNS = [
  { key: 'name',                header: 'Name',      render: v => <span className="font-semibold text-slate-800">{v}</span> },
  { key: 'part_no',             header: 'Part No.',  render: v => v || '-' },
  { key: 'unit_of_measurement', header: 'UOM' },
  { key: 'minimum_stock',       header: 'Min Stock', render: v => v ? parseFloat(v).toLocaleString() : '-' },
  { key: 'is_active',           header: 'Status',
    render: v => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
]
 
export default function RmList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useRmList({ is_active: null }) // Load both active/inactive
 
  const filtered = data?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.part_no?.toLowerCase().includes(search.toLowerCase())
  )
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Raw Material Master"
        breadcrumb={['Masters', 'Raw Materials']}
        actions={[{ label: '+ Add Material', onClick: () => navigate('/rm-master/new'), primary: true }]}
      />
      
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 items-center bg-slate-50/20">
          <input
            className="flex-1 max-w-md border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            placeholder="Search name, part no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
