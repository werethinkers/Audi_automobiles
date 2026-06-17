import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorList } from '../../api/vendor'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'

const COLUMNS = [
  { key: 'name',           header: 'Vendor Name',   render: v => <span className="font-bold text-[#2c3e50]">{v}</span> },
  { key: 'contact_person', header: 'Contact Person', render: v => v || '-' },
  { key: 'phone',          header: 'Phone',          render: v => v || '-' },
  { key: 'email',          header: 'Email',          render: v => v || '-' },
  { key: 'gst_number',     header: 'GST Number',     render: v => v ? <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded">{v}</span> : '—' },
  { key: 'is_active',      header: 'Status',
    render: v => <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v ? '● Active' : '● Inactive'}</span> },
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
    <div className="space-y-5">
      <PageHeader
        title="Vendor Master"
        subtitle="Manage all supplier profiles and contact details"
        breadcrumb={['Masters', 'Vendors']}
        actions={[{ label: '+ Add Vendor', onClick: () => navigate('/vendors/new'), primary: true }]}
      />
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex gap-3">
          <input
            className="flex-1 max-w-sm border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 bg-white"
            placeholder="Search name, contact, GST..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DataTable columns={COLUMNS} data={filtered} loading={isLoading} onRowClick={row => navigate(`/vendors/${row.vendor_id}`)} />
      </div>
    </div>
  )
}
