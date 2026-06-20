import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStationList } from '../../api/station'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/ui/PageHeader'

const COLUMNS = [
  {
    key: 'station_name',
    header: 'Station Name',
    render: v => (
      <span className="font-bold text-[#2c3e50]">{v}</span>
    ),
  },
  {
    key: 'station_code',
    header: 'Station Code',
    render: v => (
      v ? (
        <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded">
          {v}
        </span>
      ) : '—'
    ),
  },
  {
    key: 'description',
    header: 'Description',
    render: v => v || '—',
  },
  {
    key: 'is_active',
    header: 'Status',
    render: v => (
      <span
        className={`text-xs font-bold px-2.5 py-0.5 rounded ${
          v
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-500'
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

  const { data, isLoading } = useStationList({ is_active: null })

  const filtered = data?.filter(
    s =>
      s.station_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.station_code?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stations"
        subtitle="Manage production stations"
        breadcrumb={['Stations']}
        actions={[
          {
            label: '+ Add Station',
            onClick: () => navigate('/stations/new'),
            primary: true,
          },
        ]}
      />

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <input
            className="flex-1 max-w-sm border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-[#3498db]"
            placeholder="Search station..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={COLUMNS}
          data={filtered || []}
          loading={isLoading}
          onRowClick={row => navigate(`/stations/${row.station_id}`)}
        />
      </div>
    </div>
  )
}