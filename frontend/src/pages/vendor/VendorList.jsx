import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorList } from '../../api/vendor'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
 
const COLUMNS = [
  { key: 'name',           header: 'Vendor Name',   render: v => <span className="font-semibold text-slate-800">{v}</span> },
  { key: 'contact_person', header: 'Contact Person', render: v => v || '-' },
  { key: 'phone',          header: 'Phone',          render: v => v || '-' },
  { key: 'email',          header: 'Email',          render: v => v || '-' },
  { key: 'gst_number',     header: 'GST Number',     render: v => v || '-' },
  { key: 'is_active',      header: 'Status',
    render: v => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
]
 
export default function VendorList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useVendorList({ is_active: null })
 
  const filtered = data?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    v.gst_number?.toLowerCase().includes(search.toLowerCase())
  )
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Vendor Master"
        breadcrumb={['Masters', 'Vendors']}
        actions={[{ label: '+ Add Vendor', onClick: () => navigate('/vendors/new'), primary: true }]}
      />
      
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-2 items-center bg-slate-50/20">
          <input
            className="flex-1 max-w-md border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            placeholder="Search name, contact, GST..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={isLoading}
          onRowClick={row => navigate(`/vendors/${row.vendor_id}`)}
        />
      </div>
    </div>
  )
}
